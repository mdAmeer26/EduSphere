import os
import uuid
from typing import Any, Dict, List, Set
from datetime import datetime

from fastapi import APIRouter, Form, WebSocket, WebSocketDisconnect, File, UploadFile
from pydantic import BaseModel
from PIL import Image
import io

from app.utils.storage import STORAGE_ROOT, load_list, save_list

router = APIRouter()

ROOT = os.path.dirname(STORAGE_ROOT)
ROOMS_STORE = os.path.join(ROOT, "uploads", "edumeet_rooms.json")
MEETINGS_STORE = os.path.join(ROOT, "uploads", "edumeet_meetings.json")
MESSAGES_STORE = os.path.join(ROOT, "uploads", "edumeet_messages.json")
ATTENDANCE_STORE = os.path.join(ROOT, "uploads", "edumeet_attendance.json")
POLLS_STORE = os.path.join(ROOT, "uploads", "edumeet_polls.json")
BREAKOUT_STORE = os.path.join(ROOT, "uploads", "edumeet_breakout.json")
FACE_DB = os.path.join(ROOT, "uploads", "faces_db.json")


class RoomCreate(BaseModel):
    name: str
    host: str


class MeetingCreate(BaseModel):
    title: str
    description: str = ""
    host: str
    scheduled_time: str
    duration_minutes: int = 60
    max_participants: int = 100
    settings: dict = {}


class JoinRoom(BaseModel):
    room_id: str
    user_name: str


class JoinMeeting(BaseModel):
    meeting_id: str
    user_name: str


class AttendanceMark(BaseModel):
    meeting_id: str
    user_name: str
    timestamp: str


class ChatMessage(BaseModel):
    meeting_id: str
    message: dict


class PollCreate(BaseModel):
    meeting_id: str
    poll: dict


class BreakoutCreate(BaseModel):
    meeting_id: str
    room: dict


def _load_faces() -> list[dict]:
    import json
    try:
        if os.path.exists(FACE_DB):
            with open(FACE_DB, 'r', encoding='utf-8') as f:
                return json.load(f) or []
    except Exception:
        pass
    return []


def _embed_image(img: Image.Image) -> list[float]:
    g = img.convert('L').resize((16, 16))
    vec = [p / 255.0 for p in list(g.getdata())]
    return vec


def _cosine(a: list[float], b: list[float]) -> float:
    import math
    s = sum(x*y for x, y in zip(a, b))
    na = math.sqrt(sum(x*x for x in a))
    nb = math.sqrt(sum(y*y for y in b))
    return s / (na*nb + 1e-8)


@router.post("/room/create")
async def create_room(req: RoomCreate) -> Dict[str, Any]:
    rooms = load_list(ROOMS_STORE)
    room = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "host": req.host,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "participants": [req.host],
        "status": "active",
        "attendance_enabled": True,
    }
    rooms.append(room)
    save_list(ROOMS_STORE, rooms)
    return {"ok": True, "room": room}


@router.post("/room/join")
async def join_room(req: JoinRoom) -> Dict[str, Any]:
    rooms = load_list(ROOMS_STORE)
    room = next((r for r in rooms if r["id"] == req.room_id), None)
    if not room:
        return {"error": "Room not found"}
    
    if req.user_name not in room.get("participants", []):
        room["participants"].append(req.user_name)
    
    save_list(ROOMS_STORE, rooms)
    return {"ok": True, "room": room}


@router.get("/room/list")
async def list_rooms() -> Dict[str, Any]:
    rooms = load_list(ROOMS_STORE)
    active = [r for r in rooms if r.get("status") == "active"]
    return {"count": len(active), "rooms": active}


@router.get("/room/{room_id}")
async def get_room(room_id: str) -> Dict[str, Any]:
    rooms = load_list(ROOMS_STORE)
    room = next((r for r in rooms if r["id"] == room_id), None)
    if not room:
        return {"error": "Room not found"}
    return {"room": room}


# ===== Advanced Meeting Endpoints =====

