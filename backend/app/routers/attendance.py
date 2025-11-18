import os
import uuid
import json
import math
from typing import Any, Dict, List
from datetime import datetime, timedelta
from collections import defaultdict

from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydantic import BaseModel
from PIL import Image
import io

from app.utils.storage import load_list, save_list

router = APIRouter()

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".."))
STORE = os.path.join(ROOT, "uploads", "attendance.json")
PHOTOS = os.path.join(ROOT, "uploads")
os.makedirs(PHOTOS, exist_ok=True)
FACE_DB = os.path.join(ROOT, "uploads", "faces_db.json")
FACE_DIR = os.path.join(ROOT, "uploads", "faces")
os.makedirs(FACE_DIR, exist_ok=True)


class AutoCheckRequest(BaseModel):
    session_id: str = "default"


def _load_faces() -> list[dict]:
    try:
        if os.path.exists(FACE_DB):
            with open(FACE_DB, 'r', encoding='utf-8') as f:
                return json.load(f) or []
    except Exception:
        pass
    return []


def _save_faces(items: list[dict]):
    try:
        with open(FACE_DB, 'w', encoding='utf-8') as f:
            json.dump(items, f)
    except Exception:
        pass


def _embed_image(img: Image.Image) -> list[float]:
    # Simple 16x16 grayscale vector as embedding
    g = img.convert('L').resize((16, 16))
    vec = [p / 255.0 for p in list(g.getdata())]
    return vec


def _cosine(a: list[float], b: list[float]) -> float:
    s = sum(x*y for x, y in zip(a, b))
    na = math.sqrt(sum(x*x for x in a))
    nb = math.sqrt(sum(y*y for y in b))
    return s / (na*nb + 1e-8)


@router.post("/enroll")
async def enroll(name: str = Form(...), photo: UploadFile = File(...)) -> Dict[str, Any]:
    data = await photo.read()
    try:
        img = Image.open(io.BytesIO(data)).convert('RGB')
    except Exception:
        return {"error": "Invalid image"}
    uid = str(uuid.uuid4())
    out = os.path.join(FACE_DIR, f"{uid}.jpg")
    img.save(out, format='JPEG')
    emb = _embed_image(img)
    faces = _load_faces()
    entry = {"id": uid, "name": name, "photo": f"/files/faces/{uid}.jpg", "embedding": emb}
    faces.append(entry)
    _save_faces(faces)
    return {"ok": True, "enrolled": {"id": uid, "name": name, "photo": entry["photo"]}}


@router.post("/recognize")
async def recognize(photo: UploadFile = File(...)) -> Dict[str, Any]:
    """Recognize face and automatically mark attendance"""
    data = await image.read()
    try:
        img = Image.open(io.BytesIO(data)).convert('RGB')
    except Exception:
        return {"error": "Invalid image"}
    
    probe = _embed_image(img)
    faces = _load_faces()
    
    if not faces:
        return {"error": "No enrolled faces. Please enroll first!"}
    
    # Find best match
    best = None
    best_sim = -1.0
    for f in faces:
        sim = _cosine(probe, f.get("embedding", []))
        if sim > best_sim:
            best_sim = sim
            best = f
    
    # Auto-mark attendance if match found
    if best and best_sim > 0.85:
        # Create attendance record
        recs = load_list(STORE)
        record = {
            "id": str(uuid.uuid4()),
            "user_id": best.get("id"),
            "user_name": best.get("name"),
            "type": "auto_checkin",
            "time": datetime.utcnow().isoformat() + "Z",
            "similarity": round(best_sim, 3),
            "method": "automatic_facial_recognition"
        }
        recs.append(record)
        save_list(STORE, recs)
        
        return {
            "ok": True,
            "recognized": True,
            "match": {
                "id": best.get("id"),
                "name": best.get("name"),
                "photo": best.get("photo"),
                "similarity": round(best_sim, 3)
            },
            "attendance_marked": True,
            "record_id": record["id"],
            "message": f"Welcome {best.get('name')}! Attendance marked automatically."
        }
    
    return {
        "ok": True,
        "recognized": False,
        "message": "Face not recognized. Please enroll first!",
        "best_similarity": round(best_sim, 3) if best else 0
    }


@router.post("/auto-detect")
async def auto_detect(photo: UploadFile = File(...)) -> Dict[str, Any]:
    """Automatically detect and mark attendance when someone appears"""
    return await recognize(photo)


