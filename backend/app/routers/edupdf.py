import os
import re
import uuid
from typing import Any, Dict

import aiofiles
from fastapi import APIRouter, File, UploadFile, Form

from app.utils.pdf_tools import extract_pdf_text_with_ocr_fallback, extract_ppt_text
from app.utils.summarizer import summarize_text, generate_notes, generate_questions
from app.utils.storage import STORAGE_ROOT

router = APIRouter()

UPLOAD_ROOT = STORAGE_ROOT


@router.post("/analyze")
async def analyze_pdf(file: UploadFile = File(...)) -> Dict[str, Any]:
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in [".pdf", ".ppt", ".pptx"]:
        return {"error": "Only PDF and PowerPoint files are supported"}

    uid = str(uuid.uuid4())
    save_path = os.path.join(UPLOAD_ROOT, f"{uid}{ext}")
    text_file_path = os.path.join(UPLOAD_ROOT, f"{uid}_text.txt")

    try:
        async with aiofiles.open(save_path, "wb") as out:
            content = await file.read()
            await out.write(content)

        # Extract text based on file type
        if ext == ".pdf":
            text, used_ocr = extract_pdf_text_with_ocr_fallback(save_path)
        else:  # .ppt or .pptx
            text = extract_ppt_text(save_path)
            used_ocr = False
        
        # If text quality is too poor, provide a helpful message
        if not text or not text.strip():
            return {
                "id": uid,
                "filename": file.filename,
                "error": "The PDF text quality is too poor for analysis. This appears to be a heavily corrupted scan. Please try a higher quality PDF or contact support for manual processing.",
                "suggestion": "For best results, use PDFs with selectable text rather than scanned images."
            }

        # Save extracted text for later use
        async with aiofiles.open(text_file_path, "w", encoding="utf-8") as text_out:
            await text_out.write(text)

        return {
            "id": uid,
            "filename": file.filename,
            "ocr_used": used_ocr,
            "text_length": len(text),
            "message": "PDF text extracted successfully. You can now ask questions about it.",
            "download_url": f"/files/{os.path.basename(save_path)}",
        }
    except Exception as e:
        return {
            "id": uid,
            "filename": file.filename,
            "error": f"Failed to process PDF: {str(e)}"
        }


def _best_snippet(text: str, question: str, window_sentences: int = 5) -> str:
    # Clean up the text first
    text = re.sub(r'\s+', ' ', text.strip())
    
    # Remove slide markers and common document headers
    text = re.sub(r'---\s*[Ss]lide\s+\d+\s*---', '', text)
    text = re.sub(r'---\s*[Uu][Nn][Ii][Tt]\s+\d+\s*---', '', text)
    text = re.sub(r'\b(Syllabus|Dr\.|Department|Professor)\b[^\n.]*[.\n]', '', text)
    text = re.sub(r'\s+', ' ', text.strip())
    
    # If text is too short or poor quality, provide general response
    if len(text) < 100:
        return f"The document doesn't contain enough readable content to answer '{question}'. The text may be corrupted or illegible."
    
    # Extract question keywords
    qs = set([w.lower() for w in re.findall(r"\w+", question) if len(w) > 2])
    if not qs:
        return text[:500]
    
    # Special handling for common questions
    question_lower = question.lower()
    if "what is java" in question_lower:
        # Look for Java-related content specifically
        java_patterns = [
            r'java\s+is\s+[\w\s,]+[.!?]',
            r'java[\w\s,:]+programming[\w\s]+[.!?]',
            r'programming\s+language[\w\s,]+java[\w\s]+[.!?]'
        ]
        for pattern in java_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                return matches[0]
        
        # If no direct definition found, look for any Java context
        java_sentences = []
        sentences = re.split(r"(?<=[.!?])\s+", text)
        for sentence in sentences:
            if 'java' in sentence.lower() and len(sentence) > 20:
                # Clean up the sentence
                clean_sentence = re.sub(r'[^a-zA-Z0-9\s,.!?()-]', '', sentence)
                if len(clean_sentence) > 20:
                    java_sentences.append(clean_sentence)
        
        if java_sentences:
            return " ".join(java_sentences[:3])  # Return first 3 relevant sentences
    
    # Split into sentences
    sentences = re.split(r"(?<=[.!?])\s+", text)
    
    # Filter out very short, garbled, or header sentences
    clean_sentences = []
    for sentence in sentences:
        sentence = sentence.strip()
        
        # Skip very short sentences
        if len(sentence) < 20:
            continue
            
        # Skip slide/unit headers
        if re.match(r'^(slide|unit|chapter|page)\s+\d+', sentence.lower()):
            continue
            
        # Skip sentences that are mostly artifacts
        clean_chars = re.sub(r'[^a-zA-Z\s]', '', sentence)
        if len(clean_chars) < len(sentence) * 0.5:  # Need at least 50% letters
            continue
            
        clean_sentences.append(sentence)
    
    if not clean_sentences:
        return f"The document content is too corrupted to provide a meaningful answer to '{question}'."
    
    # Find the most relevant sentences based on question keywords
    sentence_scores = []
    for idx, sentence in enumerate(clean_sentences):
        sentence_lower = sentence.lower()
        sentence_words = set([w.lower() for w in re.findall(r"\w+", sentence)])
        
        # Calculate relevance score
        keyword_matches = len(qs & sentence_words)
        
        # Boost score for exact phrase matches
        for q_word in qs:
            if q_word in sentence_lower:
                keyword_matches += 3  # Strong boost for keyword presence
        
        # Check for multi-word phrase matches (e.g., "l c filter" or "lc filter")
        question_clean = re.sub(r'[^\w\s]', '', question.lower())
        if len(question_clean) > 5 and question_clean in sentence_lower:
            keyword_matches += 10  # Very strong boost for phrase match
        
        if keyword_matches > 0:
            sentence_scores.append((keyword_matches, idx, sentence))
    
    if not sentence_scores:
        return f"No relevant information found for '{question}' in this document."
    
    # Sort by score and get top sentences
    sentence_scores.sort(key=lambda x: (-x[0], x[1]))  # Sort by score desc, then position asc
    
    # Take top 2-3 most relevant sentences
    top_sentences = sentence_scores[:3]
    
    # Return sentences in original order for readability
    top_sentences.sort(key=lambda x: x[1])
    result = " ".join([s for _, _, s in top_sentences])
    
    return result[:1000] if result else f"No relevant information found for '{question}' in this document."


