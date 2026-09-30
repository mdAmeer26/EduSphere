import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

from app.routers import edupdf, edutube, eduexcel, edupresent, edunotes, educhart, edudoc, educhat, stubs
from app.utils.storage import STORAGE_ROOT
import app.routers.whiteboard as whiteboard
import app.routers.attendance as attendance
import app.routers.blogs as blogs
import app.routers.edututor as edututor
import app.routers.edutrade as edutrade
import app.routers.eduintern as eduintern
import app.routers.edulingo as edulingo
import app.routers.edumeet as edumeet
import app.routers.edutalk as edutalk
import app.routers.eduvi as eduvi
import app.routers.eduair as eduair
import app.routers.circuit as circuit
import app.routers.focus as focus

APP_NAME = "EduSphere API"

app = FastAPI(title=APP_NAME, version="0.1.0")

# CORS (open for dev; tighten in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload dir exists
UPLOAD_ROOT = STORAGE_ROOT

# Static serving for generated files
static_mount = os.path.join(os.path.dirname(BASE_DIR), "uploads")
app.mount("/files", StaticFiles(directory=static_mount), name="files")

# Routers
app.include_router(edupdf.router, prefix="/api/edupdf", tags=["EduPDF"])
app.include_router(edutube.router, prefix="/api/edutube", tags=["EduTube"])
app.include_router(eduexcel.router, prefix="/api/eduexcel", tags=["EduExcel"])
app.include_router(edupresent.router, prefix="/api/edupresent", tags=["EduPresent"])
app.include_router(edunotes.router, prefix="/api/edunotes", tags=["EduNotes"])
app.include_router(educhart.router, prefix="/api/educhart", tags=["EduChart"])
app.include_router(edudoc.router, prefix="/api/edudoc", tags=["EduDoc"])
app.include_router(educhat.router, prefix="/api/educhat", tags=["EduChat"])
app.include_router(whiteboard.router, prefix="/api/whiteboard", tags=["Whiteboard"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(blogs.router, prefix="/api/edublogs", tags=["EduBlogs"])
app.include_router(edututor.router, prefix="/api/edututor", tags=["EduTutor"])
app.include_router(edutrade.router, prefix="/api/edutrade", tags=["EduTrade"])
app.include_router(eduintern.router, prefix="/api/eduintern", tags=["eduintern"])
app.include_router(edulingo.router, prefix="/api/edulingo", tags=["EduLingo"])
app.include_router(edumeet.router, prefix="/api/edumeet", tags=["EduMeet"])
app.include_router(edutalk.router, prefix="/api/edutalk", tags=["EduTalk"])
app.include_router(eduvi.router, prefix="/api/eduvi", tags=["EduVI"])
app.include_router(eduair.router, prefix="/api/eduair", tags=["EduAir"])
app.include_router(circuit.router, prefix="/api/circuit", tags=["Circuit"])
app.include_router(focus.router, prefix="/api/focus", tags=["FocusAI"])
app.include_router(stubs.router, prefix="/api", tags=["Stubs"])  # remaining modules


@app.get("/api/health")
def health():
    return {"status": "ok", "name": APP_NAME}
