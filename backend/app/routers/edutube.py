import os
import uuid
from typing import Any, Dict
from fastapi import APIRouter
from pydantic import BaseModel
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

from app.utils.summarizer import summarize_text, generate_notes, generate_questions

router = APIRouter()


class YouTubeAnalyzeRequest(BaseModel):
    url: str


def extract_video_id(url: str) -> str | None:
    import re
    patterns = [
        r"(?:v=|/videos/|embed/|youtu\.be/)([\w-]{11})",
        r"youtube\.com/shorts/([\w-]{11})",
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return None


@router.post("/analyze")
async def analyze(req: YouTubeAnalyzeRequest) -> Dict[str, Any]:
    vid = extract_video_id(req.url)
    if not vid:
        return {"error": "Invalid YouTube URL. Please use a format like: https://www.youtube.com/watch?v=VIDEO_ID"}

    transcript_list = []
    error_details = ""
    
    try:
        # First try: Get English transcript directly
        transcript_list = YouTubeTranscriptApi.get_transcript(vid, languages=["en"])
    except (TranscriptsDisabled, NoTranscriptFound) as e:
        try:
            # Second try: Get any available transcript and translate
            tr_obj = YouTubeTranscriptApi.list_transcripts(vid)
            available_transcripts = list(tr_obj)
            
            if not available_transcripts:
                return {
                    "video_id": vid,
                    "error": "No transcripts are available for this video. The video may not have captions enabled."
                }
            
            # Try to find the first available transcript
            first_transcript = available_transcripts[0]
            
            # If it's not English, translate it
            if first_transcript.language_code != 'en':
                transcript_list = first_transcript.translate('en').fetch()
            else:
                transcript_list = first_transcript.fetch()
                
        except Exception as e2:
            error_details = str(e2)
            
            # Check for XML parsing errors
            if "no element found" in str(e2).lower() or "xml" in str(e2).lower():
                return {
                    "video_id": vid,
                    "error": "Unable to retrieve transcript data from YouTube. The video may not have captions or they may be disabled.",
                    "suggestion": "Please verify the YouTube URL is correct and the video has captions enabled."
                }
            # Third try: Check if it's a rate limiting issue
            elif "429" in str(e2) or "Too Many Requests" in str(e2):
                return {
                    "video_id": vid,
                    "error": "YouTube is currently rate limiting requests. Please try again in a few minutes.",
                    "suggestion": "This is temporary - YouTube limits how many transcript requests can be made."
                }
            elif "Request to YouTube failed" in str(e2):
                return {
                    "video_id": vid,
                    "error": "Unable to connect to YouTube's transcript service. Please check your internet connection and try again.",
                    "suggestion": "This may be a temporary YouTube service issue."
                }
            else:
                return {
                    "video_id": vid,
                    "error": f"Failed to retrieve transcript: {error_details}",
                    "suggestion": "The video may not have transcripts available, or they may be disabled by the creator."
                }
    except Exception as e:
        return {
            "video_id": vid,
            "error": f"Unexpected error: {str(e)}",
            "suggestion": "Please verify the YouTube URL is correct and accessible."
        }

    if not transcript_list:
        return {
            "video_id": vid,
            "error": "No transcript content was retrieved from the video.",
            "suggestion": "The video may not have spoken content or captions may be disabled."
        }

    # Process transcript
    text = " ".join([chunk.get("text", "") for chunk in transcript_list]).strip()
    if not text or len(text) < 50:
        return {
            "video_id": vid,
            "error": "The transcript is too short or empty to analyze.",
            "text_preview": text[:200] if text else "No text content"
        }

    # Save transcript for Q&A
    uid = str(uuid.uuid4())
    transcript_file = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", f"{uid}_transcript.txt")
    os.makedirs(os.path.dirname(transcript_file), exist_ok=True)
    
    with open(transcript_file, "w", encoding="utf-8") as f:
        f.write(text)

    summary = summarize_text(text, max_sentences=6)
    notes = generate_notes(text, bullet_count=10)
    questions = generate_questions(text, count=5)

    return {
        "video_id": vid,
        "transcript_id": uid,
        "text_length": len(text),
        "summary": summary,
        "notes": notes,
        "questions": questions,
        "message": "Video transcript analyzed successfully. You can now ask questions about it."
    }


def _best_snippet(text: str, question: str, window_sentences: int = 5) -> str:
    import re
    qs = set([w.lower() for w in re.findall(r"\w+", question) if len(w) > 2])
    if not qs:
        return text[:500]
    sentences = re.split(r"(?<=[.!?])\s+", text)
    best_score, best_chunk = -1, ""
    for i in range(0, len(sentences), max(1, window_sentences // 2)):
        chunk = " ".join(sentences[i:i+window_sentences])
        toks = set([w.lower() for w in re.findall(r"\w+", chunk)])
        score = len(qs & toks)
        if score > best_score:
            best_score, best_chunk = score, chunk
    return best_chunk[:1200] if best_chunk else "No relevant information found for your question."


class YouTubeQARequest(BaseModel):
    transcript_id: str
    question: str


@router.post("/qa")
async def qa(req: YouTubeQARequest) -> Dict[str, Any]:
    transcript_file = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", f"{req.transcript_id}_transcript.txt")
    
    try:
        if not os.path.exists(transcript_file):
            return {"error": "Transcript not found. Please analyze the video first."}
            
        with open(transcript_file, "r", encoding="utf-8") as f:
            text = f.read()
        
        if not text or not text.strip():
            return {"error": "No transcript text available."}

        snippet = _best_snippet(text, req.question, window_sentences=5)
        
        return {
            "transcript_id": req.transcript_id,
            "question": req.question,
            "answer": snippet,
            "context": snippet,
        }
    except Exception as e:
        return {"error": f"Failed to process Q&A: {str(e)}"}

    snippet = _best_snippet(text, req.question)
    import re
    first_sentence = re.split(r"(?<=[.!?])\s+", snippet.strip())[0] if snippet.strip() else ""
    answer = first_sentence if first_sentence else snippet[:240]
    return {"video_id": vid, "answer": answer, "context": snippet}
