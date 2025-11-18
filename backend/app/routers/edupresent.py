import os
import uuid
from typing import Any, Dict, List

from fastapi import APIRouter
from pydantic import BaseModel
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

router = APIRouter()

EXPORT_ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "uploads"))
os.makedirs(EXPORT_ROOT, exist_ok=True)


class PPTRequest(BaseModel):
    topic: str
    content: str | None = None
    slides: int = 8


def get_programming_content(topic: str) -> Dict[str, Any]:
    """Generate comprehensive programming content"""
    topic_lower = topic.lower()
    
    if "c programming" in topic_lower or topic_lower.startswith("c "):
        return {
            "outline": [
                "Introduction to C Programming",
                "Setting up Development Environment", 
                "Basic Syntax and Structure",
                "Data Types and Variables",
                "Control Structures (if, for, while)",
                "Functions and Modular Programming",
                "Arrays and Strings",
                "Pointers and Memory Management",
                "File I/O Operations",
                "Best Practices and Common Pitfalls"
            ],
            "detailed_content": {
                "Introduction to C Programming": [
                    "• C is a general-purpose programming language",
                    "• Developed by Dennis Ritchie at Bell Labs (1972)",
                    "• Foundation for many modern languages (C++, Java, Python)",
                    "• Used for system programming, embedded systems",
                    "• Offers low-level control with high-level features"
                ],
                "Setting up Development Environment": [
                    "• Install GCC compiler or IDE like Code::Blocks",
                    "• Text editors: VS Code, Vim, Notepad++",
                    "• Compilation process: source → object → executable",
                    "• Command line: gcc filename.c -o output",
                    "• Debugging tools: gdb, IDE debuggers"
                ],
                "Basic Syntax and Structure": [
                    "• #include <stdio.h> - header files",
                    "• int main() { return 0; } - main function", 
                    "• printf() - output function",
                    "• scanf() - input function",
                    "• Comments: // single line, /* multi line */"
                ],
                "Data Types and Variables": [
                    "• int - integers (4 bytes)",
                    "• float - floating point (4 bytes)",
                    "• double - double precision (8 bytes)", 
                    "• char - characters (1 byte)",
                    "• Variable declaration: int age = 25;"
                ],
                "Control Structures (if, for, while)": [
                    "• if-else statements for decision making",
                    "• for loops for counted iterations",
                    "• while loops for condition-based repetition",
                    "• switch-case for multiple choices",
                    "• break and continue statements"
                ],
                "Functions and Modular Programming": [
                    "• Function declaration and definition",
                    "• Parameters and return values",
                    "• Local vs global variables",
                    "• Function prototypes",
                    "• Recursion and recursive functions"
                ],
                "Arrays and Strings": [
                    "• Array declaration: int arr[10];",
                    "• Array initialization and access",
                    "• String handling with char arrays",
                    "• String functions: strlen, strcpy, strcmp",
                    "• Multi-dimensional arrays"
                ],
                "Pointers and Memory Management": [
                    "• Pointer declaration: int *ptr;",
                    "• Address operator (&) and dereference (*)",
                    "• Dynamic memory allocation: malloc, free",
                    "• Pointer arithmetic",
                    "• Common pointer mistakes and debugging"
                ],
                "File I/O Operations": [
                    "• Opening files: fopen() function",
                    "• Reading: fgetc, fgets, fscanf",
                    "• Writing: fputc, fputs, fprintf", 
                    "• Closing files: fclose()",
                    "• File modes: r, w, a, rb, wb"
                ],
                "Best Practices and Common Pitfalls": [
                    "• Always initialize variables before use",
                    "• Check return values of functions",
                    "• Free allocated memory to prevent leaks",
                    "• Use meaningful variable names",
                    "• Comment your code for maintainability"
                ]
            },
            "examples": {
                "Hello World": [
                    "#include <stdio.h>",
                    "",
                    "int main() {",
                    "    printf(\"Hello, World!\\n\");",
                    "    return 0;",
                    "}"
                ],
                "Simple Calculator": [
                    "#include <stdio.h>",
                    "",
                    "int main() {",
                    "    int a, b, choice;",
                    "    printf(\"Enter two numbers: \");",
                    "    scanf(\"%d %d\", &a, &b);",
                    "    printf(\"Sum: %d\\n\", a + b);",
                    "    return 0;",
                    "}"
                ]
            }
        }
    
    # Default generic content for other topics
    return {
        "outline": [
            f"Introduction to {topic}",
            "Key Concepts",
            "Core Features", 
            "Practical Applications",
            "Examples and Use Cases",
            "Best Practices",
            "Common Challenges",
            "Future Trends",
            "Resources and Learning"
        ],
        "detailed_content": {},
        "examples": {}
    }