@router.get("/monthly-stats")
async def monthly_stats(month: int = None, year: int = None) -> Dict[str, Any]:
    """Get monthly attendance statistics with graphs data"""
    now = datetime.utcnow()
    target_month = month or now.month
    target_year = year or now.year
    
    recs = load_list(STORE)
    faces = _load_faces()
    
    # Filter records for target month
    monthly_recs = []
    for rec in recs:
        try:
            rec_time = datetime.fromisoformat(rec["time"].replace("Z", "+00:00"))
            if rec_time.month == target_month and rec_time.year == target_year:
                monthly_recs.append(rec)
        except Exception:
            continue
    
    # Count attendance per person
    attendance_count = defaultdict(int)
    attendance_details = defaultdict(list)
    
    for rec in monthly_recs:
        user_id = rec.get("user_id") or rec.get("user_name", "Unknown")
        user_name = rec.get("user_name", user_id)
        attendance_count[user_name] += 1
        attendance_details[user_name].append({
            "time": rec.get("time"),
            "type": rec.get("type"),
            "method": rec.get("method", "manual")
        })
    
    # Sort by attendance count
    sorted_attendance = sorted(attendance_count.items(), key=lambda x: x[1], reverse=True)
    
    # Prepare graph data
    graph_data = {
        "labels": [name for name, count in sorted_attendance],
        "values": [count for name, count in sorted_attendance],
        "colors": ["#4CAF50", "#2196F3", "#FF9800", "#F44336", "#9C27B0", "#00BCD4", "#FFEB3B", "#E91E63"]
    }
    
    # Calculate statistics
    total_attendance = sum(attendance_count.values())
    avg_attendance = total_attendance / len(attendance_count) if attendance_count else 0
    most_present = sorted_attendance[0] if sorted_attendance else ("None", 0)
    
    return {
        "ok": True,
        "month": target_month,
        "year": target_year,
        "total_records": len(monthly_recs),
        "unique_people": len(attendance_count),
        "most_present": {
            "name": most_present[0],
            "count": most_present[1]
        },
        "average_attendance": round(avg_attendance, 2),
        "attendance_by_person": dict(sorted_attendance),
        "graph_data": graph_data,
        "detailed_records": dict(attendance_details)
    }


@router.get("/analytics")
async def analytics() -> Dict[str, Any]:
    """Get comprehensive attendance analytics"""
    recs = load_list(STORE)
    faces = _load_faces()
    
    if not recs:
        return {
            "ok": True,
            "total_records": 0,
            "enrolled_faces": len(faces),
            "message": "No attendance records yet"
        }
    
    # Overall statistics
    total = len(recs)
    auto_count = sum(1 for r in recs if r.get("method") == "automatic_facial_recognition")
    manual_count = total - auto_count
    
    # Count by person
    by_person = defaultdict(int)
    for rec in recs:
        name = rec.get("user_name", rec.get("user_id", "Unknown"))
        by_person[name] += 1
    
    # Recent activity (last 7 days)
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    recent = []
    for rec in recs:
        try:
            rec_time = datetime.fromisoformat(rec["time"].replace("Z", "+00:00"))
            if rec_time >= week_ago:
                recent.append(rec)
        except Exception:
            continue
    
    return {
        "ok": True,
        "total_records": total,
        "enrolled_faces": len(faces),
        "automatic_checkins": auto_count,
        "manual_checkins": manual_count,
        "unique_people": len(by_person),
        "attendance_by_person": dict(by_person),
        "recent_activity": len(recent),
        "most_active": max(by_person.items(), key=lambda x: x[1]) if by_person else ("None", 0)
    }


@router.post("/checkin")
async def checkin(user_id: str = Form(...), photo: UploadFile | None = File(None)) -> Dict[str, Any]:
    recs = load_list(STORE)
    photo_url = None
    if photo is not None:
        uid = str(uuid.uuid4())
        ext = os.path.splitext(photo.filename or "")[1] or ".jpg"
        out = os.path.join(PHOTOS, f"att_{uid}{ext}")
        data = await photo.read()
        with open(out, 'wb') as f:
            f.write(data)
        photo_url = f"/files/{os.path.basename(out)}"
    record = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "checkin",
        "time": datetime.utcnow().isoformat() + "Z",
        "photo": photo_url,
    }
    recs.append(record)
    save_list(STORE, recs)
    return {"ok": True, "record": record}


@router.post("/checkout")
async def checkout(user_id: str = Form(...)) -> Dict[str, Any]:
    recs = load_list(STORE)
    record = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "checkout",
        "time": datetime.utcnow().isoformat() + "Z",
    }
    recs.append(record)
    save_list(STORE, recs)
    return {"ok": True, "record": record}


