import os
import uuid
from typing import Any, Dict, List
from datetime import datetime

from fastapi import APIRouter, Form
from pydantic import BaseModel

from app.utils.storage import load_list, save_list

router = APIRouter()

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".."))
TUTORS = os.path.join(ROOT, "uploads", "tutors.json")
REQUESTS = os.path.join(ROOT, "uploads", "tutor_requests.json")
SESSIONS = os.path.join(ROOT, "uploads", "tutor_sessions.json")
REVIEWS = os.path.join(ROOT, "uploads", "tutor_reviews.json")
AVAILABILITY = os.path.join(ROOT, "uploads", "tutor_availability.json")
PROMOTIONS = os.path.join(ROOT, "uploads", "tutor_promotions.json")


class TutorRegister(BaseModel):
    name: str
    email: str
    phone: str
    subjects: list[str]
    hourly_rate: float
    bio: str = ""
    qualifications: list[str] = []
    experience_years: int = 0
    languages: list[str] = ["English"]
    teaching_mode: list[str] = ["online", "offline"]  # both, online, offline
    location: str = ""
    availability: dict = {}  # {"monday": ["9-12", "14-18"], ...}
    max_students_group: int = 1  # 1 for individual, >1 for group
    
class SessionBook(BaseModel):
    tutor_id: str
    student: str
    student_email: str = ""
    subject: str
    date: str
    time_slot: str  # "9:00-10:00"
    duration_hours: float
    mode: str = "online"  # online, offline
    session_type: str = "individual"  # individual, group
    location: str = ""  # for offline
    participants: list[str] = []  # for group sessions
    
class SessionReview(BaseModel):
    session_id: str
    rating: float
    review_text: str
    student: str

class TutorFilter(BaseModel):
    subject: str = None
    max_rate: float = None
    min_rating: float = None
    mode: str = None  # online, offline, both
    location: str = None
    available_on: str = None  # day of week


@router.post("/register")
async def register_tutor(req: TutorRegister) -> Dict[str, Any]:
    """Register tutor with comprehensive profile."""
    tutors = load_list(TUTORS)
    
    # Check if email exists
    if any(t.get("email") == req.email for t in tutors):
        return {"error": "Email already registered"}
    
    # Minimal fee validation (should be affordable)
    if req.hourly_rate > 50:
        return {"error": "Hourly rate too high. Keep fees minimal for student accessibility (max $50/hr)"}
    
    tutor = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "email": req.email,
        "phone": req.phone,
        "subjects": [s.strip().lower() for s in req.subjects],
        "hourly_rate": req.hourly_rate,
        "bio": req.bio,
        "qualifications": req.qualifications,
        "experience_years": req.experience_years,
        "languages": req.languages,
        "teaching_mode": req.teaching_mode,
        "location": req.location,
        "availability": req.availability,
        "max_students_group": req.max_students_group,
        "rating": 5.0,
        "ratings_count": 0,
        "total_hours": 0,
        "total_students": 0,
        "total_earnings": 0,
        "verified": False,
        "badges": [],  # top_rated, experienced, affordable, responsive
        "response_time": "Within 1 hour",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "active": True,
    }
    
    # Auto-assign badges based on criteria
    if req.hourly_rate <= 15:
        tutor["badges"].append("💰 Super Affordable")
    if req.experience_years >= 5:
        tutor["badges"].append("⭐ Experienced")
    if len(req.teaching_mode) == 2:
        tutor["badges"].append("🌐 Flexible (Online & Offline)")
    
    tutors.append(tutor)
    save_list(TUTORS, tutors)
    
    return {"ok": True, "tutor": tutor, "message": "Registered successfully! Your profile is now visible to students."}


