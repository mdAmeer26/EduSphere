import os
import uuid
import json
from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydantic import BaseModel
from docx import Document
from docx.shared import Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from app.utils.storage import STORAGE_ROOT

router = APIRouter()

STORAGE = STORAGE_ROOT
DOC_METADATA = os.path.join(STORAGE, "doc_metadata.json")
os.makedirs(STORAGE, exist_ok=True)

# Resume data model
class ResumeData(BaseModel):
    fullName: str
    email: str
    phone: str
    address: str = ""
    summary: str = ""
    skills: str = ""
    experience: str = ""
    education: str = ""
    certifications: str = ""
    projects: str = ""

def load_metadata():
    """Load document metadata from JSON file"""
    if os.path.exists(DOC_METADATA):
        with open(DOC_METADATA, 'r') as f:
            return json.load(f)
    return {}

def save_metadata(metadata):
    """Save document metadata to JSON file"""
    with open(DOC_METADATA, 'w') as f:
        json.dump(metadata, f, indent=2)

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form(...),
    description: str = Form("")
) -> Dict[str, Any]:
    """Upload a document with category and description"""
    try:
        uid = str(uuid.uuid4())
        original_name = file.filename or f"document_{uid}"
        ext = os.path.splitext(original_name)[1]
        filename = f"{uid}{ext}"
        path = os.path.join(STORAGE, filename)
        
        # Save file
        data = await file.read()
        with open(path, 'wb') as f:
            f.write(data)
        
        # Save metadata
        metadata = load_metadata()
        metadata[uid] = {
            'id': uid,
            'filename': original_name,
            'storedAs': filename,
            'category': category,
            'description': description,
            'size': len(data),
            'uploadDate': datetime.now().isoformat(),
            'url': f"/files/{filename}"
        }
        save_metadata(metadata)
        
        return {
            'success': True,
            'id': uid,
            'filename': original_name,
            'download_url': f"/files/{filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents")
async def get_documents() -> Dict[str, Any]:
    """Get all uploaded documents grouped by category"""
    metadata = load_metadata()
    documents = list(metadata.values())
    return {'documents': documents}

@router.delete("/delete/{doc_id}")
async def delete_document(doc_id: str) -> Dict[str, Any]:
    """Delete a document"""
    try:
        metadata = load_metadata()
        if doc_id not in metadata:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc = metadata[doc_id]
        file_path = os.path.join(STORAGE, doc['storedAs'])
        
        # Remove file if it exists
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Remove from metadata
        del metadata[doc_id]
        save_metadata(metadata)
        
        return {'success': True, 'message': 'Document deleted'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-resume")
async def generate_ats_resume(resume_data: ResumeData) -> Dict[str, Any]:
    """Generate an ATS-friendly resume"""
    try:
        uid = str(uuid.uuid4())
        out_path = os.path.join(STORAGE, f"{uid}_resume.docx")
        
        # Create new document
        doc = Document()
        
        # Set document margins for ATS compatibility
        sections = doc.sections
        for section in sections:
            section.top_margin = Inches(0.5)
            section.bottom_margin = Inches(0.5)
            section.left_margin = Inches(0.5)
            section.right_margin = Inches(0.5)
        
        # Header with name and contact info
        header = doc.add_heading(resume_data.fullName, 0)
        header.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        # Contact information
        contact_info = []
        if resume_data.email:
            contact_info.append(resume_data.email)
        if resume_data.phone:
            contact_info.append(resume_data.phone)
        if resume_data.address:
            contact_info.append(resume_data.address)
        
        if contact_info:
            contact_p = doc.add_paragraph(' | '.join(contact_info))
            contact_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        doc.add_paragraph()  # Spacing
        
        # Professional Summary
        if resume_data.summary:
            doc.add_heading('PROFESSIONAL SUMMARY', level=1)
            doc.add_paragraph(resume_data.summary)
            doc.add_paragraph()
        
        # Skills
        if resume_data.skills:
            doc.add_heading('TECHNICAL SKILLS', level=1)
            doc.add_paragraph(resume_data.skills)
            doc.add_paragraph()
        
        # Experience
        if resume_data.experience:
            doc.add_heading('PROFESSIONAL EXPERIENCE', level=1)
            # Split by double newlines for different jobs
            jobs = resume_data.experience.split('\n\n')
            for job in jobs:
                if job.strip():
                    lines = job.strip().split('\n')
                    if lines:
                        # First line is job title/company (bold)
                        job_title = doc.add_paragraph()
                        job_title.add_run(lines[0]).bold = True
                        
                        # Remaining lines are bullet points
                        for line in lines[1:]:
                            if line.strip():
                                doc.add_paragraph(line.strip(), style='List Bullet')
            doc.add_paragraph()
        
        # Education
        if resume_data.education:
            doc.add_heading('EDUCATION', level=1)
            edu_lines = resume_data.education.split('\n')
            for line in edu_lines:
                if line.strip():
                    doc.add_paragraph(line.strip())
            doc.add_paragraph()
        
        # Certifications
        if resume_data.certifications:
            doc.add_heading('CERTIFICATIONS', level=1)
            cert_lines = resume_data.certifications.split('\n')
            for line in cert_lines:
                if line.strip():
                    doc.add_paragraph(line.strip(), style='List Bullet')
            doc.add_paragraph()
        
        # Projects
        if resume_data.projects:
            doc.add_heading('NOTABLE PROJECTS', level=1)
            project_sections = resume_data.projects.split('\n\n')
            for project in project_sections:
                if project.strip():
                    lines = project.strip().split('\n')
                    if lines:
                        # First line is project title (bold)
                        project_title = doc.add_paragraph()
                        project_title.add_run(lines[0]).bold = True
                        
                        # Remaining lines are bullet points
                        for line in lines[1:]:
                            if line.strip():
                                doc.add_paragraph(line.strip(), style='List Bullet')
        
        # Save document
        doc.save(out_path)
        
        return {
            'success': True,
            'download_url': f"/files/{os.path.basename(out_path)}",
            'filename': f"{resume_data.fullName.replace(' ', '_')}_Resume.docx"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume generation failed: {str(e)}")

# Legacy endpoints for backward compatibility
@router.get("/list")
async def list_files() -> Dict[str, Any]:
    """Legacy endpoint - redirects to documents"""
    metadata = load_metadata()
    files = []
    for doc in metadata.values():
        files.append({
            'name': doc['filename'],
            'url': doc['url'],
            'size': doc['size']
        })
    return {'files': files}

@router.post("/resume")
async def legacy_generate_resume(
    full_name: str = Form(...),
    email: str = Form(""),
    phone: str = Form(""),
    summary: str = Form(""),
    skills: str = Form(""),
    experience: str = Form(""),
) -> Dict[str, Any]:
    """Legacy resume generation endpoint"""
    resume_data = ResumeData(
        fullName=full_name,
        email=email,
        phone=phone,
        summary=summary,
        skills=skills,
        experience=experience
    )
    return await generate_ats_resume(resume_data)