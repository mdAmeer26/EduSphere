import os
import uuid
from typing import Any, Dict
from datetime import datetime

from fastapi import APIRouter, Form
from pydantic import BaseModel
from typing import List, Optional

from app.utils.storage import load_list, save_list

router = APIRouter()

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".."))
STORE = os.path.join(ROOT, "uploads", "internships.json")
APPLICATIONS_STORE = os.path.join(ROOT, "uploads", "internship_applications.json")
SCHOLARSHIPS_STORE = os.path.join(ROOT, "uploads", "internship_scholarships.json")
COMPANIES_STORE = os.path.join(ROOT, "uploads", "companies.json")
REVIEWS_STORE = os.path.join(ROOT, "uploads", "internship_reviews.json")
STUDENTS_STORE = os.path.join(ROOT, "uploads", "students.json")


class ApplicationCreate(BaseModel):
    internship_id: str
    applicant: str
    email: str
    resume_url: str = ""
    cover_letter: str = ""
    portfolio_url: str = ""
    phone: str = ""
    availability: str = ""

class InternshipCreate(BaseModel):
    company: str
    role: str
    stipend: float = 0
    mode: str = "hybrid"  # online, offline, hybrid
    is_paid: bool = True
    location: str = "remote"
    duration: str = "3 months"
    requirements: str = ""
    skills_required: List[str] = []
    description: str = ""
    responsibilities: str = ""
    benefits: str = ""
    openings: int = 1
    application_deadline: Optional[str] = None
    start_date: Optional[str] = None
    scholarship_available: bool = False
    scholarship_criteria: Optional[str] = None
    min_cgpa: float = 0.0
    experience_level: str = "beginner"  # beginner, intermediate, advanced

class ScholarshipApplication(BaseModel):
    internship_id: str
    applicant: str
    email: str
    cgpa: float
    essay: str
    financial_need: str
    achievements: str

class CompanyProfile(BaseModel):
    name: str
    industry: str
    description: str
    website: str = ""
    size: str = "startup"  # startup, small, medium, large
    location: str = ""

class ReviewCreate(BaseModel):
    internship_id: str
    reviewer: str
    rating: int
    comment: str
    work_culture: int
    learning: int
    mentorship: int


