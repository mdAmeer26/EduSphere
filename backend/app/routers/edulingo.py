import os
import uuid
from typing import Any, Dict, List
from datetime import datetime

from fastapi import APIRouter, Form
from pydantic import BaseModel

from app.utils.storage import load_list, save_list

router = APIRouter()

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".."))
VOCAB_STORE = os.path.join(ROOT, "uploads", "edulingo_vocab.json")
LESSONS_STORE = os.path.join(ROOT, "uploads", "edulingo_lessons.json")


class VocabWord(BaseModel):
    word: str
    translation: str
    language: str


class LessonRequest(BaseModel):
    language: str
    level: str = "beginner"


@router.post("/vocab/add")
async def add_vocab(req: VocabWord) -> Dict[str, Any]:
    vocab = load_list(VOCAB_STORE)
    entry = {
        "id": str(uuid.uuid4()),
        "word": req.word,
        "translation": req.translation,
        "language": req.language,
        "added_at": datetime.utcnow().isoformat() + "Z",
        "review_count": 0,
    }
    vocab.append(entry)
    save_list(VOCAB_STORE, vocab)
    return {"ok": True, "entry": entry}


@router.get("/vocab/list")
async def list_vocab(language: str = "") -> Dict[str, Any]:
    vocab = load_list(VOCAB_STORE)
    if language:
        vocab = [v for v in vocab if v.get("language", "").lower() == language.lower()]
    return {"count": len(vocab), "vocab": vocab}


@router.post("/vocab/review")
async def review_vocab(vocab_id: str = Form(...)) -> Dict[str, Any]:
    vocab = load_list(VOCAB_STORE)
    word = next((v for v in vocab if v["id"] == vocab_id), None)
    if not word:
        return {"error": "Word not found"}
    
    word["review_count"] = word.get("review_count", 0) + 1
    word["last_reviewed"] = datetime.utcnow().isoformat() + "Z"
    save_list(VOCAB_STORE, vocab)
    return {"ok": True, "word": word}


@router.post("/lesson/generate")
async def generate_lesson(req: LessonRequest) -> Dict[str, Any]:
    lessons = load_list(LESSONS_STORE)
    
    # Simple lesson generation with actual content
    lessons_by_level = {
        "beginner": {
            "spanish": ["Hola - Hello", "Adiós - Goodbye", "Gracias - Thank you", "Por favor - Please"],
            "french": ["Bonjour - Hello", "Au revoir - Goodbye", "Merci - Thank you", "S'il vous plaît - Please"],
            "german": ["Hallo - Hello", "Auf Wiedersehen - Goodbye", "Danke - Thank you", "Bitte - Please"],
        },
        "intermediate": {
            "spanish": ["¿Cómo estás? - How are you?", "Yo estoy bien - I am fine", "¿Qué hora es? - What time is it?"],
            "french": ["Comment allez-vous? - How are you?", "Je vais bien - I am fine", "Quelle heure est-il? - What time is it?"],
            "german": ["Wie geht es Ihnen? - How are you?", "Mir geht es gut - I am fine", "Wie spät ist es? - What time is it?"],
        }
    }
    
    vocab_list = lessons_by_level.get(req.level, {}).get(req.language.lower(), ["No lessons available"])
    
    content = f"""
# {req.language.title()} Lesson - {req.level.title()} Level

## Vocabulary
{chr(10).join(f"- {v}" for v in vocab_list)}

## Grammar Point
- Basic sentence structure
- Pronunciation tips
- Common phrases

## Practice Exercises
1. Repeat each phrase 5 times
2. Write sentences using the vocabulary
3. Practice with a partner

## Quick Quiz
- Translate: {vocab_list[0].split(' - ')[1] if vocab_list else 'Hello'}
- Write a greeting in {req.language}
"""
    
    lesson = {
        "id": str(uuid.uuid4()),
        "language": req.language,
        "level": req.level,
        "content": content.strip(),
        "vocab_count": len(vocab_list),
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    lessons.append(lesson)
    save_list(LESSONS_STORE, lessons)
    return {"ok": True, "lesson": lesson}


@router.get("/lessons")
async def get_lessons(language: str = None) -> Dict[str, Any]:
    lessons = load_list(LESSONS_STORE)
    if language:
        lessons = [l for l in lessons if l.get("language", "").lower() == language.lower()]
    return {"count": len(lessons), "lessons": lessons}


@router.get("/check/grammar")
async def check_grammar(text: str) -> Dict[str, Any]:
    # Basic grammar checker
    issues = []
    score = 100
    
    if not text.strip():
        issues.append({"message": "Empty text", "type": "error", "position": 0})
        return {"text": text, "issues": issues, "score": 0}
    
    if text and text[0].islower():
        issues.append({"message": "Should start with capital letter", "type": "suggestion", "position": 0})
        score -= 10
    
    if not text.rstrip().endswith(('.', '!', '?')):
        issues.append({"message": "Missing punctuation at end", "type": "suggestion", "position": len(text)})
        score -= 10
    
    # Check for double spaces
    if "  " in text:
        issues.append({"message": "Double spaces found", "type": "warning", "position": text.index("  ")})
        score -= 5
    
    return {"text": text, "issues": issues, "score": max(0, score), "ok": len(issues) == 0}


@router.post("/translate")
async def translate_text(text: str = Form(...), from_lang: str = Form("en"), to_lang: str = Form("es")) -> Dict[str, Any]:
    # Basic translation dictionary (placeholder for real translation API)
    simple_translations = {
        ("en", "es"): {"hello": "hola", "goodbye": "adiós", "thank you": "gracias", "please": "por favor"},
        ("en", "fr"): {"hello": "bonjour", "goodbye": "au revoir", "thank you": "merci", "please": "s'il vous plaît"},
        ("en", "de"): {"hello": "hallo", "goodbye": "auf wiedersehen", "thank you": "danke", "please": "bitte"},
    }
    
    text_lower = text.lower().strip()
    translations = simple_translations.get((from_lang, to_lang), {})
    translated = translations.get(text_lower, f"[Translation for '{text}' not available]")
    
    return {
        "original": text,
        "translated": translated,
        "from_language": from_lang,
        "to_language": to_lang,
        "note": "Integrate Google Translate API or LibreTranslate for full functionality"
    }
