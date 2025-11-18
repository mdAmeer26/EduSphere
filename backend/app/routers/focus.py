import os
import uuid
from typing import Any, Dict, List
from datetime import datetime, timedelta
import subprocess
import logging

from fastapi import APIRouter
from pydantic import BaseModel

from app.utils.storage import load_list, save_list

router = APIRouter()
logger = logging.getLogger(__name__)

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".."))
SESSIONS_STORE = os.path.join(ROOT, "uploads", "focus_sessions.json")
BLOCKLIST_STORE = os.path.join(ROOT, "uploads", "focus_blocklist.json")


class FocusSession(BaseModel):
    duration_minutes: int
    task: str
    block_apps: List[str] = []


class BlockApp(BaseModel):
    name: str
    path: str = ""


class BlockAppsRequest(BaseModel):
    apps: List[str]


@router.post("/session/start")
async def start_focus_session(req: FocusSession) -> Dict[str, Any]:
    """
    Start a focus session with Pomodoro timer and app blocking.
    """
    sessions = load_list(SESSIONS_STORE)
    
    session_id = str(uuid.uuid4())
    now = datetime.utcnow()
    end_time = now + timedelta(minutes=req.duration_minutes)
    
    session = {
        "id": session_id,
        "task": req.task,
        "duration_minutes": req.duration_minutes,
        "start_time": now.isoformat() + "Z",
        "end_time": end_time.isoformat() + "Z",
        "blocked_apps": req.block_apps,
        "status": "active",
        "productivity_score": 0,
        "breaks_taken": 0,
        "distractions": 0,
        "completion_percentage": 0,
    }
    sessions.append(session)
    save_list(SESSIONS_STORE, sessions)
    
    return {
        "ok": True,
        "session": session,
        "note": "App blocking requires OS-level integration (Windows: taskkill, macOS: NSRunningApplication)"
    }


@router.post("/session/{session_id}/stop")
async def stop_focus_session(session_id: str) -> Dict[str, Any]:
    sessions = load_list(SESSIONS_STORE)
    session = next((s for s in sessions if s["id"] == session_id), None)
    
    if not session:
        return {"ok": False, "error": "Session not found"}
    
    session["status"] = "completed"
    session["actual_end_time"] = datetime.utcnow().isoformat() + "Z"
    save_list(SESSIONS_STORE, sessions)
    
    return {"ok": True, "session": session}


@router.get("/session/list")
async def list_focus_sessions() -> Dict[str, Any]:
    sessions = load_list(SESSIONS_STORE)
    
    # Calculate statistics
    completed = [s for s in sessions if s.get("status") == "completed"]
    total_minutes = sum(s.get("duration_minutes", 0) for s in completed)
    
    return {
        "count": len(sessions),
        "sessions": sessions,
        "stats": {
            "total_sessions": len(sessions),
            "completed_sessions": len(completed),
            "total_focus_minutes": total_minutes,
        }
    }


@router.post("/blocklist/add")
async def add_blocked_app(req: BlockApp) -> Dict[str, Any]:
    """
    Add app to default blocklist.
    """
    blocklist = load_list(BLOCKLIST_STORE)
    
    app = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "path": req.path,
        "added_at": datetime.utcnow().isoformat() + "Z",
    }
    blocklist.append(app)
    save_list(BLOCKLIST_STORE, blocklist)
    
    return {"ok": True, "app": app}


@router.get("/blocklist")
async def get_blocklist() -> Dict[str, Any]:
    blocklist = load_list(BLOCKLIST_STORE)
    return {"count": len(blocklist), "apps": blocklist}


@router.get("/pomodoro/settings")
async def get_pomodoro_settings() -> Dict[str, Any]:
    """
    Returns recommended Pomodoro technique settings.
    """
    return {
        "ok": True,
        "settings": {
            "focus_duration": 25,  # minutes
            "short_break": 5,
            "long_break": 15,
            "sessions_before_long_break": 4,
        },
        "tips": [
            "Eliminate distractions before starting",
            "Use a physical task list",
            "Take breaks away from screen",
            "Stay hydrated during focus sessions"
        ]
    }


@router.post("/block-apps")
async def block_apps(request: BlockAppsRequest):
    """
    Kill processes for blocked apps during focus mode
    """
    blocked_count = 0
    errors = []
    
    # Whitelist - never kill these system processes
    whitelist = ['system', 'svchost', 'explorer', 'winlogon', 'csrss', 'services', 
                 'lsass', 'smss', 'dwm', 'python', 'pythonw', 'uvicorn']
    
    for app in request.apps:
        app_lower = app.lower().strip()
        
        # Skip whitelisted processes
        if app_lower in whitelist:
            continue
            
        try:
            # Try to kill the process using PowerShell
            # This works for process names like "chrome", "firefox", "discord"
            cmd = f'Get-Process -Name "{app_lower}" -ErrorAction SilentlyContinue | Stop-Process -Force'
            result = subprocess.run(
                ['powershell', '-Command', cmd],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                blocked_count += 1
                logger.info(f"Blocked app: {app_lower}")
            else:
                # Process might not be running, which is fine
                logger.debug(f"Process not found or already closed: {app_lower}")
                
        except subprocess.TimeoutExpired:
            errors.append(f"Timeout blocking {app}")
        except Exception as e:
            errors.append(f"Error blocking {app}: {str(e)}")
    
    return {
        "ok": True,
        "blocked": blocked_count,
        "requested": len(request.apps),
        "errors": errors if errors else None
    }


@router.get("/running-apps")
async def get_running_apps():
    """
    Get list of currently running applications
    """
    try:
        # Get all processes with window titles (actual apps, not system processes)
        cmd = 'Get-Process | Where-Object {$_.MainWindowTitle -ne ""} | Select-Object ProcessName -Unique | ConvertTo-Json'
        result = subprocess.run(
            ['powershell', '-Command', cmd],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0 and result.stdout:
            import json
            processes = json.loads(result.stdout)
            if isinstance(processes, list):
                apps = [p.get('ProcessName', '').lower() for p in processes if p.get('ProcessName')]
            else:
                apps = [processes.get('ProcessName', '').lower()] if processes.get('ProcessName') else []
            
            return {
                "ok": True,
                "apps": sorted(list(set(apps)))
            }
        else:
            return {"ok": False, "error": "Failed to get running apps"}
            
    except Exception as e:
        logger.error(f"Error getting running apps: {str(e)}")
        return {"ok": False, "error": str(e)}
