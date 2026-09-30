import os
import uuid
from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, Form, UploadFile, File, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.utils.storage import STORAGE_ROOT, load_list, save_list

router = APIRouter()

ROOT = os.path.dirname(STORAGE_ROOT)
CHATS_STORE = os.path.join(ROOT, "uploads", "edutalk_chats.json")
GROUPS_STORE = os.path.join(ROOT, "uploads", "edutalk_groups.json")
CHANNELS_STORE = os.path.join(ROOT, "uploads", "edutalk_channels.json")
CONTACTS_STORE = os.path.join(ROOT, "uploads", "edutalk_contacts.json")
MESSAGES_STORE = os.path.join(ROOT, "uploads", "edutalk_messages.json")
STATUS_STORE = os.path.join(ROOT, "uploads", "edutalk_status.json")
FILES_DIR = os.path.join(ROOT, "uploads", "edutalk_files")
os.makedirs(FILES_DIR, exist_ok=True)


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    icon: Optional[str] = "👥"
    creator: str
    members: Optional[List[str]] = []
    settings: Optional[Dict[str, Any]] = {}


class ChannelCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    icon: Optional[str] = "📢"
    creator: str
    settings: Optional[Dict[str, Any]] = {}


class MessageSend(BaseModel):
    chat_id: str
    chat_type: str  # chat, group, channel
    message: Dict[str, Any]


class MessagePost(BaseModel):
    group_id: str
    user: str
    content: str
    message_type: str = "text"  # text, voice, video


class StatusUpdate(BaseModel):
    user: str
    content: str
    media_url: str = ""


# ============= Chats =============
@router.get("/chats/list")
async def list_chats() -> Dict[str, Any]:
    """List all individual chats"""
    chats = load_list(CHATS_STORE)
    return {"chats": chats}


@router.post("/chat/create")
async def create_chat(name: str = Form(...), avatar: str = Form("👤")) -> Dict[str, Any]:
    """Create a new individual chat"""
    chats = load_list(CHATS_STORE)
    chat = {
        "id": str(uuid.uuid4()),
        "name": name,
        "avatar": avatar,
        "online": False,
        "lastMessage": None,
        "unread": 0,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    chats.append(chat)
    save_list(CHATS_STORE, chats)
    return {"ok": True, "chat": chat}


# ============= Contacts =============
@router.get("/contacts/list")
async def list_contacts() -> Dict[str, Any]:
    """List all contacts"""
    contacts = load_list(CONTACTS_STORE)
    
    # Add some default contacts if empty
    if not contacts:
        default_contacts = [
            {"id": str(uuid.uuid4()), "name": "John Doe", "avatar": "👨", "status": "Available", "online": True},
            {"id": str(uuid.uuid4()), "name": "Jane Smith", "avatar": "👩", "status": "Busy", "online": False},
            {"id": str(uuid.uuid4()), "name": "Mike Wilson", "avatar": "👨‍💼", "status": "In a meeting", "online": True},
            {"id": str(uuid.uuid4()), "name": "Sarah Johnson", "avatar": "👩‍🎓", "status": "Studying", "online": False},
            {"id": str(uuid.uuid4()), "name": "Alex Brown", "avatar": "👨‍💻", "status": "Coding", "online": True}
        ]
        save_list(CONTACTS_STORE, default_contacts)
        contacts = default_contacts
    
    return {"contacts": contacts}


# ============= Groups =============
@router.post("/group/create")
async def create_group(req: GroupCreate) -> Dict[str, Any]:
    """Create a new group"""
    groups = load_list(GROUPS_STORE)
    group = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "description": req.description,
        "icon": req.icon,
        "creator": req.creator,
        "members": req.members if req.members else [req.creator],
        "admins": [req.creator],
        "settings": req.settings,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "lastMessage": None
    }
    groups.append(group)
    save_list(GROUPS_STORE, groups)
    return {"ok": True, "group": group}


@router.post("/group/add-member")
async def add_member(group_id: str = Form(...), user: str = Form(...)) -> Dict[str, Any]:
    """Add member to group"""
    groups = load_list(GROUPS_STORE)
    group = next((g for g in groups if g["id"] == group_id), None)
    if not group:
        return {"error": "Group not found"}
    
    if user not in group.get("members", []):
        group["members"].append(user)
        save_list(GROUPS_STORE, groups)
    
    return {"ok": True, "group": group}