@router.post("/qa")
async def qa_pdf(
    pdf_id: str = Form(...),
    question: str = Form(...)
) -> Dict[str, Any]:
    text_file_path = os.path.join(UPLOAD_ROOT, f"{pdf_id}_text.txt")
    
    try:
        if not os.path.exists(text_file_path):
            return {"error": "PDF text not found. Please analyze the PDF first."}
            
        async with aiofiles.open(text_file_path, "r", encoding="utf-8") as text_file:
            text = await text_file.read()
        
        if not text or not text.strip():
            return {"error": "No text available for this PDF."}

        snippet = _best_snippet(text, question, window_sentences=5)
        
        # Format the answer more naturally
        answer_text = snippet
        if not snippet.startswith("The document"):  # Only format if it's actual content
            # Clean up the answer
            answer_text = re.sub(r'\s+', ' ', snippet).strip()
            # Add context prefix if it's a "what is" question
            if re.search(r'\b(what is|what are|define|explain)\b', question.lower()):
                # Keep the answer as-is if it already defines something
                pass
        
        return {
            "pdf_id": pdf_id,
            "question": question,
            "answer": answer_text,
            "context": snippet,
        }
    except Exception as e:
        return {"error": f"Failed to process Q&A: {str(e)}"}


@router.post("/summary")
async def get_summary(
    pdf_id: str = Form(...),
    max_sentences: int = Form(8)  # Increased default for better summaries
) -> Dict[str, Any]:
    text_file_path = os.path.join(UPLOAD_ROOT, f"{pdf_id}_text.txt")
    
    try:
        if not os.path.exists(text_file_path):
            return {"error": "Document text not found. Please analyze the document first."}
            
        async with aiofiles.open(text_file_path, "r", encoding="utf-8") as text_file:
            text = await text_file.read()
        
        if not text or not text.strip():
            return {"error": "No text available for this document."}

        # Generate comprehensive summary
        summary = summarize_text(text, max_sentences=max_sentences)
        
        # Add document overview context
        word_count = len(text.split())
        char_count = len(text)
        
        # Format summary with context
        formatted_summary = f"This document is about: {summary}"
        
        notes = generate_notes(text, bullet_count=8)
        questions = generate_questions(text, count=5)
        
        return {
            "pdf_id": pdf_id,
            "summary": formatted_summary,
            "raw_summary": summary,  # Include raw version too
            "word_count": word_count,
            "char_count": char_count,
            "notes": notes,
            "questions": questions,
        }
    except Exception as e:
        return {"error": f"Failed to generate summary: {str(e)}"}

    snippet = _best_snippet(text, question)
    # Heuristic short answer: take first sentence of best snippet
    import re
    first_sentence = re.split(r"(?<=[.!?])\s+", snippet.strip())[0] if snippet.strip() else ""
    answer = first_sentence if first_sentence else snippet[:240]

    return {
        "id": uid,
        "answer": answer,
        "context": snippet,
        "ocr_used": used_ocr,
        "download_url": f"/files/{os.path.basename(save_path)}",
    }