@router.get("/list")
async def list_tutors(subject: str = None, mode: str = None, max_rate: float = None, 
                     min_rating: float = None, location: str = None,
                     sort_by: str = "rating") -> Dict[str, Any]:
    """List tutors with advanced filtering and sorting."""
    tutors = load_list(TUTORS)
    
    # Filter active tutors only
    tutors = [t for t in tutors if t.get("active", True)]
    
    # Apply filters
    if subject:
        subject = subject.strip().lower()
        tutors = [t for t in tutors if subject in t.get("subjects", [])]
    
    if mode:
        tutors = [t for t in tutors if mode in t.get("teaching_mode", [])]
    
    if max_rate:
        tutors = [t for t in tutors if t.get("hourly_rate", 0) <= max_rate]
    
    if min_rating:
        tutors = [t for t in tutors if t.get("rating", 0) >= min_rating]
    
    if location:
        location = location.lower()
        tutors = [t for t in tutors if location in t.get("location", "").lower()]
    
    # Sort tutors
    if sort_by == "price_low":
        tutors.sort(key=lambda t: t.get("hourly_rate", 999))
    elif sort_by == "price_high":
        tutors.sort(key=lambda t: t.get("hourly_rate", 0), reverse=True)
    elif sort_by == "experience":
        tutors.sort(key=lambda t: t.get("experience_years", 0), reverse=True)
    elif sort_by == "rating":
        tutors.sort(key=lambda t: (t.get("rating", 0), t.get("ratings_count", 0)), reverse=True)
    elif sort_by == "popular":
        tutors.sort(key=lambda t: t.get("total_students", 0), reverse=True)
    
    # Add affordability indicator
    for t in tutors:
        if t.get("hourly_rate", 0) <= 10:
            t["affordability"] = "Super Affordable"
        elif t.get("hourly_rate", 0) <= 20:
            t["affordability"] = "Affordable"
        elif t.get("hourly_rate", 0) <= 35:
            t["affordability"] = "Moderate"
        else:
            t["affordability"] = "Premium"
    
    return {"count": len(tutors), "tutors": tutors}


@router.get("/tutor/{tutor_id}")
async def get_tutor_profile(tutor_id: str) -> Dict[str, Any]:
    """Get detailed tutor profile with reviews."""
    tutors = load_list(TUTORS)
    tutor = next((t for t in tutors if t["id"] == tutor_id), None)
    
    if not tutor:
        return {"error": "Tutor not found"}
    
    # Get reviews
    reviews = load_list(REVIEWS)
    tutor_reviews = [r for r in reviews if r.get("tutor_id") == tutor_id]
    tutor_reviews.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    
    # Get sessions stats
    sessions = load_list(SESSIONS)
    tutor_sessions = [s for s in sessions if s.get("tutor_id") == tutor_id]
    completed = [s for s in tutor_sessions if s.get("status") == "completed"]
    
    tutor["stats"] = {
        "total_sessions": len(tutor_sessions),
        "completed_sessions": len(completed),
        "total_reviews": len(tutor_reviews),
        "response_rate": "95%",  # Can be calculated from actual data
    }
    
    tutor["reviews"] = tutor_reviews[:10]  # Latest 10 reviews
    
    return {"ok": True, "tutor": tutor}


@router.get("/search")
async def search_tutors(q: str) -> Dict[str, Any]:
    """Search tutors by name, subject, or qualifications."""
    tutors = load_list(TUTORS)
    q = q.lower()
    
    results = []
    for t in tutors:
        if not t.get("active", True):
            continue
        
        # Search in multiple fields
        if (q in t.get("name", "").lower() or
            any(q in subj for subj in t.get("subjects", [])) or
            q in t.get("bio", "").lower() or
            any(q in qual.lower() for qual in t.get("qualifications", []))):
            results.append(t)
    
    results.sort(key=lambda t: (t.get("rating", 0), t.get("ratings_count", 0)), reverse=True)
    
    return {"count": len(results), "tutors": results}


@router.post("/session/book")
async def book_session(req: SessionBook) -> Dict[str, Any]:
    """Book a tutoring session with instant confirmation."""
    sessions = load_list(SESSIONS)
    tutors = load_list(TUTORS)
    
    tutor = next((t for t in tutors if t["id"] == req.tutor_id), None)
    if not tutor:
        return {"error": "Tutor not found"}
    
    # Check if mode is supported
    if req.mode not in tutor.get("teaching_mode", []):
        return {"error": f"Tutor doesn't offer {req.mode} sessions"}
    
    # Calculate cost
    base_cost = tutor.get("hourly_rate", 0) * req.duration_hours
    
    # Group session discount (20% off per person)
    if req.session_type == "group" and len(req.participants) > 1:
        cost_per_person = base_cost * 0.8 / len(req.participants)
        total_cost = base_cost * 0.8
    else:
        cost_per_person = base_cost
        total_cost = base_cost
    
    # Generate meeting link for online sessions
    meeting_link = None
    if req.mode == "online":
        meeting_id = str(uuid.uuid4())[:8]
        meeting_link = f"https://meet.edusphere.com/{meeting_id}"
    
    session = {
        "id": str(uuid.uuid4()),
        "tutor_id": req.tutor_id,
        "tutor_name": tutor["name"],
        "tutor_email": tutor.get("email"),
        "student": req.student,
        "student_email": req.student_email,
        "subject": req.subject,
        "date": req.date,
        "time_slot": req.time_slot,
        "duration_hours": req.duration_hours,
        "mode": req.mode,
        "session_type": req.session_type,
        "location": req.location if req.mode == "offline" else None,
        "participants": req.participants if req.session_type == "group" else [req.student],
        "meeting_link": meeting_link,
        "cost_per_person": round(cost_per_person, 2),
        "total_cost": round(total_cost, 2),
        "status": "confirmed",  # Instant booking
        "payment_status": "pending",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "confirmation_code": str(uuid.uuid4())[:8].upper(),
    }
    
    sessions.append(session)
    save_list(SESSIONS, sessions)
    
    return {
        "ok": True, 
        "session": session,
        "message": f"Session confirmed! {'Join meeting at: ' + meeting_link if meeting_link else 'Location: ' + req.location}"
    }