def _add_title_slide(prs: Presentation, title: str, subtitle: str = ""):
    """Add a title slide with modern styling"""
    layout = prs.slide_layouts[0]
    slide = prs.slides.add_slide(layout)
    
    # Set background color (vibrant gradient - teal to blue)
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = RGBColor(16, 185, 129)  # Emerald green
    
    # Style title
    title_shape = slide.shapes.title
    title_shape.text = title
    title_frame = title_shape.text_frame
    for paragraph in title_frame.paragraphs:
        for run in paragraph.runs:
            run.font.size = Pt(44)
            run.font.bold = True
            run.font.color.rgb = RGBColor(255, 255, 255)  # White
    
    # Style subtitle
    if subtitle:
        slide.placeholders[1].text = subtitle
    else:
        slide.placeholders[1].text = "Generated by EduSphere"
    
    subtitle_shape = slide.placeholders[1]
    subtitle_frame = subtitle_shape.text_frame
    for paragraph in subtitle_frame.paragraphs:
        for run in paragraph.runs:
            run.font.size = Pt(20)
            run.font.color.rgb = RGBColor(255, 255, 255)  # White


def _add_bullet_slide(prs: Presentation, title: str, bullets: List[str]):
    """Add a content slide with bullet points"""
    layout = prs.slide_layouts[1]  # Title and Content
    slide = prs.slides.add_slide(layout)
    
    # Set background color (white with subtle accent)
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = RGBColor(255, 255, 255)  # Pure white
    
    # Style title with colored background
    title_shape = slide.shapes.title
    title_shape.text = title
    title_frame = title_shape.text_frame
    
    # Add color box behind title
    left = title_shape.left
    top = title_shape.top
    width = title_shape.width
    height = title_shape.height
    
    for paragraph in title_frame.paragraphs:
        paragraph.alignment = PP_ALIGN.LEFT
        for run in paragraph.runs:
            run.font.size = Pt(32)
            run.font.bold = True
            run.font.color.rgb = RGBColor(79, 70, 229)  # Vibrant indigo
    
    # Style bullet points
    body = slide.shapes.placeholders[1].text_frame
    body.clear()
    
    for i, bullet in enumerate(bullets):
        if i == 0:
            body.text = bullet
            p = body.paragraphs[0]
        else:
            p = body.add_paragraph()
            p.text = bullet
            p.level = 0
        
        # Style bullet text
        for run in p.runs:
            run.font.size = Pt(18)
            run.font.color.rgb = RGBColor(31, 41, 55)  # Rich black


def _add_code_slide(prs: Presentation, title: str, code_lines: List[str]):
    """Add a slide with code content"""
    layout = prs.slide_layouts[1]
    slide = prs.slides.add_slide(layout)
    
    # Set background color (dark for code slides)
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = RGBColor(15, 23, 42)  # Rich dark slate
    
    # Style title
    title_shape = slide.shapes.title
    title_shape.text = title
    title_frame = title_shape.text_frame
    for paragraph in title_frame.paragraphs:
        for run in paragraph.runs:
            run.font.size = Pt(32)
            run.font.bold = True
            run.font.color.rgb = RGBColor(251, 191, 36)  # Amber yellow
    
    body = slide.shapes.placeholders[1].text_frame
    body.clear()
    
    # Add code with monospace-like formatting
    for i, line in enumerate(code_lines):
        if i == 0:
            p = body.paragraphs[0]
            p.text = line
        else:
            p = body.add_paragraph()
            p.text = line
        
        # Make it look more like code
        for run in p.runs:
            run.font.name = 'Consolas'
            run.font.size = Pt(14)
            run.font.color.rgb = RGBColor(52, 211, 153)  # Bright teal (code color)


