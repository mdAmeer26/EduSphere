import os
import uuid
import json
from datetime import datetime
from typing import Any, Dict, List, Optional

import aiofiles
from fastapi import APIRouter, File, Form, UploadFile
from pydantic import BaseModel

from app.utils.pdf_tools import extract_pdf_text_with_ocr_fallback
from app.utils.summarizer import summarize_text, generate_notes, generate_questions
from app.utils.storage import STORAGE_ROOT

router = APIRouter()

EXPORT_ROOT = STORAGE_ROOT
NOTES_STORE = os.path.join(EXPORT_ROOT, "notes_repo.json")


class NoteShare(BaseModel):
    title: str
    subject: str
    course_code: str
    instructor: str
    student_name: str
    university: str
    semester: str
    content: str
    note_type: str  # lecture, assignment, lab, exam_prep, summary
    tags: str  # comma-separated tags


@router.post("/generate")
async def generate_notes_api(
    text: str | None = Form(None),
    file: UploadFile | None = File(None),
) -> Dict[str, Any]:
    content = (text or "").strip()
    used_ocr = False
    fname = None

    if file is not None:
        ext = os.path.splitext(file.filename or "")[1].lower()
        uid = str(uuid.uuid4())
        save_path = os.path.join(EXPORT_ROOT, f"{uid}{ext or ''}")
        async with aiofiles.open(save_path, "wb") as out:
            data = await file.read()
            await out.write(data)
        fname = os.path.basename(save_path)
        if ext == ".pdf":
            content, used_ocr = extract_pdf_text_with_ocr_fallback(save_path)

    if not content:
        return {"error": "Provide text or a PDF file"}

    summary = summarize_text(content, max_sentences=8)
    bullets = generate_notes(content, bullet_count=12)
    questions = generate_questions(content, count=8)

    # Export markdown
    uid = str(uuid.uuid4())
    md_path = os.path.join(EXPORT_ROOT, f"{uid}.md")
    md = [f"# Notes\n\n## Summary\n{summary}\n\n## Notes\n"]
    md += [f"- {b}" for b in bullets]
    md.append("\n## Questions\n")
    md += [f"1. {q}" for q in questions]
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md))

    return {
        "id": uid,
        "source_file": fname,
        "ocr_used": used_ocr,
        "summary": summary,
        "notes": bullets,
        "questions": questions,
        "download_url": f"/files/{os.path.basename(md_path)}",
    }


# Community Notes Repository (simple JSON store)
def _load_repo() -> List[Dict[str, Any]]:
    try:
        if os.path.exists(NOTES_STORE):
            import json
            with open(NOTES_STORE, 'r', encoding='utf-8') as f:
                return json.load(f) or []
    except Exception:
        pass
    return []


def _save_repo(items: List[Dict[str, Any]]):
    try:
        import json
        with open(NOTES_STORE, 'w', encoding='utf-8') as f:
            json.dump(items, f)
    except Exception:
        pass


@router.post("/share")
async def share_notes(
    title: str = Form(...),
    subject: str = Form(...),
    course_code: str = Form(""),
    instructor: str = Form(""),
    student_name: str = Form(...),
    university: str = Form(""),
    semester: str = Form(""),
    content: str = Form(...),
    note_type: str = Form("lecture"),
    tags: str = Form(""),
    file: UploadFile | None = File(None)
) -> Dict[str, Any]:
    """Share class notes with the community"""
    
    # Handle file upload if provided
    file_url = None
    if file:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext in ['.pdf', '.docx', '.txt', '.md']:
            uid = str(uuid.uuid4())
            file_path = os.path.join(EXPORT_ROOT, f"notes_{uid}{ext}")
            async with aiofiles.open(file_path, "wb") as out:
                data = await file.read()
                await out.write(data)
            file_url = f"/files/{os.path.basename(file_path)}"
    
    # Create note entry
    note_entry = {
        "id": str(uuid.uuid4()),
        "title": title.strip(),
        "subject": subject.strip(),
        "course_code": course_code.strip(),
        "instructor": instructor.strip(),
        "student_name": student_name.strip(),
        "university": university.strip(),
        "semester": semester.strip(),
        "content": content.strip(),
        "note_type": note_type.strip(),
        "tags": [tag.strip() for tag in tags.split(",") if tag.strip()],
        "file_url": file_url,
        "shared_at": datetime.now().isoformat(),
        "views": 0,
        "likes": 0,
        "downloads": 0
    }
    
    # Save to repository
    notes = _load_repo()
    notes.append(note_entry)
    _save_repo(notes)
    
    return {
        "success": True,
        "message": "Notes shared successfully!",
        "note_id": note_entry["id"],
        "note": note_entry
    }


