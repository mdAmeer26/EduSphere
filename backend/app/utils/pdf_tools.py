import io
import os
import re
from typing import Tuple

import PyPDF2
from pdf2image import convert_from_path
from PIL import Image
import pytesseract

try:
    from pptx import Presentation
    PPTX_AVAILABLE = True
except ImportError:
    PPTX_AVAILABLE = False

# On Windows, allow environment override for tesseract path
TESSERACT_CMD = os.environ.get("TESSERACT_CMD") or r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe"
if os.path.exists(TESSERACT_CMD):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD


def extract_ppt_text(file_path: str) -> str:
    """Extract text from PowerPoint files (.ppt, .pptx)"""
    if not PPTX_AVAILABLE:
        return "PowerPoint support requires python-pptx library. Please install it with: pip install python-pptx"
    
    try:
        prs = Presentation(file_path)
        text_parts = []
        
        for slide_num, slide in enumerate(prs.slides, 1):
            slide_text = f"\n--- Slide {slide_num} ---\n"
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text:
                    slide_text += shape.text + "\n"
            if slide_text.strip():
                text_parts.append(slide_text)
        
        return "\n".join(text_parts).strip()
    except Exception as e:
        return f"Error extracting PowerPoint text: {str(e)}"


def extract_text_pypdf2(file_path: str) -> str:
    text_parts = []
    with open(file_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            try:
                t = page.extract_text() or ""
            except Exception:
                t = ""
            if t:
                text_parts.append(t)
    return "\n".join(text_parts).strip()


def extract_text_ocr(file_path: str, dpi: int = 300) -> Tuple[str, int]:
    text_parts = []
    page_count = 0
    try:
        images = convert_from_path(file_path, dpi=dpi)
    except Exception as e:
        return "", 0
    for img in images:
        page_count += 1
        if not isinstance(img, Image.Image):
            img = Image.open(io.BytesIO(img))
        gray = img.convert("L")
        text = pytesseract.image_to_string(gray)
        if text:
            text_parts.append(text)
    return "\n".join(text_parts).strip(), page_count


def is_text_quality_poor(text: str) -> bool:
    """Check if extracted text is of poor quality"""
    if not text or len(text) < 50:
        return True
    
    # Count ratio of letters to total characters
    letters = len(re.findall(r'[a-zA-Z]', text))
    total_chars = len(text.replace(' ', ''))
    if total_chars == 0:
        return True
    
    letter_ratio = letters / total_chars
    
    # Count common OCR artifacts
    artifacts = len(re.findall(r'/[a-zA-Z]+\d+|[<>]|bTest|@version|\d{4}-\d+First', text))
    artifact_density = artifacts / len(text) * 1000  # per 1000 chars
    
    # Poor quality indicators
    if letter_ratio < 0.5:  # Less than 50% letters
        return True
    if artifact_density > 5:  # More than 5 artifacts per 1000 chars
        return True
    
    return False


def clean_extracted_text(text: str) -> str:
    """Remove repetitive watermarks and clean up extracted text"""
    if not text:
        return text
    
    # Check if text quality is too poor
    if is_text_quality_poor(text):
        return ""  # Return empty to trigger fallback
    
    # Remove font encoding artifacts (common in OCR)
    text = re.sub(r'/[a-zA-Z]+\d+', '', text)  # Remove /g1, /g2, etc.
    text = re.sub(r'[<>]', '', text)  # Remove angle brackets
    text = re.sub(r'bTest\b', '', text)  # Remove bTest artifacts
    text = re.sub(r'@\w+', '', text)  # Remove @version, @author, etc.
    text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
    
    lines = text.split('\n')
    cleaned_lines = []
    seen_count = {}
    
    # Remove lines that appear too frequently (likely watermarks)
    for line in lines:
        line = line.strip()
        if not line or len(line) < 15:  # Increased minimum length
            continue
        
        # Skip lines with too many artifacts
        if re.search(r'[/\\<>@]{3,}|\d{8,}|[a-zA-Z]{1}[0-9]{3,}', line):
            continue
        
        # Skip lines that are mostly punctuation or special characters
        clean_chars = re.sub(r'[^a-zA-Z\s]', '', line)
        if len(clean_chars) < len(line) * 0.4:  # Need at least 40% letters
            continue
            
        # Count occurrences
        seen_count[line] = seen_count.get(line, 0) + 1
    
    # Identify watermark lines (appear more than 2 times)
    watermarks = {line for line, count in seen_count.items() if count > 2}
    
    # Common watermark and artifact patterns
    watermark_patterns = [
        r'scanned by camscanner',
        r'created with camscanner',
        r'www\.camscanner\.com',
        r'^\d{4}-\d+First',  # Lines starting with year-number pattern
        r'INFN Sezione di Trieste',  # Specific artifacts from this document
        r'Area di Ricerca',
        r'Introduction to JAVA- slides',
    ]
    
    # Filter out watermarks and repetitive lines
    for line in lines:
        line = line.strip()
        if not line or len(line) < 15:
            continue
        
        # Check if it's a watermark
        is_watermark = False
        line_lower = line.lower()
        
        if line in watermarks:
            is_watermark = True
        else:
            for pattern in watermark_patterns:
                if re.search(pattern, line_lower):
                    is_watermark = True
                    break
        
        if not is_watermark:
            cleaned_lines.append(line)
    
    result = '\n'.join(cleaned_lines)
    
    # Final cleanup - remove very repetitive sequences
    result = re.sub(r'(\w+)\s+\1\s+\1+', r'\1', result)  # Remove word repetitions
    
    # If result is still poor quality, return empty
    if is_text_quality_poor(result):
        return ""
    
    return result


def extract_pdf_text_with_ocr_fallback(file_path: str) -> Tuple[str, bool]:
    text = extract_text_pypdf2(file_path)
    used_ocr = False
    
    if text and len(text) > 40:
        text = clean_extracted_text(text)
    else:
        ocr_text, _ = extract_text_ocr(file_path)
        if ocr_text:
            text = clean_extracted_text(ocr_text)
            used_ocr = True
    
    return text, used_ocr
