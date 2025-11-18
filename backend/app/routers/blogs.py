import os
import uuid
from typing import Any, Dict
from datetime import datetime

from fastapi import APIRouter, Form
from pydantic import BaseModel

from app.utils.storage import load_list, save_list

router = APIRouter()

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".."))
STORE = os.path.join(ROOT, "uploads", "blogs.json")
USERS_STORE = os.path.join(ROOT, "uploads", "blogs_users.json")
CONNECTIONS_STORE = os.path.join(ROOT, "uploads", "blogs_connections.json")
ENDORSEMENTS_STORE = os.path.join(ROOT, "uploads", "blogs_endorsements.json")
SAVED_POSTS_STORE = os.path.join(ROOT, "uploads", "blogs_saved.json")
NOTIFICATIONS_STORE = os.path.join(ROOT, "uploads", "blogs_notifications.json")
JOBS_STORE = os.path.join(ROOT, "uploads", "blogs_jobs.json")


class UserProfile(BaseModel):
    user_id: str
    name: str
    headline: str = "Student"
    bio: str = ""
    avatar: str = ""
    skills: list[str] = []
    experience: list[dict] = []
    education: list[dict] = []
    location: str = ""
    website: str = ""
    
class PostCreate(BaseModel):
    title: str
    content: str
    author: str
    media_urls: list[str] = []
    post_type: str = "post"  # post, article, poll, job
    poll_options: list[str] = []
    tags: list[str] = []

class CommentCreate(BaseModel):
    post_id: str
    author: str
    content: str
    parent_id: str = None  # For nested replies

class ConnectionRequest(BaseModel):
    from_user: str
    to_user: str
    message: str = ""

class EndorsementRequest(BaseModel):
    from_user: str
    to_user: str
    skill: str

class ReactionRequest(BaseModel):
    post_id: str
    user: str
    reaction_type: str  # like, celebrate, support, love, insightful, curious


@router.post("/create")
async def create_post(req: PostCreate) -> Dict[str, Any]:
    posts = load_list(STORE)
    
    # Extract hashtags and mentions
    hashtags = [tag.strip('#') for tag in req.content.split() if tag.startswith('#')]
    mentions = [tag.strip('@') for tag in req.content.split() if tag.startswith('@')]
    
    post = {
        "id": str(uuid.uuid4()),
        "title": req.title,
        "content": req.content,
        "author": req.author,
        "post_type": req.post_type,
        "media_urls": req.media_urls,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "likes": 0,
        "shares": 0,
        "views": 0,
        "comments": [],
        "reactions": {},  # {user_id: reaction_type}
        "liked_by": [],
        "shared_by": [],
        "saved_by": [],
        "hashtags": hashtags,
        "mentions": mentions,
        "tags": req.tags,
        "engagement_score": 0,
        "is_promoted": False,
    }
    
    # Poll-specific fields
    if req.post_type == "poll" and req.poll_options:
        post["poll_options"] = req.poll_options
        post["poll_votes"] = {option: [] for option in req.poll_options}
    
    posts.append(post)
    save_list(STORE, posts)
    
    # Create notifications for mentions
    _create_notification(mentions, f"{req.author} mentioned you in a post", post["id"])
    
    return {"ok": True, "post": post}


@router.get("/list")
async def list_posts() -> Dict[str, Any]:
    posts = load_list(STORE)
    # Sort by engagement: likes + comments + shares
    for p in posts:
        p["engagement"] = p.get("likes", 0) + len(p.get("comments", [])) + p.get("shares", 0)
    posts.sort(key=lambda p: (p.get("engagement", 0), p.get("created_at", "")), reverse=True)
    return {"count": len(posts), "posts": posts}