@router.post("/create")
async def create_internship(
    company: str = Form(...), 
    role: str = Form(...), 
    stipend: float = Form(0), 
    mode: str = Form("hybrid"),
    is_paid: bool = Form(True),
    location: str = Form("remote"),
    duration: str = Form("3 months"),
    requirements: str = Form(""),
    skills_required: str = Form(""),
    description: str = Form(""),
    responsibilities: str = Form(""),
    benefits: str = Form(""),
    openings: int = Form(1),
    application_deadline: str = Form(""),
    start_date: str = Form(""),
    scholarship_available: bool = Form(False),
    scholarship_criteria: str = Form(""),
    min_cgpa: float = Form(0.0),
    experience_level: str = Form("beginner")
) -> Dict[str, Any]:
    jobs = load_list(STORE)
    
    skills_list = [s.strip() for s in skills_required.split(",") if s.strip()] if skills_required else []
    
    job = {
        "id": str(uuid.uuid4()),
        "company": company,
        "role": role,
        "stipend": stipend,
        "mode": mode,
        "is_paid": is_paid,
        "location": location,
        "duration": duration,
        "requirements": requirements,
        "skills_required": skills_list,
        "description": description,
        "responsibilities": responsibilities,
        "benefits": benefits,
        "openings": openings,
        "openings_remaining": openings,
        "application_deadline": application_deadline if application_deadline else None,
        "start_date": start_date if start_date else None,
        "scholarship_available": scholarship_available,
        "scholarship_criteria": scholarship_criteria if scholarship_available else None,
        "scholarship_slots": 2 if scholarship_available else 0,
        "scholarship_slots_remaining": 2 if scholarship_available else 0,
        "min_cgpa": min_cgpa,
        "experience_level": experience_level,
        "status": "open",
        "applications_count": 0,
        "scholarship_applications_count": 0,
        "views": 0,
        "featured": False,
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    jobs.append(job)
    save_list(STORE, jobs)
    return {"ok": True, "internship": job}


@router.get("/list")
async def list_internships(
    mode: str = None,  # online, offline, hybrid
    is_paid: bool = None,
    scholarship_only: bool = False,
    location: str = None,
    min_stipend: float = None,
    max_stipend: float = None,
    skills: str = None,
    experience_level: str = None,
    duration: str = None,
    search: str = None,
    company: str = None,
    sort_by: str = "recent",
    featured_only: bool = False
) -> Dict[str, Any]:
    jobs = load_list(STORE)
    jobs = [j for j in jobs if j.get("status") == "open" and j.get("openings_remaining", 0) > 0]
    
    # Apply filters
    if mode:
        jobs = [j for j in jobs if j.get("mode") == mode]
    if is_paid is not None:
        jobs = [j for j in jobs if j.get("is_paid") == is_paid]
    if scholarship_only:
        jobs = [j for j in jobs if j.get("scholarship_available") and j.get("scholarship_slots_remaining", 0) > 0]
    if location:
        jobs = [j for j in jobs if location.lower() in j.get("location", "").lower()]
    if min_stipend is not None:
        jobs = [j for j in jobs if j.get("stipend", 0) >= min_stipend]
    if max_stipend is not None:
        jobs = [j for j in jobs if j.get("stipend", 0) <= max_stipend]
    if skills:
        skill_list = [s.strip().lower() for s in skills.split(",")]
        jobs = [j for j in jobs if any(
            skill in [req.lower() for req in j.get("skills_required", [])]
            for skill in skill_list
        )]
    if experience_level:
        jobs = [j for j in jobs if j.get("experience_level") == experience_level]
    if duration:
        jobs = [j for j in jobs if duration.lower() in j.get("duration", "").lower()]
    if company:
        jobs = [j for j in jobs if company.lower() in j.get("company", "").lower()]
    if search:
        search_lower = search.lower()
        jobs = [j for j in jobs if 
                search_lower in j.get("role", "").lower() or 
                search_lower in j.get("company", "").lower() or
                search_lower in j.get("description", "").lower() or
                any(search_lower in skill.lower() for skill in j.get("skills_required", []))]
    if featured_only:
        jobs = [j for j in jobs if j.get("featured")]
    
    # Sorting
    if sort_by == "stipend_high":
        jobs.sort(key=lambda x: x.get("stipend", 0), reverse=True)
    elif sort_by == "stipend_low":
        jobs.sort(key=lambda x: x.get("stipend", 0))
    elif sort_by == "deadline":
        jobs.sort(key=lambda x: x.get("application_deadline", "9999-12-31"))
    elif sort_by == "popular":
        jobs.sort(key=lambda x: x.get("applications_count", 0) + x.get("views", 0), reverse=True)
    else:  # recent
        jobs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return {"count": len(jobs), "internships": jobs}


@router.post("/apply")
async def apply_to_internship(req: ApplicationCreate) -> Dict[str, Any]:
    internships = load_list(STORE)
    internship = next((i for i in internships if i["id"] == req.internship_id), None)
    if not internship:
        return {"error": "Internship not found"}
    
    if internship.get("openings_remaining", 0) <= 0:
        return {"error": "No openings remaining"}
    
    applications = load_list(APPLICATIONS_STORE)
    
    # Check if already applied
    existing = next((a for a in applications if 
                    a.get("internship_id") == req.internship_id and 
                    a.get("applicant") == req.applicant), None)
    if existing:
        return {"error": "Already applied to this internship"}
    
    application = {
        "id": str(uuid.uuid4()),
        "internship_id": req.internship_id,
        "company": internship["company"],
        "role": internship["role"],
        "applicant": req.applicant,
        "email": req.email,
        "resume_url": req.resume_url,
        "cover_letter": req.cover_letter,
        "portfolio_url": req.portfolio_url,
        "phone": req.phone,
        "availability": req.availability,
        "status": "pending",
        "application_type": "regular",
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    applications.append(application)
    save_list(APPLICATIONS_STORE, applications)
    
    # Update internship application count
    internship["applications_count"] = internship.get("applications_count", 0) + 1
    save_list(STORE, internships)
    
    return {"ok": True, "application": application}


@router.get("/applications")
async def get_applications(applicant: str = None, internship_id: str = None) -> Dict[str, Any]:
    applications = load_list(APPLICATIONS_STORE)
    if applicant:
        applications = [a for a in applications if a.get("applicant") == applicant]
    if internship_id:
        applications = [a for a in applications if a.get("internship_id") == internship_id]
    return {"count": len(applications), "applications": applications}


@router.post("/application/update")
async def update_application(application_id: str = Form(...), status: str = Form(...)) -> Dict[str, Any]:
    applications = load_list(APPLICATIONS_STORE)
    app = next((a for a in applications if a["id"] == application_id), None)
    if not app:
        return {"error": "Application not found"}
    
    old_status = app.get("status")
    app["status"] = status
    app["updated_at"] = datetime.utcnow().isoformat() + "Z"
    save_list(APPLICATIONS_STORE, applications)
    
    # If accepted, decrease openings
    if status == "accepted" and old_status != "accepted":
        internships = load_list(STORE)
        internship = next((i for i in internships if i["id"] == app["internship_id"]), None)
        if internship:
            internship["openings_remaining"] = max(0, internship.get("openings_remaining", 1) - 1)
            if internship["openings_remaining"] <= 0:
                internship["status"] = "filled"
            save_list(STORE, internships)
    
    return {"ok": True, "application": app}


@router.post("/scholarship/apply")
async def apply_for_scholarship(req: ScholarshipApplication) -> Dict[str, Any]:
    internships = load_list(STORE)
    internship = next((i for i in internships if i["id"] == req.internship_id), None)
    if not internship:
        return {"error": "Internship not found"}
    
    if not internship.get("scholarship_available"):
        return {"error": "No scholarships available for this internship"}
    
    if internship.get("scholarship_slots_remaining", 0) <= 0:
        return {"error": "All scholarship slots filled"}
    
    if req.cgpa < internship.get("min_cgpa", 0.0):
        return {"error": f"Minimum CGPA requirement: {internship.get('min_cgpa')}"}
    
    scholarships = load_list(SCHOLARSHIPS_STORE)
    
    # Check if already applied
    existing = next((s for s in scholarships if 
                    s.get("internship_id") == req.internship_id and 
                    s.get("applicant") == req.applicant), None)
    if existing:
        return {"error": "Already applied for scholarship"}
    
    scholarship_app = {
        "id": str(uuid.uuid4()),
        "internship_id": req.internship_id,
        "company": internship["company"],
        "role": internship["role"],
        "applicant": req.applicant,
        "email": req.email,
        "cgpa": req.cgpa,
        "essay": req.essay,
        "financial_need": req.financial_need,
        "achievements": req.achievements,
        "status": "under_review",
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    scholarships.append(scholarship_app)
    save_list(SCHOLARSHIPS_STORE, scholarships)
    
    # Update scholarship application count
    internship["scholarship_applications_count"] = internship.get("scholarship_applications_count", 0) + 1
    save_list(STORE, internships)
    
    return {"ok": True, "scholarship_application": scholarship_app}


@router.get("/scholarship/applications")
async def get_scholarship_applications(applicant: str = None, internship_id: str = None) -> Dict[str, Any]:
    scholarships = load_list(SCHOLARSHIPS_STORE)
    if applicant:
        scholarships = [s for s in scholarships if s.get("applicant") == applicant]
    if internship_id:
        scholarships = [s for s in scholarships if s.get("internship_id") == internship_id]
    return {"count": len(scholarships), "scholarship_applications": scholarships}


@router.post("/scholarship/update")
async def update_scholarship(scholarship_id: str = Form(...), status: str = Form(...)) -> Dict[str, Any]:
    scholarships = load_list(SCHOLARSHIPS_STORE)
    scholarship = next((s for s in scholarships if s["id"] == scholarship_id), None)
    if not scholarship:
        return {"error": "Scholarship application not found"}
    
    old_status = scholarship.get("status")
    scholarship["status"] = status
    scholarship["updated_at"] = datetime.utcnow().isoformat() + "Z"
    save_list(SCHOLARSHIPS_STORE, scholarships)
    
    # If approved, decrease scholarship slots and create regular application
    if status == "approved" and old_status != "approved":
        internships = load_list(STORE)
        internship = next((i for i in internships if i["id"] == scholarship["internship_id"]), None)
        if internship:
            internship["scholarship_slots_remaining"] = max(0, internship.get("scholarship_slots_remaining", 0) - 1)
            save_list(STORE, internships)
            
            # Auto-create application
            applications = load_list(APPLICATIONS_STORE)
            application = {
                "id": str(uuid.uuid4()),
                "internship_id": scholarship["internship_id"],
                "company": scholarship["company"],
                "role": scholarship["role"],
                "applicant": scholarship["applicant"],
                "email": scholarship["email"],
                "resume_url": "",
                "cover_letter": scholarship["essay"],
                "portfolio_url": "",
                "phone": "",
                "availability": "",
                "status": "scholarship_approved",
                "application_type": "scholarship",
                "created_at": datetime.utcnow().isoformat() + "Z",
            }
            applications.append(application)
            save_list(APPLICATIONS_STORE, applications)
    
    return {"ok": True, "scholarship": scholarship}


@router.get("/internship/{internship_id}")
async def get_internship_details(internship_id: str) -> Dict[str, Any]:
    internships = load_list(STORE)
    internship = next((i for i in internships if i["id"] == internship_id), None)
    if not internship:
        return {"error": "Internship not found"}
    
    # Increment view count
    internship["views"] = internship.get("views", 0) + 1
    save_list(STORE, internships)
    
    # Get reviews
    reviews = load_list(REVIEWS_STORE)
    internship_reviews = [r for r in reviews if r.get("internship_id") == internship_id]
    
    avg_rating = sum(r.get("rating", 0) for r in internship_reviews) / len(internship_reviews) if internship_reviews else 0
    
    return {
        "internship": internship,
        "reviews": internship_reviews,
        "average_rating": round(avg_rating, 1),
        "review_count": len(internship_reviews)
    }


@router.post("/review/create")
async def create_review(req: ReviewCreate) -> Dict[str, Any]:
    reviews = load_list(REVIEWS_STORE)
    
    # Check if already reviewed
    existing = next((r for r in reviews if 
                    r.get("internship_id") == req.internship_id and 
                    r.get("reviewer") == req.reviewer), None)
    if existing:
        return {"error": "Already reviewed this internship"}
    
    review = {
        "id": str(uuid.uuid4()),
        "internship_id": req.internship_id,
        "reviewer": req.reviewer,
        "rating": max(1, min(5, req.rating)),
        "comment": req.comment,
        "work_culture": max(1, min(5, req.work_culture)),
        "learning": max(1, min(5, req.learning)),
        "mentorship": max(1, min(5, req.mentorship)),
        "helpful_count": 0,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    reviews.append(review)
    save_list(REVIEWS_STORE, reviews)
    
    return {"ok": True, "review": review}


@router.post("/company/create")
async def create_company(req: CompanyProfile) -> Dict[str, Any]:
    companies = load_list(COMPANIES_STORE)
    
    # Check if company exists
    existing = next((c for c in companies if c.get("name").lower() == req.name.lower()), None)
    if existing:
        return {"error": "Company already registered"}
    
    company = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "industry": req.industry,
        "description": req.description,
        "website": req.website,
        "size": req.size,
        "location": req.location,
        "internships_posted": 0,
        "total_hires": 0,
        "average_rating": 0.0,
        "verified": False,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    companies.append(company)
    save_list(COMPANIES_STORE, companies)
    
    return {"ok": True, "company": company}


@router.get("/company/{company_name}")
async def get_company_profile(company_name: str) -> Dict[str, Any]:
    companies = load_list(COMPANIES_STORE)
    company = next((c for c in companies if c.get("name").lower() == company_name.lower()), None)
    
    internships = load_list(STORE)
    company_internships = [i for i in internships if i.get("company").lower() == company_name.lower()]
    
    active_internships = [i for i in company_internships if i.get("status") == "open"]
    
    # Calculate stats
    total_applications = sum(i.get("applications_count", 0) for i in company_internships)
    scholarship_count = sum(1 for i in company_internships if i.get("scholarship_available"))
    
    if company:
        company["internships_posted"] = len(company_internships)
    
    return {
        "company": company or {"name": company_name, "description": "No profile yet"},
        "active_internships": len(active_internships),
        "total_internships": len(company_internships),
        "total_applications": total_applications,
        "scholarships_offered": scholarship_count,
        "internships": company_internships[:10]
    }


@router.get("/filters/options")
async def get_filter_options() -> Dict[str, Any]:
    return {
        "modes": [
            {"value": "online", "label": "Online"},
            {"value": "offline", "label": "Offline"},
            {"value": "hybrid", "label": "Hybrid"}
        ],
        "experience_levels": [
            {"value": "beginner", "label": "Beginner"},
            {"value": "intermediate", "label": "Intermediate"},
            {"value": "advanced", "label": "Advanced"}
        ],
        "durations": [
            "1 month", "2 months", "3 months", "6 months", "1 year"
        ],
        "industries": [
            "Technology", "Finance", "Healthcare", "Education", 
            "Marketing", "Design", "Research", "Engineering", "Other"
        ],
        "skills": [
            "Python", "JavaScript", "React", "Node.js", "Machine Learning",
            "Data Science", "UI/UX", "Marketing", "Content Writing",
            "Graphic Design", "Business Analysis", "Project Management"
        ],
        "sort_options": [
            {"value": "recent", "label": "Most Recent"},
            {"value": "popular", "label": "Most Popular"},
            {"value": "stipend_high", "label": "Stipend: High to Low"},
            {"value": "stipend_low", "label": "Stipend: Low to High"},
            {"value": "deadline", "label": "Application Deadline"}
        ]
    }


@router.get("/analytics/platform")
async def get_platform_analytics() -> Dict[str, Any]:
    internships = load_list(STORE)
    applications = load_list(APPLICATIONS_STORE)
    scholarships = load_list(SCHOLARSHIPS_STORE)
    
    total_internships = len(internships)
    active_internships = len([i for i in internships if i.get("status") == "open"])
    total_applications = len(applications)
    total_scholarships = len(scholarships)
    
    # Mode breakdown
    online = len([i for i in internships if i.get("mode") == "online"])
    offline = len([i for i in internships if i.get("mode") == "offline"])
    hybrid = len([i for i in internships if i.get("mode") == "hybrid"])
    
    # Payment breakdown
    paid = len([i for i in internships if i.get("is_paid")])
    unpaid = len([i for i in internships if not i.get("is_paid")])
    with_scholarship = len([i for i in internships if i.get("scholarship_available")])
    
    # Average stipend
    paid_internships = [i for i in internships if i.get("is_paid") and i.get("stipend", 0) > 0]
    avg_stipend = sum(i.get("stipend", 0) for i in paid_internships) / len(paid_internships) if paid_internships else 0
    
    return {
        "total_internships": total_internships,
        "active_internships": active_internships,
        "total_applications": total_applications,
        "total_scholarships": total_scholarships,
        "scholarship_approval_rate": round(
            len([s for s in scholarships if s.get("status") == "approved"]) / len(scholarships) * 100, 1
        ) if scholarships else 0,
        "mode_breakdown": {
            "online": online,
            "offline": offline,
            "hybrid": hybrid
        },
        "payment_breakdown": {
            "paid": paid,
            "unpaid": unpaid,
            "with_scholarship": with_scholarship
        },
        "average_stipend": round(avg_stipend, 2),
        "application_acceptance_rate": round(
            len([a for a in applications if a.get("status") == "accepted"]) / len(applications) * 100, 1
        ) if applications else 0
    }


@router.post("/student/register")
async def register_student(
    name: str = Form(...),
    email: str = Form(...),
    university: str = Form(""),
    major: str = Form(""),
    cgpa: float = Form(0.0),
    graduation_year: str = Form(""),
    skills: str = Form(""),
    resume_url: str = Form(""),
    portfolio_url: str = Form("")
) -> Dict[str, Any]:
    students = load_list(STUDENTS_STORE)
    
    # Check if student exists
    existing = next((s for s in students if s.get("email") == email), None)
    if existing:
        return {"error": "Student already registered"}
    
    skills_list = [s.strip() for s in skills.split(",") if s.strip()] if skills else []
    
    student = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "university": university,
        "major": major,
        "cgpa": cgpa,
        "graduation_year": graduation_year,
        "skills": skills_list,
        "resume_url": resume_url,
        "portfolio_url": portfolio_url,
        "applications_count": 0,
        "scholarships_won": 0,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    students.append(student)
    save_list(STUDENTS_STORE, students)
    
    return {"ok": True, "student": student}


@router.get("/student/{email}")
async def get_student_profile(email: str) -> Dict[str, Any]:
    students = load_list(STUDENTS_STORE)
    student = next((s for s in students if s.get("email") == email), None)
    
    if not student:
        return {"error": "Student not found"}
    
    applications = load_list(APPLICATIONS_STORE)
    scholarships = load_list(SCHOLARSHIPS_STORE)
    
    student_apps = [a for a in applications if a.get("applicant") == student["name"] or a.get("email") == email]
    student_scholarships = [s for s in scholarships if s.get("applicant") == student["name"] or s.get("email") == email]
    
    student["applications_count"] = len(student_apps)
    student["scholarships_won"] = len([s for s in student_scholarships if s.get("status") == "approved"])
    
    return {
        "student": student,
        "applications": student_apps,
        "scholarship_applications": student_scholarships,
        "acceptance_rate": round(
            len([a for a in student_apps if a.get("status") == "accepted"]) / len(student_apps) * 100, 1
        ) if student_apps else 0
    }