@router.post("/meeting/create")
async def create_meeting(req: MeetingCreate) -> Dict[str, Any]:
    """Create a new advanced meeting with full settings"""
    meetings = load_list(MEETINGS_STORE)
    meeting = {
        "id": str(uuid.uuid4()),
        "title": req.title,
        "description": req.description,
        "host": req.host,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "scheduled_time": req.scheduled_time,
        "duration_minutes": req.duration_minutes,
        "max_participants": req.max_participants,
        "participants": [req.host],
        "status": "active",
        "settings": req.settings or {
            "enable_recording": False,
            "enable_attendance": True,
            "enable_breakout_rooms": False,
            "enable_whiteboard": True,
            "require_approval": False
        }
    }
    meetings.append(meeting)
    save_list(MEETINGS_STORE, meetings)
    return {"ok": True, "meeting": meeting}


@router.get("/meetings/list")
async def list_meetings() -> Dict[str, Any]:
    """List all active meetings"""
    meetings = load_list(MEETINGS_STORE)
    active = [m for m in meetings if m.get("status") == "active"]
    return {"count": len(active), "meetings": active}


@router.get("/meeting/{meeting_id}")
async def get_meeting(meeting_id: str) -> Dict[str, Any]:
    """Get meeting details"""
    meetings = load_list(MEETINGS_STORE)
    meeting = next((m for m in meetings if m["id"] == meeting_id), None)
    if not meeting:
        return {"error": "Meeting not found"}
    return {"meeting": meeting}


@router.post("/meeting/join")
async def join_meeting(req: JoinMeeting) -> Dict[str, Any]:
    """Join an existing meeting"""
    meetings = load_list(MEETINGS_STORE)
    meeting = next((m for m in meetings if m["id"] == req.meeting_id), None)
    if not meeting:
        return {"error": "Meeting not found"}
    
    if meeting.get("settings", {}).get("require_approval"):
        return {"error": "Requires host approval", "pending": True}
    
    if req.user_name not in meeting.get("participants", []):
        meeting["participants"].append(req.user_name)
        save_list(MEETINGS_STORE, meetings)
    
    return {"ok": True, "meeting": meeting}


@router.get("/meeting/{meeting_id}/participants")
async def get_participants(meeting_id: str) -> Dict[str, Any]:
    """Get all participants in a meeting"""
    meetings = load_list(MEETINGS_STORE)
    meeting = next((m for m in meetings if m["id"] == meeting_id), None)
    if not meeting:
        return {"error": "Meeting not found"}
    return {"participants": meeting.get("participants", [])}


@router.post("/meeting/{meeting_id}/end")
async def end_meeting(meeting_id: str) -> Dict[str, Any]:
    """End a meeting"""
    meetings = load_list(MEETINGS_STORE)
    meeting = next((m for m in meetings if m["id"] == meeting_id), None)
    if not meeting:
        return {"error": "Meeting not found"}
    
    meeting["status"] = "ended"
    meeting["ended_at"] = datetime.utcnow().isoformat() + "Z"
    save_list(MEETINGS_STORE, meetings)
    return {"ok": True}


@router.post("/attendance/mark")
async def mark_attendance(req: AttendanceMark) -> Dict[str, Any]:
    """Mark attendance for a participant"""
    attendance = load_list(ATTENDANCE_STORE)
    record = {
        "id": str(uuid.uuid4()),
        "meeting_id": req.meeting_id,
        "user_name": req.user_name,
        "join_time": req.timestamp,
        "status": "present"
    }
    attendance.append(record)
    save_list(ATTENDANCE_STORE, attendance)
    return {"ok": True, "record": record}


@router.get("/meeting/{meeting_id}/attendance")
async def get_meeting_attendance(meeting_id: str) -> Dict[str, Any]:
    """Get attendance records for a meeting"""
    attendance = load_list(ATTENDANCE_STORE)
    records = [r for r in attendance if r.get("meeting_id") == meeting_id]
    return {"attendance": records, "count": len(records)}


@router.post("/chat/send")
async def send_chat(req: ChatMessage) -> Dict[str, Any]:
    """Send a chat message in a meeting"""
    messages = load_list(MESSAGES_STORE)
    message = {
        "id": str(uuid.uuid4()),
        "meeting_id": req.meeting_id,
        **req.message
    }
    messages.append(message)
    save_list(MESSAGES_STORE, messages)
    return {"ok": True, "message": message}


@router.get("/meeting/{meeting_id}/chat")
async def get_chat(meeting_id: str) -> Dict[str, Any]:
    """Get chat history for a meeting"""
    messages = load_list(MESSAGES_STORE)
    chat = [m for m in messages if m.get("meeting_id") == meeting_id]
    return {"messages": chat, "count": len(chat)}