@router.post("/session/instant")
async def instant_session(subject: str = Form(...), student: str = Form(...),
                         mode: str = Form("online"), duration: float = Form(1.0)) -> Dict[str, Any]:
    """Find and book instant available tutor."""
    tutors = load_list(TUTORS)
    
    # Find available tutors for subject
    subject_lower = subject.lower()
    available = [t for t in tutors if 
                subject_lower in t.get("subjects", []) and
                mode in t.get("teaching_mode", []) and
                t.get("active", True)]
    
    if not available:
        return {"error": "No tutors available for instant session"}
    
    # Sort by rating and price
    available.sort(key=lambda t: (-t.get("rating", 0), t.get("hourly_rate", 999)))
    tutor = available[0]
    
    # Book session immediately
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    session_time = (now + timedelta(minutes=15)).strftime("%H:%M")
    
    booking_req = SessionBook(
        tutor_id=tutor["id"],
        student=student,
        subject=subject,
        date=now.strftime("%Y-%m-%d"),
        time_slot=f"{session_time}-{(now + timedelta(hours=duration, minutes=15)).strftime('%H:%M')}",
        duration_hours=duration,
        mode=mode,
        session_type="individual"
    )
    
    return await book_session(booking_req)


@router.post("/session/complete")
async def complete_session(session_id: str = Form(...)) -> Dict[str, Any]:
    """Mark session as completed."""
    sessions = load_list(SESSIONS)
    session = next((s for s in sessions if s["id"] == session_id), None)
    
    if not session:
        return {"error": "Session not found"}
    
    session["status"] = "completed"
    session["completed_at"] = datetime.utcnow().isoformat() + "Z"
    save_list(SESSIONS, sessions)
    
    # Update tutor stats
    tutors = load_list(TUTORS)
    tutor = next((t for t in tutors if t["id"] == session["tutor_id"]), None)
    if tutor:
        tutor["total_hours"] = tutor.get("total_hours", 0) + session.get("duration_hours", 0)
        tutor["total_students"] = tutor.get("total_students", 0) + len(session.get("participants", []))
        tutor["total_earnings"] = tutor.get("total_earnings", 0) + session.get("total_cost", 0)
        
        # Award badges
        if tutor["total_hours"] >= 100 and "🏆 100+ Hours" not in tutor.get("badges", []):
            tutor["badges"].append("🏆 100+ Hours")
        if tutor["total_students"] >= 50 and "👥 50+ Students" not in tutor.get("badges", []):
            tutor["badges"].append("👥 50+ Students")
        
        save_list(TUTORS, tutors)
    
    return {"ok": True, "session": session, "message": "Session completed! Please leave a review."}