@router.get("/report")
async def report() -> Dict[str, Any]:
    recs = load_list(STORE)
    return {"count": len(recs), "records": recs}


@router.get("/faces/list")
async def list_faces() -> Dict[str, Any]:
    """List all enrolled faces."""
    faces = _load_faces()
    return {"count": len(faces), "faces": [{"id": f["id"], "name": f["name"], "photo": f.get("photo")} for f in faces]}


@router.post("/auto-recognize")
async def auto_recognize(photo: UploadFile = File(...)) -> Dict[str, Any]:
    """Auto-recognize and mark attendance if match found."""
    data = await photo.read()
    try:
        img = Image.open(io.BytesIO(data)).convert('RGB')
    except Exception:
        return {"error": "Invalid image"}
    
    probe = _embed_image(img)
    faces = _load_faces()
    if not faces:
        return {"error": "No enrolled faces", "attendance_marked": False}
    
    best = None
    best_sim = -1.0
    for f in faces:
        sim = _cosine(probe, f.get("embedding", []))
        if sim > best_sim:
            best_sim = sim
            best = f
    
    if best and best_sim > 0.85:
        # Auto-mark attendance
        recs = load_list(STORE)
        record = {
            "id": str(uuid.uuid4()),
            "user_id": best["id"],
            "user_name": best["name"],
            "type": "auto-checkin",
            "time": datetime.utcnow().isoformat() + "Z",
            "confidence": round(best_sim, 3),
        }
        recs.append(record)
        save_list(STORE, recs)
        return {
            "attendance_marked": True,
            "match": {
                "name": best["name"],
                "id": best["id"],
                "confidence": round(best_sim, 3)
            },
            "record": record
        }
    else:
        return {
            "attendance_marked": False,
            "message": "No confident match found",
            "best_similarity": round(best_sim, 3) if best else 0
        }


@router.get("/analytics/monthly")
async def monthly_analytics(year: int = None, month: int = None) -> Dict[str, Any]:
    """Get monthly attendance analytics."""
    from collections import defaultdict
    
    if year is None or month is None:
        now = datetime.utcnow()
        year = now.year
        month = now.month
    
    recs = load_list(STORE)
    faces = _load_faces()
    
    # Count attendance per user
    attendance_count = defaultdict(int)
    user_names = {}
    
    for rec in recs:
        try:
            rec_time = datetime.fromisoformat(rec["time"].replace("Z", ""))
            if rec_time.year == year and rec_time.month == month:
                uid = rec.get("user_id", "")
                uname = rec.get("user_name", uid)
                if uid:
                    attendance_count[uid] += 1
                    user_names[uid] = uname
        except:
            pass
    
    # Build analytics
    user_stats = []
    for uid, count in attendance_count.items():
        user_stats.append({
            "user_id": uid,
            "name": user_names.get(uid, uid),
            "attendance_count": count
        })
    
    user_stats.sort(key=lambda x: x["attendance_count"], reverse=True)
    
    total_enrolled = len(faces)
    total_checkins = sum(attendance_count.values())
    
    return {
        "year": year,
        "month": month,
        "total_enrolled": total_enrolled,
        "total_checkins": total_checkins,
        "user_stats": user_stats,
        "top_attendee": user_stats[0] if user_stats else None
    }


@router.get("/analytics/dashboard")
async def dashboard() -> Dict[str, Any]:
    """Get overall dashboard statistics."""
    recs = load_list(STORE)
    faces = _load_faces()
    
    from collections import defaultdict
    from datetime import timedelta
    
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    
    today_count = 0
    week_count = 0
    user_activity = defaultdict(int)
    
    for rec in recs:
        try:
            rec_time = datetime.fromisoformat(rec["time"].replace("Z", ""))
            if rec_time >= today_start:
                today_count += 1
            if rec_time >= week_start:
                week_count += 1
            
            uid = rec.get("user_id", "")
            if uid:
                user_activity[uid] += 1
        except:
            pass
    
    most_active = None
    if user_activity:
        most_active_id = max(user_activity, key=user_activity.get)
        most_active_count = user_activity[most_active_id]
        most_active_name = next((f["name"] for f in faces if f["id"] == most_active_id), most_active_id)
        most_active = {
            "id": most_active_id,
            "name": most_active_name,
            "count": most_active_count
        }
    
    return {
        "total_enrolled": len(faces),
        "total_records": len(recs),
        "today_checkins": today_count,
        "week_checkins": week_count,
        "most_active_user": most_active,
        "unique_users": len(user_activity)
    }
