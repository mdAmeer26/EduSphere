<div align="center">
  <img src="./assets/logo.png" alt="EduSphere Logo" width="300"/>
  
  # 🎓 EduSphere
  ### AI-Driven Learning OS
  
  **A comprehensive, production-ready education platform with 22+ fully functional modules** covering learning, collaboration, creation, and productivity. Built with modern tech stacks and AI integration for next-generation educational experiences.
</div>

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.2-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 📑 Table of Contents
- [Features Overview](#-features-overview)
- [Technology Stack](#-technology-stack)
- [Quick Start](#-quick-start)
- [Installation & Setup](#-installation--setup)
- [API Documentation](#-api-documentation)
- [Frontend Features](#-frontend-features)
- [Environment Configuration](#-environment-configuration)
- [Deployment](#-deployment)

---

## ✨ Features Overview

### 🎯 Core Learning Tools
- **EduChat** – AI learning assistant with simple, fast responses
- **EduPDF** – PDF analysis with OCR, summaries, notes, and questions
- **EduTube** – YouTube video analysis with transcripts and notes
- **Whiteboard** – AI-powered drawing board with math solving

### 👥 Collaboration & Communication
- **EduBlogs** – LinkedIn-style professional networking (posts, likes, shares, connections, feed algorithm)
- **EduTalk** – WhatsApp-like messaging (groups, file sharing, voice/video calls, status updates)
- **EduMeet** – Video meetings with automatic attendance via facial recognition
- **Smart Attendance** – Auto facial recognition, monthly graphs, analytics dashboard

### 🎨 Creation & Design
- **EduVI** – AI image/video generation
- **EduAir** – Air canvas with gesture recognition
  - Most advanced finger tracking: predictive smoothing, anti-jitter filtering, velocity-based line width, and dynamic pointer feedback for natural air writing
- **Circuit** – Electronic circuit design and simulation

### 📚 Additional Tools
- **EduPresent** – AI presentation generator
- **EduExcel** – Smart spreadsheet generator with charts
- **EduNotes** – Structured note-taking with markdown export
- **EduChart** – Advanced chart and diagram generator
- **EduDoc** – Document management and resume builder
- **EduTutor** – Find and book tutors
- **EduTrade** – Student marketplace
- **Internships** – Browse and apply to internships
- **EduLingo** – Language learning with vocab and lessons
- **FocusAI** – Pomodoro timer with productivity tracking

---

## 🛠️ Technology Stack

### Backend Stack
| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | 0.115.2 | High-performance async REST API framework |
| **Uvicorn** | 0.30.6 | ASGI server with WebSocket support |
| **Python** | 3.10+ | Core programming language |
| **Starlette** | 0.38.2 | ASGI framework powering FastAPI |

### AI & Machine Learning
| Library | Version | Purpose |
|---------|---------|---------|
| **OpenAI** | 1.52.0 | GPT-based AI chat, image generation (DALL-E) |
| **Pytesseract** | 0.3.13 | OCR for PDF text extraction |
| **SymPy** | 1.13.1 | Symbolic mathematics and equation solving |

### Document Processing
| Library | Version | Purpose |
|---------|---------|---------|
| **PyPDF2** | 3.0.1 | PDF reading and manipulation |
| **pdf2image** | 1.17.0 | PDF to image conversion |
| **python-docx** | 1.1.2 | Microsoft Word document generation |
| **python-pptx** | 0.6.23 | PowerPoint presentation generation |
| **openpyxl** | 3.1.5 | Excel file reading/writing |
| **XlsxWriter** | 3.2.0 | Excel file generation with formatting |

### Data Processing & Analytics
| Library | Version | Purpose |
|---------|---------|---------|
| **Pandas** | 2.2.3 | Data manipulation and analysis |
| **NumPy** | 1.26.4 | Numerical computing |
| **Matplotlib** | 3.9.2 | Chart and graph generation |

### Media & Video Processing
| Library | Version | Purpose |
|---------|---------|---------|
| **youtube-transcript-api** | 0.6.2 | YouTube video transcript extraction |
| **Pillow** | 10.4.0 | Image processing and manipulation |

### Utilities
| Library | Version | Purpose |
|---------|---------|---------|
| **python-multipart** | 0.0.9 | File upload handling |
| **aiofiles** | 23.2.1 | Async file operations |
| **requests** | 2.32.3 | HTTP client library |

### Frontend Stack
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | UI library with hooks and modern patterns |
| **React DOM** | 18.3.1 | React renderer for web |
| **Vite** | 5.4.8 | Next-gen frontend build tool with HMR |
| **@vitejs/plugin-react** | 4.3.1 | Official Vite plugin for React Fast Refresh |

### Frontend Features
- ⚡ **Lightning-fast HMR** (Hot Module Replacement)
- 🎨 **Modern UI/UX** with gradient designs and smooth animations
- 📱 **Fully Responsive** - works on all devices
- 🌙 **Dark/Light Mode** toggle
- 🔄 **Real-time API status** monitoring
- 🎯 **23+ Interactive modules** with dedicated pages
- 🖼️ **Drag-and-drop** file uploads
- 📊 **Live data visualization** with charts and graphs

---

## 🚀 Quick Start

### One-Command Launch (PowerShell)

**Option A: PowerShell Script (Recommended - Opens 2 Separate Windows)**
```powershell
cd "c:\Users\mdame\Downloads\EduSphere"
.\start.ps1
```
✅ Backend starts on http://localhost:8000  
✅ Frontend starts on http://localhost:5173 (auto-opens browser)  
✅ Close terminal windows to stop servers

**Option B: VS Code Task (Integrated Terminal)**
1. Open this folder in VS Code
2. Press `Ctrl+Shift+P` → "Tasks: Run Task"
3. Select **"EduSphere: Start All"**
4. Both servers start in the integrated terminal (split view)

---

## 📦 Installation & Setup

### Prerequisites (Windows)

#### Required Software
| Software | Version | Installation Method | Purpose |
|----------|---------|---------------------|---------|
| **Python** | 3.10+ | [python.org](https://www.python.org) or `winget install Python.Python.3.12` | Backend runtime |
| **Node.js** | 18+ LTS | [nodejs.org](https://nodejs.org) or `winget install OpenJS.NodeJS.LTS` | Frontend build tool |
| **Tesseract OCR** | Latest | [GitHub Releases](https://github.com/tesseract-ocr/tesseract) | PDF OCR processing |

#### Tesseract OCR Setup
1. Download installer from https://github.com/tesseract-ocr/tesseract/releases
2. Default install path: `C:\Program Files\Tesseract-OCR\tesseract.exe`
3. Or set environment variable: `TESSERACT_CMD=C:\path\to\tesseract.exe`

### Backend Setup

```powershell
# Navigate to backend directory
cd "c:\Users\mdame\Downloads\EduSphere\backend"

# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Backend URLs:**
- 🏠 API Base: http://localhost:8000
- 📊 Interactive Docs: http://localhost:8000/docs
- 📋 ReDoc: http://localhost:8000/redoc
- ❤️ Health Check: http://localhost:8000/api/health
- 📁 Static Files: http://localhost:8000/files/<filename>

### Frontend Setup

```powershell
# Navigate to frontend directory
cd "c:\Users\mdame\Downloads\EduSphere\frontend"

# Install dependencies
npm install

# Run development server (with HMR)
npm run dev
```

**Frontend URL:**
- 🌐 Dev Server: http://localhost:5173 (auto-opens in browser)

### Production Build

```powershell
# Frontend production build
cd frontend
npm run build

# Preview production build
npm run preview
```

---

## 🔌 API Documentation

**EduChat** - AI learning assistant
- `POST /api/educhat/ask` - JSON: `{ "question": "..." }` - Simple 2-3 sentence responses

**EduPDF** - PDF analysis
- `POST /api/edupdf/analyze` - form-data: `file` (PDF), `summary_sentences` (optional, default 5)

**EduTube** - YouTube analysis  
- `POST /api/edutube/analyze` - JSON: `{ "url": "https://www.youtube.com/watch?v=..." }`

**EduExcel** - Spreadsheet generator
- `POST /api/eduexcel/generate` - form-data: `file` (CSV or JSON) - Returns `download_url` to `.xlsx`

**EduPresent** - Presentation generator
- `POST /api/edupresent/generate` - JSON: `{ "topic": "...", "content": "optional", "slides": 8 }` - Returns `download_url` to `.pptx`

**EduNotes** - Note-taking
- `POST /api/edunotes/generate` - JSON: `{ "topic": "...", "content": "..." }` - Returns structured notes with markdown

**EduChart** - Chart generator
- `POST /api/educhart/generate` - JSON: `{ "type": "bar/pie/line", "data": {...}, "title": "..." }` - Returns chart image URL

**EduDoc** - Document management
- `POST /api/edudoc/upload` - form-data: `file` - Upload document
- `POST /api/edudoc/resume/create` - JSON: Personal info - Generates professional resume

### Collaboration APIs

**Whiteboard** - AI-powered drawing
- `POST /api/whiteboard/sessions/create` - JSON: `{ "title": "..." }` - Create whiteboard session
- `POST /api/whiteboard/help` - JSON: `{ "image_data": "base64", "question": "..." }` - AI assistance
- `POST /api/whiteboard/solve` - JSON: `{ "text": "2x+3=7" }` - Solve math equations

**Attendance** - Facial recognition
- `POST /api/attendance/enroll` - form-data: `name`, `student_id`, `photo` - Enroll new face
- `POST /api/attendance/recognize` - form-data: `photo`, `auto_mark` (optional) - Recognize face (85% confidence, auto-marks attendance if enabled)
- `GET /api/attendance/monthly-stats?student_id=123` - Monthly attendance with graph data
- `GET /api/attendance/analytics` - Dashboard metrics (enrolled, auto check-ins, manual, recent)

**EduBlogs** - Professional networking
- `POST /api/blogs/posts` - JSON: `{ "title": "...", "content": "...", "hashtags": ["ai"] }` - Create post
- `POST /api/blogs/posts/{post_id}/like` - Like post
- `POST /api/blogs/posts/{post_id}/comment` - JSON: `{ "content": "..." }` - Add comment
- `POST /api/blogs/posts/{post_id}/share` - Share post
- `POST /api/blogs/connections/request` - JSON: `{ "target_user_id": "..." }` - Send connection request
- `GET /api/blogs/feed?user_id=123` - Personalized feed with engagement scoring

**EduTalk** - Messaging platform
- `POST /api/edutalk/messages/send` - JSON: `{ "sender_id": "...", "receiver_id": "...", "content": "...", "group_id": null }` - Send message
- `POST /api/edutalk/groups/create` - JSON: `{ "name": "...", "admin_id": "..." }` - Create group
- `POST /api/edutalk/files/upload` - form-data: `file`, `sender_id`, `receiver_id` - Upload file
- `POST /api/edutalk/messages/{msg_id}/reaction` - JSON: `{ "user_id": "...", "emoji": "👍" }` - Add reaction
- `POST /api/edutalk/status/create` - JSON: `{ "user_id": "...", "content": "...", "media_url": null }` - Post status (24h expiry)
- `POST /api/edutalk/calls/initiate` - JSON: `{ "caller_id": "...", "receiver_id": "...", "type": "video" }` - Start call

**EduMeet** - Video conferencing
- `POST /api/edumeet/rooms/create` - JSON: `{ "title": "...", "host_id": "..." }` - Create meeting room
- `POST /api/edumeet/rooms/{room_id}/attendance` - form-data: `photo`, `student_name` (optional) - Auto-mark attendance via facial recognition
- `GET /api/edumeet/rooms/{room_id}/attendance` - Get room attendance records
- WebSocket: `/ws/meet/{room_id}` - Real-time communication

### Creation & Design APIs

**Circuit** - Electronic circuit simulation
- `POST /api/circuit/create` - JSON: `{ "name": "...", "user_id": "..." }` - Create circuit
- `POST /api/circuit/{circuit_id}/component` - JSON: `{ "type": "resistor", "value": 100, "position": {...} }` - Add component
- `POST /api/circuit/{circuit_id}/simulate` - Analyze circuit (voltage, current, resistance)

**FocusAI** - Productivity tracking
- `POST /api/focus/session/start` - JSON: `{ "user_id": "...", "duration": 25, "blocked_apps": [...] }` - Start Pomodoro session
- `POST /api/focus/session/{session_id}/end` - JSON: `{ "completed": true, "distractions": 2 }` - End session
- `GET /api/focus/analytics?user_id=123` - Get productivity metrics

**EduVI** - AI image/video generation
- `POST /api/eduvi/image` - JSON: `{ "prompt": "...", "size": "1024x1024" }` - Generate image with DALL-E
- `POST /api/eduvi/video/project` - JSON: `{ "name": "...", "user_id": "..." }` - Create video project

**EduAir** - Air canvas
- `POST /api/eduair/draw/save` - JSON: `{ "user_id": "...", "strokes": [...], "landmarks": [...] }` - Save air drawing with MediaPipe landmarks

### Additional Tool APIs

**EduTutor** - Tutoring platform
- `POST /api/edututor/register` - JSON: `{ "name": "...", "subjects": [...], "rate": 50 }` - Register as tutor
- `POST /api/edututor/session/book` - JSON: `{ "tutor_id": "...", "student_id": "...", "datetime": "..." }` - Book session

**EduTrade** - Marketplace
- `POST /api/edutrade/list` - JSON: `{ "seller_id": "...", "title": "...", "price": 29.99, "category": "textbooks" }` - List item
- `POST /api/edutrade/order` - JSON: `{ "buyer_id": "...", "listing_id": "..." }` - Place order

**Internships** - Job portal
- `POST /api/eduintern/post` - JSON: `{ "company": "...", "title": "...", "description": "..." }` - Post internship
- `POST /api/eduintern/apply` - JSON: `{ "student_id": "...", "internship_id": "..." }` - Apply to internship

**EduLingo** - Language learning
- `POST /api/edulingo/vocab/add` - JSON: `{ "user_id": "...", "word": "hola", "translation": "hello", "language": "es" }` - Add vocabulary
- `POST /api/edulingo/grammar/check` - JSON: `{ "text": "...", "language": "es" }` - Check grammar
- `POST /api/edulingo/translate` - JSON: `{ "text": "...", "target_lang": "es" }` - Translate text

### EduNotes
- `POST /api/edunotes/generate`
  - form-data: `text` (optional), `file` (optional PDF)
  - Returns summary, notes, questions, plus a markdown `download_url`

### EduChart
- `POST /api/educhart/generate`
  - JSON: For bar/line: `{ "type": "bar", "series": [{"name":"A","x":[..],"y":[..]}] }`
  - JSON: For pie: `{ "type": "pie", "labels": [..], "values": [..] }`
  - JSON: For flow/mind: `{ "type": "flowchart"|"mindmap", "description": "line1\nline2..." }`
  - Returns `download_url` to PNG (charts) or .mmd Mermaid file (flow/mind)

### EduDoc
- `POST /api/edudoc/upload` (form-data: `file`) → stored and accessible via `/files`
- `GET /api/edudoc/list` → available files
- `POST /api/edudoc/resume` (form-data: `full_name`, `email`, `phone`, `summary`, `skills`, `experience`) → DOCX resume

### EduChat
- `POST /api/educhat/chat` (JSON: `{ "session_id": "abc", "message": "..." }`)
  - Uses OpenAI if `OPENAI_API_KEY` is set; otherwise falls back to summarizer-based reply
- `POST /api/educhat/clear` to reset a session

## Quick Start (Frontend – optional MVP UI)

```powershell
# From repo root
cd "c:\Users\mdame\Downloads\EduSphere\frontend"

# Install deps (Node.js 18+ recommended)
npm install

# Run dev server (proxy to backend enabled)
npm run dev
```

Open: `http://localhost:5173`

If you prefer not to use the Vite proxy, create `frontend/.env.local`:

```
VITE_API_BASE=http://localhost:8000
```

The UI will then call the backend at `VITE_API_BASE` directly.

## Notes
- If OCR is needed and Tesseract isn’t installed, EduPDF will try direct text extraction first and may return limited results.
- Optional LLM integration can be added later (e.g., via `OPENAI_API_KEY`) for richer Q&A.

## Next Steps
- Add a Vite React frontend with pages for PDF, YouTube, and Excel modules.
- Implement the remaining modules iteratively.
- Harden CORS, auth, persistence, and add proper logging/monitoring.