@router.post("/like")
async def like_post(post_id: str = Form(...), user: str = Form(...)) -> Dict[str, Any]:
    posts = load_list(STORE)
    post = next((p for p in posts if p["id"] == post_id), None)
    if not post:
        return {"error": "Post not found"}
    
    liked_by = post.get("liked_by", [])
    if user in liked_by:
        # Unlike
        liked_by.remove(user)
        post["likes"] = max(0, post.get("likes", 0) - 1)
        action = "unliked"
    else:
        # Like
        liked_by.append(user)
        post["likes"] = post.get("likes", 0) + 1
        action = "liked"
    
    post["liked_by"] = liked_by
    save_list(STORE, posts)
    return {"ok": True, "action": action, "likes": post["likes"]}


@router.post("/comment")
async def add_comment(req: CommentCreate) -> Dict[str, Any]:
    posts = load_list(STORE)
    post = next((p for p in posts if p["id"] == req.post_id), None)
    if not post:
        return {"error": "Post not found"}
    
    comment = {
        "id": str(uuid.uuid4()),
        "author": req.author,
        "content": req.content,
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    
    if "comments" not in post:
        post["comments"] = []
    post["comments"].append(comment)
    save_list(STORE, posts)
    return {"ok": True, "comment": comment}


@router.post("/share")
async def share_post(post_id: str = Form(...), user: str = Form(...)) -> Dict[str, Any]:
    posts = load_list(STORE)
    post = next((p for p in posts if p["id"] == post_id), None)
    if not post:
        return {"error": "Post not found"}
    
    post["shares"] = post.get("shares", 0) + 1
    save_list(STORE, posts)
    
    # Create a share post
    share_post = {
        "id": str(uuid.uuid4()),
        "title": f"Shared: {post['title']}",
        "content": post["content"],
        "author": user,
        "original_author": post["author"],
        "original_post_id": post_id,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "likes": 0,
        "shares": 0,
        "comments": [],
        "liked_by": [],
        "is_share": True,
    }
    posts.append(share_post)
    save_list(STORE, posts)
    
    return {"ok": True, "shares": post["shares"], "share_post": share_post}


@router.post("/connection/request")
async def request_connection(req: ConnectionRequest) -> Dict[str, Any]:
    connections = load_list(CONNECTIONS_STORE)
    
    # Check if already connected
    existing = next((c for c in connections if 
                    (c["from_user"] == req.from_user and c["to_user"] == req.to_user) or
                    (c["from_user"] == req.to_user and c["to_user"] == req.from_user)), None)
    
    if existing:
        return {"error": "Connection already exists or pending"}
    
    connection = {
        "id": str(uuid.uuid4()),
        "from_user": req.from_user,
        "to_user": req.to_user,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    connections.append(connection)
    save_list(CONNECTIONS_STORE, connections)
    return {"ok": True, "connection": connection}


@router.post("/connection/accept")
async def accept_connection(connection_id: str = Form(...)) -> Dict[str, Any]:
    connections = load_list(CONNECTIONS_STORE)
    conn = next((c for c in connections if c["id"] == connection_id), None)
    if not conn:
        return {"error": "Connection not found"}
    
    conn["status"] = "connected"
    conn["accepted_at"] = datetime.utcnow().isoformat() + "Z"
    save_list(CONNECTIONS_STORE, connections)
    return {"ok": True, "connection": conn}


@router.get("/connections")
async def get_connections(user: str) -> Dict[str, Any]:
    connections = load_list(CONNECTIONS_STORE)
    user_connections = [c for c in connections if 
                       (c["from_user"] == user or c["to_user"] == user) and 
                       c.get("status") == "connected"]
    
    pending = [c for c in connections if c["to_user"] == user and c.get("status") == "pending"]
    
    return {
        "connections": user_connections,
        "count": len(user_connections),
        "pending": pending,
        "pending_count": len(pending)
    }


@router.get("/feed")
async def get_feed(user: str = None) -> Dict[str, Any]:
    """Get personalized feed based on connections and engagement."""
    posts = load_list(STORE)
    connections = load_list(CONNECTIONS_STORE)
    
    if user:
        # Get connected users
        connected_users = set()
        for c in connections:
            if c.get("status") == "connected":
                if c["from_user"] == user:
                    connected_users.add(c["to_user"])
                elif c["to_user"] == user:
                    connected_users.add(c["from_user"])
        
        # Prioritize posts from connections
        for p in posts:
            p["priority"] = 0
            if p.get("author") in connected_users:
                p["priority"] = 1000
            p["engagement"] = p.get("likes", 0) + len(p.get("comments", [])) * 2 + p.get("shares", 0) * 3
            p["score"] = p["priority"] + p["engagement"]
    else:
        # Public feed - sort by engagement
        for p in posts:
            p["engagement"] = p.get("likes", 0) + len(p.get("comments", [])) * 2 + p.get("shares", 0) * 3
            p["score"] = p["engagement"]
    
    posts.sort(key=lambda p: (p.get("score", 0), p.get("created_at", "")), reverse=True)
    
    return {"count": len(posts), "posts": posts[:50]}  # Top 50 posts


@router.post("/profile/create")
async def create_profile(req: UserProfile) -> Dict[str, Any]:
    """Create or update user profile."""
    users = load_list(USERS_STORE)
    
    # Check if profile exists
    existing = next((u for u in users if u["user_id"] == req.user_id), None)
    
    profile = {
        "user_id": req.user_id,
        "name": req.name,
        "headline": req.headline,
        "bio": req.bio,
        "avatar": req.avatar,
        "skills": req.skills,
        "experience": req.experience,
        "education": req.education,
        "location": req.location,
        "website": req.website,
        "created_at": existing["created_at"] if existing else datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "followers": existing.get("followers", 0) if existing else 0,
        "following": existing.get("following", 0) if existing else 0,
        "posts_count": existing.get("posts_count", 0) if existing else 0,
    }
    
    if existing:
        users.remove(existing)
    users.append(profile)
    save_list(USERS_STORE, users)
    
    return {"ok": True, "profile": profile}


@router.get("/profile/{user_id}")
async def get_profile(user_id: str) -> Dict[str, Any]:
    """Get user profile with stats."""
    users = load_list(USERS_STORE)
    profile = next((u for u in users if u["user_id"] == user_id), None)
    
    if not profile:
        return {"error": "Profile not found"}
    
    # Get stats
    posts = load_list(STORE)
    user_posts = [p for p in posts if p.get("author") == user_id]
    
    connections = load_list(CONNECTIONS_STORE)
    user_connections = [c for c in connections if 
                       (c["from_user"] == user_id or c["to_user"] == user_id) and 
                       c.get("status") == "connected"]
    
    endorsements = load_list(ENDORSEMENTS_STORE)
    user_endorsements = [e for e in endorsements if e["to_user"] == user_id]
    
    # Group endorsements by skill
    skills_endorsements = {}
    for e in user_endorsements:
        skill = e["skill"]
        if skill not in skills_endorsements:
            skills_endorsements[skill] = []
        skills_endorsements[skill].append(e["from_user"])
    
    profile["stats"] = {
        "posts": len(user_posts),
        "connections": len(user_connections),
        "endorsements": len(user_endorsements),
        "skills_endorsements": skills_endorsements,
    }
    
    return {"ok": True, "profile": profile}


@router.post("/endorse")
async def endorse_skill(req: EndorsementRequest) -> Dict[str, Any]:
    """Endorse a user's skill."""
    endorsements = load_list(ENDORSEMENTS_STORE)
    
    # Check if already endorsed
    existing = next((e for e in endorsements if 
                    e["from_user"] == req.from_user and 
                    e["to_user"] == req.to_user and 
                    e["skill"] == req.skill), None)
    
    if existing:
        return {"error": "Already endorsed this skill"}
    
    endorsement = {
        "id": str(uuid.uuid4()),
        "from_user": req.from_user,
        "to_user": req.to_user,
        "skill": req.skill,
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    
    endorsements.append(endorsement)
    save_list(ENDORSEMENTS_STORE, endorsements)
    
    # Create notification
    _create_notification([req.to_user], f"{req.from_user} endorsed your skill: {req.skill}", None)
    
    return {"ok": True, "endorsement": endorsement}


@router.post("/reaction")
async def add_reaction(req: ReactionRequest) -> Dict[str, Any]:
    """Add reaction to post (like, celebrate, support, love, insightful, curious)."""
    posts = load_list(STORE)
    post = next((p for p in posts if p["id"] == req.post_id), None)
    
    if not post:
        return {"error": "Post not found"}
    
    reactions = post.get("reactions", {})
    
    # Toggle reaction
    if req.user in reactions and reactions[req.user] == req.reaction_type:
        del reactions[req.user]
        action = "removed"
    else:
        reactions[req.user] = req.reaction_type
        action = "added"
    
    post["reactions"] = reactions
    
    # Update likes count for compatibility
    post["likes"] = len(reactions)
    
    save_list(STORE, posts)
    
    # Count reactions by type
    reaction_counts = {}
    for reaction in reactions.values():
        reaction_counts[reaction] = reaction_counts.get(reaction, 0) + 1
    
    return {
        "ok": True, 
        "action": action, 
        "reaction_counts": reaction_counts,
        "total": len(reactions)
    }


@router.post("/poll/vote")
async def vote_poll(post_id: str = Form(...), user: str = Form(...), option: str = Form(...)) -> Dict[str, Any]:
    """Vote on a poll."""
    posts = load_list(STORE)
    post = next((p for p in posts if p["id"] == post_id), None)
    
    if not post or post.get("post_type") != "poll":
        return {"error": "Poll not found"}
    
    poll_votes = post.get("poll_votes", {})
    
    # Remove previous vote if exists
    for opt, voters in poll_votes.items():
        if user in voters:
            voters.remove(user)
    
    # Add new vote
    if option in poll_votes:
        poll_votes[option].append(user)
    
    post["poll_votes"] = poll_votes
    save_list(STORE, posts)
    
    # Calculate percentages
    total_votes = sum(len(voters) for voters in poll_votes.values())
    results = {}
    for opt, voters in poll_votes.items():
        results[opt] = {
            "votes": len(voters),
            "percentage": (len(voters) / total_votes * 100) if total_votes > 0 else 0
        }
    
    return {"ok": True, "results": results, "total_votes": total_votes}


@router.post("/save")
async def save_post(post_id: str = Form(...), user: str = Form(...)) -> Dict[str, Any]:
    """Save/unsave post."""
    saved = load_list(SAVED_POSTS_STORE)
    
    existing = next((s for s in saved if s["user"] == user and s["post_id"] == post_id), None)
    
    if existing:
        saved.remove(existing)
        save_list(SAVED_POSTS_STORE, saved)
        return {"ok": True, "action": "unsaved"}
    
    saved.append({
        "id": str(uuid.uuid4()),
        "user": user,
        "post_id": post_id,
        "saved_at": datetime.utcnow().isoformat() + "Z",
    })
    save_list(SAVED_POSTS_STORE, saved)
    
    return {"ok": True, "action": "saved"}


@router.get("/saved/{user}")
async def get_saved_posts(user: str) -> Dict[str, Any]:
    """Get user's saved posts."""
    saved = load_list(SAVED_POSTS_STORE)
    user_saved = [s for s in saved if s["user"] == user]
    
    posts = load_list(STORE)
    saved_posts = [p for p in posts if p["id"] in [s["post_id"] for s in user_saved]]
    
    return {"count": len(saved_posts), "posts": saved_posts}


@router.post("/job/post")
async def post_job(title: str = Form(...), company: str = Form(...), 
                   description: str = Form(...), location: str = Form(...),
                   type: str = Form(...), posted_by: str = Form(...)) -> Dict[str, Any]:
    """Post a job listing."""
    jobs = load_list(JOBS_STORE)
    
    job = {
        "id": str(uuid.uuid4()),
        "title": title,
        "company": company,
        "description": description,
        "location": location,
        "type": type,  # full-time, part-time, internship, contract
        "posted_by": posted_by,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "applications": [],
        "views": 0,
    }
    
    jobs.append(job)
    save_list(JOBS_STORE, jobs)
    
    return {"ok": True, "job": job}


@router.get("/jobs")
async def list_jobs(type: str = None, location: str = None) -> Dict[str, Any]:
    """List job postings with filters."""
    jobs = load_list(JOBS_STORE)
    
    if type:
        jobs = [j for j in jobs if j.get("type") == type]
    if location:
        jobs = [j for j in jobs if location.lower() in j.get("location", "").lower()]
    
    jobs.sort(key=lambda j: j.get("created_at", ""), reverse=True)
    
    return {"count": len(jobs), "jobs": jobs}


@router.post("/job/apply")
async def apply_job(job_id: str = Form(...), user: str = Form(...), 
                    message: str = Form("")) -> Dict[str, Any]:
    """Apply to a job."""
    jobs = load_list(JOBS_STORE)
    job = next((j for j in jobs if j["id"] == job_id), None)
    
    if not job:
        return {"error": "Job not found"}
    
    applications = job.get("applications", [])
    if any(a["user"] == user for a in applications):
        return {"error": "Already applied"}
    
    application = {
        "id": str(uuid.uuid4()),
        "user": user,
        "message": message,
        "applied_at": datetime.utcnow().isoformat() + "Z",
        "status": "pending",
    }
    
    applications.append(application)
    job["applications"] = applications
    save_list(JOBS_STORE, jobs)
    
    # Notify job poster
    _create_notification([job["posted_by"]], f"{user} applied to your job: {job['title']}", job_id)
    
    return {"ok": True, "application": application}


@router.get("/notifications/{user}")
async def get_notifications(user: str) -> Dict[str, Any]:
    """Get user notifications."""
    notifications = load_list(NOTIFICATIONS_STORE)
    user_notifs = [n for n in notifications if n["user"] == user]
    user_notifs.sort(key=lambda n: n.get("created_at", ""), reverse=True)
    
    unread_count = len([n for n in user_notifs if not n.get("read", False)])
    
    return {
        "count": len(user_notifs),
        "unread": unread_count,
        "notifications": user_notifs[:50]
    }


@router.post("/notifications/read")
async def mark_notification_read(notification_id: str = Form(...)) -> Dict[str, Any]:
    """Mark notification as read."""
    notifications = load_list(NOTIFICATIONS_STORE)
    notif = next((n for n in notifications if n["id"] == notification_id), None)
    
    if not notif:
        return {"error": "Notification not found"}
    
    notif["read"] = True
    notif["read_at"] = datetime.utcnow().isoformat() + "Z"
    save_list(NOTIFICATIONS_STORE, notifications)
    
    return {"ok": True}


@router.get("/search")
async def search(q: str, type: str = "all") -> Dict[str, Any]:
    """Search posts, people, jobs."""
    results = {}
    q_lower = q.lower()
    
    if type in ["all", "posts"]:
        posts = load_list(STORE)
        results["posts"] = [p for p in posts if 
                           q_lower in p.get("title", "").lower() or 
                           q_lower in p.get("content", "").lower() or
                           any(q_lower in tag.lower() for tag in p.get("hashtags", []))]
    
    if type in ["all", "people"]:
        users = load_list(USERS_STORE)
        results["people"] = [u for u in users if 
                            q_lower in u.get("name", "").lower() or
                            q_lower in u.get("headline", "").lower() or
                            any(q_lower in skill.lower() for skill in u.get("skills", []))]
    
    if type in ["all", "jobs"]:
        jobs = load_list(JOBS_STORE)
        results["jobs"] = [j for j in jobs if 
                          q_lower in j.get("title", "").lower() or
                          q_lower in j.get("company", "").lower()]
    
    return results


def _create_notification(users: list, message: str, ref_id: str = None):
    """Helper to create notifications."""
    notifications = load_list(NOTIFICATIONS_STORE)
    
    for user in users:
        notifications.append({
            "id": str(uuid.uuid4()),
            "user": user,
            "message": message,
            "ref_id": ref_id,
            "read": False,
            "created_at": datetime.utcnow().isoformat() + "Z",
        })
    
    save_list(NOTIFICATIONS_STORE, notifications)