@router.get("/browse")
async def browse_notes(
    subject: str = "",
    university: str = "",
    semester: str = "",
    note_type: str = "",
    search: str = "",
    limit: int = 20
) -> Dict[str, Any]:
    """Browse shared notes with filters"""
    
    notes = _load_repo()
    
    # Apply filters
    filtered_notes = []
    search_lower = search.lower()
    
    for note in notes:
        # Filter by subject
        if subject and note.get("subject", "").lower() != subject.lower():
            continue
            
        # Filter by university
        if university and university.lower() not in note.get("university", "").lower():
            continue
            
        # Filter by semester
        if semester and semester.lower() not in note.get("semester", "").lower():
            continue
            
        # Filter by note type
        if note_type and note.get("note_type", "") != note_type:
            continue
            
        # Search in title, content, tags
        if search and search_lower not in (
            note.get("title", "").lower() + " " +
            note.get("content", "").lower() + " " +
            " ".join(note.get("tags", [])).lower()
        ):
            continue
            
        filtered_notes.append(note)
    
    # Sort by most recent
    filtered_notes.sort(key=lambda x: x.get("shared_at", ""), reverse=True)
    
    # Limit results
    limited_notes = filtered_notes[:limit]
    
    return {
        "total": len(filtered_notes),
        "showing": len(limited_notes),
        "notes": limited_notes
    }


@router.get("/subjects")
async def get_subjects() -> Dict[str, Any]:
    """Get list of available subjects"""
    notes = _load_repo()
    subjects = {}
    
    for note in notes:
        subject = note.get("subject", "").strip()
        if subject:
            if subject not in subjects:
                subjects[subject] = {
                    "name": subject,
                    "count": 0,
                    "universities": set(),
                    "note_types": set()
                }
            subjects[subject]["count"] += 1
            if note.get("university"):
                subjects[subject]["universities"].add(note["university"])
            if note.get("note_type"):
                subjects[subject]["note_types"].add(note["note_type"])
    
    # Convert sets to lists for JSON serialization
    for subject_data in subjects.values():
        subject_data["universities"] = list(subject_data["universities"])
        subject_data["note_types"] = list(subject_data["note_types"])
    
    return {
        "subjects": list(subjects.values()),
        "total_subjects": len(subjects)
    }


@router.post("/view/{note_id}")
async def view_note(note_id: str) -> Dict[str, Any]:
    """View a specific note (increments view count)"""
    notes = _load_repo()
    
    for i, note in enumerate(notes):
        if note.get("id") == note_id:
            notes[i]["views"] = note.get("views", 0) + 1
            _save_repo(notes)
            return {
                "success": True,
                "note": notes[i]
            }
    
    return {"error": "Note not found"}


@router.post("/download/{note_id}")
async def download_note(note_id: str) -> Dict[str, Any]:
    """Track note download (increments download count)"""
    notes = _load_repo()
    
    for i, note in enumerate(notes):
        if note.get("id") == note_id:
            notes[i]["downloads"] = note.get("downloads", 0) + 1
            _save_repo(notes)
            return {
                "success": True,
                "downloads": notes[i]["downloads"],
                "message": "Download tracked!"
            }
    
    return {"error": "Note not found"}


@router.get("/files/{filename}")
async def serve_file(filename: str):
    """Serve uploaded note files"""
    file_path = os.path.join(EXPORT_ROOT, filename)
    if os.path.exists(file_path):
        return FileResponse(
            file_path,
            filename=filename,
            media_type='application/octet-stream'
        )
    return {"error": "File not found"}


# Legacy endpoints for backwards compatibility
@router.post("/add")
async def repo_add(title: str = Form(...), level: str = Form("general"), content: str = Form(...)) -> Dict[str, Any]:
    """Legacy endpoint - redirects to /share with basic structure"""
    # Convert to new format
    note_entry = {
        "id": str(uuid.uuid4()),
        "title": title.strip(),
        "subject": "General",
        "course_code": "",
        "instructor": "",
        "student_name": "Anonymous",
        "university": "",
        "semester": "",
        "content": content.strip(),
        "note_type": level.strip().lower() if level.strip().lower() in ["lecture", "lab", "exam", "assignment"] else "general",
        "tags": [],
        "file_url": None,
        "shared_at": datetime.now().isoformat(),
        "views": 0,
        "likes": 0,
        "downloads": 0
    }
    
    # Save to repository
    notes = _load_repo()
    notes.append(note_entry)
    _save_repo(notes)
    
    return {"ok": True, "note": note_entry}


@router.get("/list")
async def repo_list() -> Dict[str, Any]:
    """Legacy endpoint - returns all notes in old format"""
    notes = _load_repo()
    # Convert to old format for compatibility
    legacy_notes = []
    for note in notes:
        legacy_notes.append({
            "id": note.get("id"),
            "title": note.get("title"),
            "level": note.get("note_type", "general"),
            "content": note.get("content")
        })
    return {"count": len(legacy_notes), "notes": legacy_notes}


@router.get("/search")
async def repo_search(q: str = "", level: str = "") -> Dict[str, Any]:
    """Legacy endpoint - searches with old parameters"""
    notes = _load_repo()
    search_term = q.strip().lower()
    level_filter = level.strip().lower()
    
    filtered_notes = []
    for note in notes:
        # Check level/note_type filter
        if level_filter and note.get("note_type", "").lower() != level_filter:
            continue
            
        # Check search term
        if search_term:
            searchable_text = (
                note.get("title", "").lower() + " " +
                note.get("content", "").lower() + " " +
                " ".join(note.get("tags", [])).lower()
            )
            if search_term not in searchable_text:
                continue
        
        # Convert to legacy format
        filtered_notes.append({
            "id": note.get("id"),
            "title": note.get("title"),
            "level": note.get("note_type", "general"),
            "content": note.get("content")
        })
    
    return {"count": len(filtered_notes), "notes": filtered_notes}