@router.get("/groups/list")
async def list_groups(user: str = None) -> Dict[str, Any]:
    """List all groups"""
    groups = load_list(GROUPS_STORE)
    if user:
        groups = [g for g in groups if user in g.get("members", [])]
    return {"groups": groups}


# ============= Channels =============
@router.post("/channel/create")
async def create_channel(req: ChannelCreate) -> Dict[str, Any]:
    """Create a new channel"""
    channels = load_list(CHANNELS_STORE)
    channel = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "description": req.description,
        "icon": req.icon,
        "creator": req.creator,
        "admins": [req.creator],
        "subscribers": [req.creator],
        "settings": req.settings,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "lastMessage": None
    }
    channels.append(channel)
    save_list(CHANNELS_STORE, channels)
    return {"ok": True, "channel": channel}


@router.get("/channels/list")
async def list_channels() -> Dict[str, Any]:
    """List all channels"""
    channels = load_list(CHANNELS_STORE)
    return {"channels": channels}


# ============= Messages =============
@router.post("/message/send")
async def send_message_new(req: MessageSend) -> Dict[str, Any]:
    """Send a message to chat/group/channel"""
    messages = load_list(MESSAGES_STORE)
    
    # Create message key based on chat type and id
    message_key = f"{req.chat_type}_{req.chat_id}"
    
    # Get or create message list for this chat
    if message_key not in messages:
        messages[message_key] = []
    
    messages[message_key].append(req.message)
    save_list(MESSAGES_STORE, messages)
    
    # Update last message in chat/group/channel
    if req.chat_type == "chat":
        chats = load_list(CHATS_STORE)
        chat = next((c for c in chats if c["id"] == req.chat_id), None)
        if chat:
            chat["lastMessage"] = req.message
            save_list(CHATS_STORE, chats)
    elif req.chat_type == "group":
        groups = load_list(GROUPS_STORE)
        group = next((g for g in groups if g["id"] == req.chat_id), None)
        if group:
            group["lastMessage"] = req.message
            save_list(GROUPS_STORE, groups)
    elif req.chat_type == "channel":
        channels = load_list(CHANNELS_STORE)
        channel = next((c for c in channels if c["id"] == req.chat_id), None)
        if channel:
            channel["lastMessage"] = req.message
            save_list(CHANNELS_STORE, channels)
    
    return {"ok": True, "message": req.message}


@router.get("/messages/{chat_type}/{chat_id}")
async def get_messages(chat_type: str, chat_id: str) -> Dict[str, Any]:
    """Get messages for a chat/group/channel"""
    messages = load_list(MESSAGES_STORE)
    message_key = f"{chat_type}_{chat_id}"
    chat_messages = messages.get(message_key, [])
    return {"messages": chat_messages}


# ============= Legacy Endpoints (for backward compatibility) =============

@router.post("/message/legacy-send")
async def send_message_legacy(req: MessagePost) -> Dict[str, Any]:
    """Legacy endpoint for sending messages (backward compatibility)"""
    messages = load_list(MESSAGES_STORE)
    
    # Simple content filtering
    blocked_words = ["spam", "scam", "hack"]
    content_lower = req.content.lower()
    if any(word in content_lower for word in blocked_words):
        return {"error": "Message blocked by content filter"}
    
    msg = {
        "id": str(uuid.uuid4()),
        "group_id": req.group_id,
        "user": req.user,
        "content": req.content,
        "message_type": req.message_type,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "read_by": [req.user],
        "reactions": {},
    }
    messages.append(msg)
    save_list(MESSAGES_STORE, messages)
    return {"ok": True, "message": msg}