@router.post("/session/review")
async def review_session(req: SessionReview) -> Dict[str, Any]:
    """Add review and rating for completed session."""
    sessions = load_list(SESSIONS)
    session = next((s for s in sessions if s["id"] == req.session_id), None)
    
    if not session:
        return {"error": "Session not found"}
    
    if session.get("status") != "completed":
        return {"error": "Can only review completed sessions"}
    
    # Save review
    reviews = load_list(REVIEWS)
    review = {
        "id": str(uuid.uuid4()),
        "session_id": req.session_id,
        "tutor_id": session["tutor_id"],
        "student": req.student,
        "rating": req.rating,
        "review_text": req.review_text,
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    reviews.append(review)
    save_list(REVIEWS, reviews)
    
    # Update tutor rating
    tutors = load_list(TUTORS)
    tutor = next((t for t in tutors if t["id"] == session["tutor_id"]), None)
    if tutor:
        old_total = tutor.get("rating", 5.0) * tutor.get("ratings_count", 0)
        tutor["ratings_count"] = tutor.get("ratings_count", 0) + 1
        tutor["rating"] = round((old_total + req.rating) / tutor["ratings_count"], 2)
        
        # Update badges based on rating
        if tutor["rating"] >= 4.8 and tutor["ratings_count"] >= 10:
            if "⭐ Top Rated" not in tutor.get("badges", []):
                tutor["badges"].append("⭐ Top Rated")
        
        save_list(TUTORS, tutors)
    
    return {"ok": True, "review": review, "message": "Thank you for your feedback!"}


@router.get("/sessions")
async def get_sessions(student: str = None, tutor_id: str = None, status: str = None) -> Dict[str, Any]:
    """Get sessions with optional filters."""
    sessions = load_list(SESSIONS)
    
    if student:
        sessions = [s for s in sessions if s.get("student") == student or student in s.get("participants", [])]
    if tutor_id:
        sessions = [s for s in sessions if s.get("tutor_id") == tutor_id]
    if status:
        sessions = [s for s in sessions if s.get("status") == status]
    
    # Sort by date
    sessions.sort(key=lambda s: s.get("date", "") + s.get("time_slot", ""), reverse=True)
    
    return {"count": len(sessions), "sessions": sessions}


@router.get("/availability/{tutor_id}")
async def get_availability(tutor_id: str, date: str = None) -> Dict[str, Any]:
    """Get tutor availability for booking."""
    tutors = load_list(TUTORS)
    tutor = next((t for t in tutors if t["id"] == tutor_id), None)
    
    if not tutor:
        return {"error": "Tutor not found"}
    
    # Get tutor's availability
    availability = tutor.get("availability", {
        "monday": ["9:00-12:00", "14:00-18:00"],
        "tuesday": ["9:00-12:00", "14:00-18:00"],
        "wednesday": ["9:00-12:00", "14:00-18:00"],
        "thursday": ["9:00-12:00", "14:00-18:00"],
        "friday": ["9:00-12:00", "14:00-18:00"],
        "saturday": ["10:00-14:00"],
        "sunday": []
    })
    
    # Get booked slots
    sessions = load_list(SESSIONS)
    booked_slots = []
    if date:
        booked = [s for s in sessions if 
                 s.get("tutor_id") == tutor_id and 
                 s.get("date") == date and
                 s.get("status") in ["confirmed", "scheduled"]]
        booked_slots = [s.get("time_slot") for s in booked]
    
    return {
        "ok": True,
        "tutor_id": tutor_id,
        "availability": availability,
        "booked_slots": booked_slots,
        "timezone": "UTC"
    }


@router.get("/promotions")
async def get_promotions() -> Dict[str, Any]:
    """Get active promotions and discounts."""
    promotions = [
        {
            "id": "first_session",
            "title": "50% Off First Session",
            "description": "New students get 50% discount on their first tutoring session",
            "discount": 0.5,
            "code": "FIRST50",
            "type": "first_time"
        },
        {
            "id": "group_discount",
            "title": "Group Session Discount",
            "description": "20% off when booking group sessions (2+ students)",
            "discount": 0.2,
            "type": "group"
        },
        {
            "id": "bulk_hours",
            "title": "10-Hour Package Deal",
            "description": "Buy 10 hours, get 2 hours free",
            "discount": 0.17,
            "code": "BULK10",
            "type": "package"
        },
        {
            "id": "refer_friend",
            "title": "Refer a Friend",
            "description": "Get $5 credit for each friend you refer",
            "reward": 5,
            "type": "referral"
        }
    ]
    
    return {"count": len(promotions), "promotions": promotions}


@router.get("/stats")
async def get_platform_stats() -> Dict[str, Any]:
    """Get platform statistics."""
    tutors = load_list(TUTORS)
    sessions = load_list(SESSIONS)
    reviews = load_list(REVIEWS)
    
    active_tutors = [t for t in tutors if t.get("active", True)]
    completed_sessions = [s for s in sessions if s.get("status") == "completed"]
    
    # Calculate average rate
    rates = [t.get("hourly_rate", 0) for t in active_tutors if t.get("hourly_rate", 0) > 0]
    avg_rate = sum(rates) / len(rates) if rates else 0
    
    # Affordable tutors (<=20/hr)
    affordable_count = len([t for t in active_tutors if t.get("hourly_rate", 0) <= 20])
    
    return {
        "total_tutors": len(active_tutors),
        "total_sessions": len(sessions),
        "completed_sessions": len(completed_sessions),
        "total_reviews": len(reviews),
        "average_rate": round(avg_rate, 2),
        "affordable_tutors": affordable_count,
        "subjects_offered": len(set(subj for t in active_tutors for subj in t.get("subjects", []))),
        "average_rating": round(sum(t.get("rating", 0) for t in active_tutors) / len(active_tutors), 2) if active_tutors else 0
    }