def _build_comprehensive_ppt(topic: str, content: str | None, slides: int, out_path: str):
    """Build a comprehensive PowerPoint presentation"""
    prs = Presentation()
    
    # Get content for the topic
    topic_content = get_programming_content(topic)
    outline = topic_content["outline"]
    detailed_content = topic_content["detailed_content"]
    examples = topic_content["examples"]
    
    # Title slide
    _add_title_slide(prs, topic, "A Comprehensive Guide")
    
    # Agenda slide
    _add_bullet_slide(prs, "Agenda", outline[:8])  # Show first 8 items
    
    # Content slides - use detailed content if available
    slides_created = 2  # Title + Agenda
    target_slides = min(slides, len(outline) + 2)
    
    for i, topic_title in enumerate(outline):
        if slides_created >= target_slides:
            break
            
        if topic_title in detailed_content:
            # Use detailed content
            _add_bullet_slide(prs, topic_title, detailed_content[topic_title])
        else:
            # Generate basic content
            basic_points = [
                f"• Overview of {topic_title}",
                f"• Key concepts and principles",
                f"• Practical implementation",
                f"• Common use cases",
                f"• Best practices to follow"
            ]
            _add_bullet_slide(prs, topic_title, basic_points)
        
        slides_created += 1
    
    # Add code examples if available and space permits
    if examples and slides_created < target_slides:
        for example_title, code_lines in examples.items():
            if slides_created >= target_slides:
                break
            _add_code_slide(prs, f"Example: {example_title}", code_lines)
            slides_created += 1
    
    # Summary slide
    if slides_created < target_slides:
        summary_points = [
            f"• {topic} is a powerful and versatile technology",
            "• Understanding fundamentals is crucial for success", 
            "• Practice with hands-on examples",
            "• Follow best practices and coding standards",
            "• Continue learning and exploring advanced topics"
        ]
        _add_bullet_slide(prs, "Summary", summary_points)
    
    prs.save(out_path)


def _build_ppt(topic: str, content: str | None, slides: int, out_path: str):
    """Legacy build function for non-programming topics"""
    prs = Presentation()
    
    # Title slide
    _add_title_slide(prs, topic)
    
    # Generate basic content
    if content and len(content.strip()) > 10:
        # Use provided content
        content_lines = content.strip().split('\n')
        bullets = [line.strip() for line in content_lines if line.strip()]
    else:
        # Generate generic content
        bullets = [
            f"Introduction to {topic}",
            "Key concepts and principles",
            "Main features and capabilities",
            "Practical applications",
            "Implementation strategies",
            "Best practices",
            "Common challenges",
            "Future developments"
        ]
    
    # Agenda slide
    agenda = bullets[:min(6, len(bullets))]
    _add_bullet_slide(prs, "Agenda", agenda)
    
    # Content slides
    per_slide = max(3, len(bullets) // max(1, slides - 2))
    idx = 0
    for s in range(slides - 2):
        batch = bullets[idx: idx + per_slide]
        if not batch:
            break
        _add_bullet_slide(prs, f"{topic} - Part {s+1}", batch)
        idx += per_slide
    
    prs.save(out_path)


@router.post("/generate")
async def generate_ppt(req: PPTRequest) -> Dict[str, Any]:
    if not req.topic or not req.topic.strip():
        return {"error": "Topic is required"}
    
    uid = str(uuid.uuid4())
    out_path = os.path.join(EXPORT_ROOT, f"{uid}.pptx")
    
    try:
        topic_lower = req.topic.lower()
        
        # Check if it's a programming topic for comprehensive content
        if any(keyword in topic_lower for keyword in ['programming', 'coding', 'python', 'java', 'javascript', 'c++', 'html', 'css', 'sql']):
            _build_comprehensive_ppt(req.topic.strip(), (req.content or "").strip() or None, max(5, min(req.slides, 20)), out_path)
        else:
            # Use legacy builder for other topics
            _build_ppt(req.topic.strip(), (req.content or "").strip() or None, max(3, min(req.slides, 20)), out_path)
            
    except Exception as e:
        return {"error": f"Failed to generate PPT: {e}"}
    
    return {
        "id": uid, 
        "download_url": f"/files/{os.path.basename(out_path)}",
        "message": f"PowerPoint presentation on '{req.topic}' generated successfully!"
    }