@router.post("/poll/create")
async def create_poll(req: PollCreate) -> Dict[str, Any]:
    """Create a poll in a meeting"""
    polls = load_list(POLLS_STORE)
    poll = {
        "id": str(uuid.uuid4()),
        "meeting_id": req.meeting_id,
        "created_at": datetime.utcnow().isoformat() + "Z",
        **req.poll
    }
    polls.append(poll)
    save_list(POLLS_STORE, polls)
    return {"ok": True, "poll": poll}


@router.get("/meeting/{meeting_id}/polls")
async def get_polls(meeting_id: str) -> Dict[str, Any]:
    """Get all polls for a meeting"""
    polls = load_list(POLLS_STORE)
    meeting_polls = [p for p in polls if p.get("meeting_id") == meeting_id]
    return {"polls": meeting_polls, "count": len(meeting_polls)}


@router.post("/breakout/create")
async def create_breakout(req: BreakoutCreate) -> Dict[str, Any]:
    """Create a breakout room"""
    breakouts = load_list(BREAKOUT_STORE)
    breakout = {
        "id": str(uuid.uuid4()),
        "meeting_id": req.meeting_id,
        "created_at": datetime.utcnow().isoformat() + "Z",
        **req.room
    }
    breakouts.append(breakout)
    save_list(BREAKOUT_STORE, breakouts)
    return {"ok": True, "breakout": breakout}


@router.get("/meeting/{meeting_id}/breakouts")
async def get_breakouts(meeting_id: str) -> Dict[str, Any]:
    """Get all breakout rooms for a meeting"""
    breakouts = load_list(BREAKOUT_STORE)
    meeting_breakouts = [b for b in breakouts if b.get("meeting_id") == meeting_id]
    return {"breakouts": meeting_breakouts, "count": len(meeting_breakouts)}


@router.post("/room/attendance/mark")
async def mark_attendance_from_photo(room_id: str = Form(...), photo: UploadFile = File(...)) -> Dict[str, Any]:
    """Auto-detect participant from photo and mark attendance in meeting."""
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
        # Mark attendance
        attendance = load_list(ATTENDANCE_STORE)
        record = {
            "id": str(uuid.uuid4()),
            "user_id": best["id"],
            "user_name": best["name"],
            "room_id": room_id,
            "type": "meeting-attendance",
            "time": datetime.utcnow().isoformat() + "Z",
            "confidence": round(best_sim, 3),
        }
        attendance.append(record)
        save_list(ATTENDANCE_STORE, attendance)
        
        # Update room participants
        rooms = load_list(ROOMS_STORE)
        room = next((r for r in rooms if r["id"] == room_id), None)
        if room and best["name"] not in room.get("participants", []):
            room["participants"].append(best["name"])
            save_list(ROOMS_STORE, rooms)
        
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


@router.get("/room/{room_id}/attendance")
async def get_room_attendance(room_id: str) -> Dict[str, Any]:
    """Get attendance records for a specific meeting room."""
    attendance = load_list(ATTENDANCE_STORE)
    room_records = [r for r in attendance if r.get("room_id") == room_id]
    
    return {
        "room_id": room_id,
        "count": len(room_records),
        "records": room_records
    }


class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, Set[WebSocket]] = {}

    async def connect(self, room_id: str, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(room_id, set()).add(ws)

    def disconnect(self, room_id: str, ws: WebSocket):
        if room_id in self.rooms and ws in self.rooms[room_id]:
            self.rooms[room_id].remove(ws)
            if not self.rooms[room_id]:
                del self.rooms[room_id]

    async def broadcast(self, room_id: str, message: str):
        for ws in list(self.rooms.get(room_id, [])):
            try:
                await ws.send_text(message)
            except Exception:
                pass


manager = ConnectionManager()


@router.websocket("/ws/{room_id}")
async def ws_room(ws: WebSocket, room_id: str):
    await manager.connect(room_id, ws)
    try:
        await manager.broadcast(room_id, f"[system] user joined {room_id}")
        while True:
            msg = await ws.receive_text()
            await manager.broadcast(room_id, msg)
    except WebSocketDisconnect:
        manager.disconnect(room_id, ws)
        try:
            await manager.broadcast(room_id, f"[system] user left {room_id}")
        except Exception:
            pass