@router.post("/message/upload")
async def upload_file(group_id: str = Form(...), user: str = Form(...), file: UploadFile = File(...)) -> Dict[str, Any]:
    """Upload and share files in chat."""
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename or "")[1] or ".bin"
    file_path = os.path.join(FILES_DIR, f"{file_id}{ext}")
    
    data = await file.read()
    with open(file_path, 'wb') as f:
        f.write(data)
    
    messages = load_list(MESSAGES_STORE)
    msg = {
        "id": str(uuid.uuid4()),
        "group_id": group_id,
        "user": user,
        "content": f"[File: {file.filename}]",
        "message_type": "file",
        "file_url": f"/files/edutalk_files/{file_id}{ext}",
        "file_name": file.filename,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "read_by": [user],
    }
    messages.append(msg)
    save_list(MESSAGES_STORE, messages)
    return {"ok": True, "message": msg}


@router.get("/message/list-legacy")
async def list_messages_legacy(group_id: str, limit: int = 100) -> Dict[str, Any]:
    """Legacy endpoint for listing messages"""
    messages = load_list(MESSAGES_STORE)
    group_msgs = [m for m in messages if m.get("group_id") == group_id]
    group_msgs.sort(key=lambda m: m.get("timestamp", ""))
    return {"count": len(group_msgs), "messages": group_msgs[-limit:]}


@router.post("/message/read")
async def mark_read(message_id: str = Form(...), user: str = Form(...)) -> Dict[str, Any]:
    messages = load_list(MESSAGES_STORE)
    msg = next((m for m in messages if m["id"] == message_id), None)
    if not msg:
        return {"error": "Message not found"}
    
    read_by = msg.get("read_by", [])
    if user not in read_by:
        read_by.append(user)
        msg["read_by"] = read_by
        save_list(MESSAGES_STORE, messages)
    
    return {"ok": True}


@router.post("/message/react")
async def add_reaction(message_id: str = Form(...), user: str = Form(...), emoji: str = Form(...)) -> Dict[str, Any]:
    messages = load_list(MESSAGES_STORE)
    msg = next((m for m in messages if m["id"] == message_id), None)
    if not msg:
        return {"error": "Message not found"}
    
    reactions = msg.get("reactions", {})
    if emoji not in reactions:
        reactions[emoji] = []
    
    if user not in reactions[emoji]:
        reactions[emoji].append(user)
    
    msg["reactions"] = reactions
    save_list(MESSAGES_STORE, messages)
    return {"ok": True, "reactions": reactions}


@router.post("/status/create")
async def create_status(req: StatusUpdate) -> Dict[str, Any]:
    """Create WhatsApp-style status update."""
    statuses = load_list(STATUS_STORE)
    status = {
        "id": str(uuid.uuid4()),
        "user": req.user,
        "content": req.content,
        "media_url": req.media_url,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "expires_at": (datetime.utcnow().replace(hour=23, minute=59, second=59)).isoformat() + "Z",
        "views": 0,
        "viewed_by": [],
    }
    statuses.append(status)
    save_list(STATUS_STORE, statuses)
    return {"ok": True, "status": status}


@router.get("/status/list")
async def list_statuses(user: str = None) -> Dict[str, Any]:
    """Get status updates (expire after 24h)."""
    statuses = load_list(STATUS_STORE)
    now = datetime.utcnow()
    
    # Filter out expired statuses
    active = []
    for s in statuses:
        try:
            expires = datetime.fromisoformat(s.get("expires_at", "").replace("Z", ""))
            if expires > now:
                if user is None or s.get("user") == user:
                    active.append(s)
        except:
            pass
    
    return {"count": len(active), "statuses": active}


@router.post("/call/initiate")
async def initiate_call(group_id: str = Form(...), user: str = Form(...), call_type: str = Form("voice")) -> Dict[str, Any]:
    """Initiate voice/video call."""
    call = {
        "id": str(uuid.uuid4()),
        "group_id": group_id,
        "caller": user,
        "call_type": call_type,  # voice or video
        "status": "ringing",
        "started_at": datetime.utcnow().isoformat() + "Z",
    }
    
    # Save as message
    messages = load_list(MESSAGES_STORE)
    msg = {
        "id": str(uuid.uuid4()),
        "group_id": group_id,
        "user": user,
        "content": f"[{call_type.title()} Call]",
        "message_type": "call",
        "call_info": call,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
    messages.append(msg)
    save_list(MESSAGES_STORE, messages)
    
    return {"ok": True, "call": call, "note": "WebRTC implementation needed for actual calling"}

