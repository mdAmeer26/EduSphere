import math
import re
from collections import Counter
from typing import List

WORD_RE = re.compile(r"[A-Za-z']+")
SENT_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")


def split_sentences(text: str) -> List[str]:
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    # Simple sentence split; avoids external model downloads
    sentences = re.split(SENT_SPLIT_RE, text)
    return [s.strip() for s in sentences if s.strip()]


def summarize_text(text: str, max_sentences: int = 5) -> str:
    """
    Generate an intelligent summary of the document that describes what it's about.
    Uses extractive summarization with improved scoring and coherence.
    """
    # Clean and prepare text
    text = re.sub(r'\s+', ' ', text).strip()
    if not text:
        return ""
    
    sentences = split_sentences(text)
    if not sentences:
        return ""
    
    # If document is already short, return first few sentences
    if len(sentences) <= max_sentences:
        return " ".join(sentences)

    # Filter out very short, repetitive, or slide marker sentences
    unique_sentences = []
    seen = set()
    for s in sentences:
        s_lower = s.lower().strip()
        
        # Skip slide markers (more aggressive pattern matching)
        if '---' in s_lower and 'slide' in s_lower:
            continue
        if re.match(r'^(slide|unit|chapter|page)\s+\d+', s_lower):
            continue
        
        # Skip very short sentences and duplicates
        if len(s_lower) < 20 or s_lower in seen:
            continue
        
        # Skip common header/footer patterns
        if re.search(r'(syllabus|dr\.|department|ece|professor)', s_lower):
            continue
            
        seen.add(s_lower)
        unique_sentences.append(s)
    
    if not unique_sentences:
        return " ".join(sentences[:max_sentences])
    
    sentences = unique_sentences

    # Calculate word frequencies (excluding common words)
    words = WORD_RE.findall(text.lower())
    common_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
                   'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 
                   'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
                   'slide', 'unit', 'page', 'chapter', 'syllabus', 'dr', 'department',
                   'ece', 'professor', 'lecture', 'video', 'mp'}
    
    freq = Counter(w for w in words if w not in common_words and len(w) > 2)
    
    if not freq:
        return " ".join(sentences[:max_sentences])

    # Score sentences with improved algorithm
    scores = []
    for idx, s in enumerate(sentences):
        s_words = [w for w in WORD_RE.findall(s.lower()) if w not in common_words and len(w) > 2]
        if not s_words:
            scores.append((0, idx, s))
            continue
        
        # Calculate score based on:
        # 1. Word frequency (importance of words in sentence)
        # 2. Sentence position (favor earlier sentences for intro context)
        # 3. Sentence length (prefer medium-length sentences)
        freq_score = sum(freq[w] for w in s_words) / math.sqrt(len(s_words))
        position_score = 1.0 / (idx + 1) if idx < 5 else 0.5  # Boost first 5 sentences
        length_penalty = 1.0 if 10 < len(s.split()) < 30 else 0.8
        
        total_score = freq_score * position_score * length_penalty
        scores.append((total_score, idx, s))

    # Select top sentences
    top = sorted(scores, key=lambda x: x[0], reverse=True)[:max_sentences * 2]
    
    # From top candidates, pick sentences that maintain document flow
    # Prioritize earlier sentences for context, then high-scoring ones
    selected = sorted(top, key=lambda x: (x[1] > 3, -x[0]))[:max_sentences]
    
    # Return in original order for coherent reading
    top_sorted = [t for _, _, t in sorted(selected, key=lambda x: x[1])]
    
    # Create a cohesive summary with proper formatting
    summary = " ".join(top_sorted)
    
    # Add intro context if available (what the document is about)
    if len(sentences) > 0 and len(top_sorted) > 0:
        # Check if first sentence provides good context
        first_sent = sentences[0]
        if first_sent not in top_sorted and len(first_sent.split()) > 5:
            # Prepend first sentence if it's not already included
            summary = first_sent + " " + summary
            # Trim to max_sentences if we exceeded
            summary_sents = split_sentences(summary)
            if len(summary_sents) > max_sentences:
                summary = " ".join(summary_sents[:max_sentences])
    
    return summary


def generate_notes(text: str, bullet_count: int = 8) -> List[str]:
    sents = split_sentences(text)
    if not sents:
        return []
    
    # Filter out very short or repetitive sentences
    unique_sents = []
    seen = set()
    for s in sents:
        s_lower = s.lower().strip()
        # Skip very short sentences or those we've seen
        if len(s_lower) < 10 or s_lower in seen:
            continue
        seen.add(s_lower)
        unique_sents.append(s)
    
    if not unique_sents:
        return sents[:bullet_count]
    
    sents = unique_sents
    
    # Heuristic: choose evenly spaced sentences
    if len(sents) <= bullet_count:
        return sents
    idxs = [round(i * (len(sents)-1) / (bullet_count-1)) for i in range(bullet_count)]
    seen_idx = set()
    bullets = []
    for i in idxs:
        if i not in seen_idx:
            bullets.append(sents[i])
            seen_idx.add(i)
    return bullets
    return bullets


def generate_questions(text: str, count: int = 5) -> List[str]:
    sents = split_sentences(text)
    if not sents:
        return []
    picks = [sents[i] for i in range(0, min(len(sents), count * 2), 2)]
    questions = []
    for s in picks[:count]:
        # Simple transformation to a question
        q = s
        if not q.endswith("?"):
            q = re.sub(r"\b(is|are|was|were|does|do|did)\b", r"\\1", q, flags=re.I)
            q = q.rstrip(". ") + "?"
        questions.append(q)
    return questions
