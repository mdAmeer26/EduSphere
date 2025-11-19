import os
import uuid
import json
from typing import Any, Dict, List, Optional
from datetime import datetime
import re

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import io
import numpy as np

try:
    import pytesseract  # type: ignore
except Exception:
    pytesseract = None  # type: ignore

try:
    import sympy as sp  # type: ignore
except Exception:
    sp = None  # type: ignore

try:
    import openai  # type: ignore
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    if OPENAI_API_KEY:
        openai.api_key = OPENAI_API_KEY
except Exception:
    openai = None  # type: ignore
    OPENAI_API_KEY = None

router = APIRouter()

EXPORT_ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "uploads"))
os.makedirs(EXPORT_ROOT, exist_ok=True)
SESSIONS_FILE = os.path.join(EXPORT_ROOT, "whiteboard_sessions.json")


class Point(BaseModel):
    x: float
    y: float

class Stroke(BaseModel):
    points: List[Point]
    color: str = "#000000"
    width: int = 3
    tool: str = "pen"

class TextElement(BaseModel):
    x: float
    y: float
    text: str
    fontSize: int = 20
    color: str = "#000000"

class Shape(BaseModel):
    type: str
    x1: float
    y1: float
    x2: float
    y2: float
    color: str = "#000000"
    filled: bool = False

class BoardRequest(BaseModel):
    session_id: str = "default"
    width: int = 1024
    height: int = 768
    background: str = "#ffffff"
    strokes: List[Stroke] = []
    texts: List[TextElement] = []
    shapes: List[Shape] = []

class AIRequest(BaseModel):
    prompt: str
    context: str = ""

class SolveRequest(BaseModel):
    expression: str
    show_steps: bool = True

class TextSolveRequest(BaseModel):
    problem: str
    type: str = "auto"  # auto, algebra, calculus, geometry, word_problem
    show_steps: bool = True


@router.post("/render")
async def render_board(req: BoardRequest) -> Dict[str, Any]:
    """Render whiteboard with all elements"""
    img = Image.new('RGB', (req.width, req.height), req.background)
    draw = ImageDraw.Draw(img)
    
    # Draw strokes
    for s in req.strokes:
        pts = [(p.x, p.y) for p in s.points]
        if len(pts) == 1:
            x, y = pts[0]
            r = s.width
            draw.ellipse((x-r, y-r, x+r, y+r), fill=s.color)
        elif len(pts) > 1:
            draw.line(pts, fill=s.color, width=s.width, joint='curve')
    
    # Draw shapes
    for shape in req.shapes:
        if shape.type == "rectangle":
            if shape.filled:
                draw.rectangle([(shape.x1, shape.y1), (shape.x2, shape.y2)], fill=shape.color)
            else:
                draw.rectangle([(shape.x1, shape.y1), (shape.x2, shape.y2)], outline=shape.color, width=2)
        elif shape.type == "circle":
            if shape.filled:
                draw.ellipse([(shape.x1, shape.y1), (shape.x2, shape.y2)], fill=shape.color)
            else:
                draw.ellipse([(shape.x1, shape.y1), (shape.x2, shape.y2)], outline=shape.color, width=2)
    
    # Draw texts
    for text in req.texts:
        draw.text((text.x, text.y), text.text, fill=text.color)
    
    uid = str(uuid.uuid4())
    out_path = os.path.join(EXPORT_ROOT, f"whiteboard_{uid}.png")
    img.save(out_path)
    
    # Save session
    try:
        sessions = {}
        if os.path.exists(SESSIONS_FILE):
            with open(SESSIONS_FILE, 'r') as f:
                sessions = json.load(f)
        sessions[req.session_id] = req.dict()
        with open(SESSIONS_FILE, 'w') as f:
            json.dump(sessions, f)
    except Exception:
        pass
    
    return {"id": uid, "download_url": f"/files/whiteboard_{uid}.png", "session_id": req.session_id}


@router.post("/ai-assist")
async def ai_assist(req: AIRequest) -> Dict[str, Any]:
    """AI assistance for whiteboard"""
    prompt = req.prompt.lower()
    
    if any(word in prompt for word in ["solve", "calculate", "math"]):
        return {
            "ok": True,
            "type": "math",
            "message": "I can solve math problems! Write an equation and I'll help.",
            "suggestions": ["2x + 5 = 15", "(5 + 3) * 2", "x^2 + 3x + 2"]
        }
    elif any(word in prompt for word in ["draw", "create", "diagram"]):
        return {
            "ok": True,
            "type": "drawing",
            "suggestions": ["Use colors to organize", "Add shapes for structure", "Create mind maps", "Use arrows to show flow"]
        }
    
    return {
        "ok": True,
        "type": "general",
        "message": "I can help with math solving, drawing tips, and diagram creation!",
        "capabilities": ["Solve equations", "Drawing suggestions", "Create diagrams", "Organize information"]
    }


@router.post("/solve-math")
async def solve_math(req: SolveRequest) -> Dict[str, Any]:
    """Solve mathematical expressions with steps"""
    result = _solve_with_steps(req.expression, req.show_steps)
    return {"ok": True, **result}

@router.post("/solve-text")
async def solve_text_problem(req: TextSolveRequest) -> Dict[str, Any]:
    """Solve ALL types of questions: Math, Geometry, GK, Science!"""
    result = await _solve_any_question(req.problem, req.type, req.show_steps)
    return {"ok": True, **result}


async def _solve_any_question(question: str, q_type: str, show_steps: bool) -> Dict[str, Any]:
    """Universal solver for ALL question types - Quick answers first, then EduChat"""
    
    question_lower = question.lower()
    
    # === PRIORITY 1: INSTANT QUICK ANSWERS ===
    # World Capitals
    capitals = {
        'india': 'New Delhi', 'france': 'Paris', 'usa': 'Washington D.C.', 'united states': 'Washington D.C.',
        'china': 'Beijing', 'japan': 'Tokyo', 'uk': 'London', 'united kingdom': 'London',
        'germany': 'Berlin', 'italy': 'Rome', 'spain': 'Madrid', 'russia': 'Moscow',
        'canada': 'Ottawa', 'australia': 'Canberra', 'brazil': 'Brasília', 'mexico': 'Mexico City'
    }
    
    if 'capital' in question_lower:
        for country, capital in capitals.items():
            if country in question_lower:
                return {
                    "result": capital,
                    "answer": f"The capital of {country.title()} is **{capital}**. 🏛️",
                    "category": "Geography - World Capitals",
                    "steps": None
                }
    
    # Science Quick Facts
    if 'h2o' in question_lower or ('water' in question_lower and 'formula' in question_lower):
        return {
            "result": "H₂O",
            "answer": "**H₂O** is water - 2 hydrogen atoms + 1 oxygen atom. Bent molecule (104.5°). Boiling: 100°C, Freezing: 0°C. Essential for all life! 💧",
            "category": "Chemistry",
            "steps": None
        }
    
    if 'photosynthesis' in question_lower:
        return {
            "result": "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂",
            "answer": "**Photosynthesis**: Plants convert light, CO₂, and water into glucose and oxygen. Happens in chloroplasts using chlorophyll. 🌱",
            "category": "Biology",
            "steps": None
        }
    
    if 'dna' in question_lower and not 'rna' in question_lower:
        return {
            "result": "Deoxyribonucleic Acid",
            "answer": "**DNA** is the hereditary material containing genetic instructions. Double helix structure with base pairs A-T and G-C. Found in cell nucleus. 🧬",
            "category": "Biology - Genetics",
            "steps": None
        }
    
    # Math Quick Answers
    if 'pythagorean' in question_lower or 'pythagoras' in question_lower:
        return {
            "result": "a² + b² = c²",
            "answer": "**Pythagorean Theorem**: In a right triangle, the square of the hypotenuse equals the sum of squares of the other two sides. 📐",
            "category": "Geometry",
            "steps": ["Formula: a² + b² = c²", "Where a,b are legs and c is hypotenuse", "Example: If a=3, b=4, then c=√(9+16)=5"],
        }
    
    if 'area' in question_lower and 'circle' in question_lower:
        return {
            "result": "A = πr²",
            "answer": "**Area of circle** = π × radius². Where π ≈ 3.14159. Example: Circle with radius 5 has area = 25π ≈ 78.54 square units. ⭕",
            "category": "Geometry",
            "steps": None
        }
    
    if 'area' in question_lower and 'triangle' in question_lower:
        return {
            "result": "A = ½ × base × height",
            "answer": "**Area of triangle** = ½ × base × height. Example: Triangle with base=6 and height=4 has area = ½(6)(4) = 12 square units. 🔺",
            "category": "Geometry",
            "steps": None
        }
    
    # === PRIORITY 2: MATH EQUATIONS ===
    if any(c in question for c in ['+', '-', '*', '/', '=']) or re.search(r'\d+\s*[x]\s*[+\-*/]', question):
        try:
            math_result = await _solve_advanced_problem(question, 'math', show_steps)
            if math_result and not math_result.get('error'):
                return math_result
        except:
            pass
    
    # === PRIORITY 3: EDUCHAT COMPREHENSIVE KNOWLEDGE ===
    try:
        from app.routers.educhat import KNOWLEDGE_BASE, _detect_educational_context, _extract_knowledge, _generate_intelligent_response
        
        context = _detect_educational_context(question)
        knowledge = _extract_knowledge(question, context)
        answer = _generate_intelligent_response(question, context, knowledge)
        
        # Only use EduChat if it gives a real answer (not generic fallback)
        if answer and not answer.startswith("I don't have specific information") and not answer.startswith("I appreciate your question"):
            return {
                "result": answer[:200] if len(answer) > 200 else answer,
                "answer": answer,
                "category": ", ".join(context) if context else "General Knowledge",
                "steps": None
            }
    except:
        pass
    
    # === PRIORITY 4: FALLBACK ===
    return await _solve_advanced_problem(question, q_type, show_steps)


def _solve_with_steps(expr: str, show_steps: bool = True) -> Dict[str, Any]:
    """Solve expression with step-by-step solution"""
    expr = expr.strip()
    
    # Clean and normalize expression
    expr = expr.replace('×', '*').replace('÷', '/').replace('^', '**')
    expr = re.sub(r'\s+', '', expr)  # Remove spaces
    
    result = {"expression": expr}
    
    # Check if it's an equation (contains =)
    if '=' in expr:
        return _solve_equation(expr, show_steps)
    
    # Try SymPy for symbolic math
    if sp is not None:
        try:
            # Check for calculus operations
            if any(op in expr.lower() for op in ['integrate', 'diff', 'limit', 'derivative']):
                return _solve_calculus(expr, show_steps)
            
            # Parse expression
            sy = sp.sympify(expr)
            
            steps = []
            if show_steps:
                steps.append(f"Original: {expr}")
            
            # Simplify
            simplified = sp.simplify(sy)
            if show_steps and str(simplified) != str(sy):
                steps.append(f"Simplified: {simplified}")
            
            # Evaluate if possible
            try:
                numeric = float(simplified.evalf())
                result['result'] = numeric
                if show_steps:
                    steps.append(f"Result: {numeric}")
            except:
                result['result'] = str(simplified)
                if show_steps:
                    steps.append(f"Result: {simplified}")
            
            if show_steps:
                result['steps'] = steps
            
            return result
            
        except Exception as e:
            # SymPy failed, try other methods
            result['sympy_error'] = str(e)
    
    # Fallback: safe eval for arithmetic
    try:
        # Replace common patterns
        eval_expr = expr.replace('**', '**').replace('^', '**')
        
        # Allow basic math operations only
        allowed_chars = set('0123456789+-*/().** ')
        if all(c in allowed_chars for c in eval_expr):
            val = eval(eval_expr, {"__builtins__": {}}, {})
            result['result'] = val
            if show_steps:
                result['steps'] = [f"Expression: {expr}", f"Result: {val}"]
            return result
    except Exception as e:
        result['eval_error'] = str(e)
    
    # Last resort: return error message
    result['result'] = "Could not evaluate expression. Please check syntax."
    result['error'] = "Invalid expression or unsupported operation"
    result['tip'] = "Try format like: 2+2, 5*3, (10+5)/3, 2x+5=15"
    return result


def _solve_equation(equation: str, show_steps: bool = True) -> Dict[str, Any]:
    """Solve equations like '2x + 5 = 15'"""
    if sp is None:
        return {"expression": equation, "result": "SymPy required for equation solving"}
    
    try:
        # Split by equals sign
        left, right = equation.split('=')
        
        steps = []
        if show_steps:
            steps.append(f"Original equation: {equation}")
        
        # Parse both sides
        left_expr = sp.sympify(left.strip())
        right_expr = sp.sympify(right.strip())
        
        # Find all symbols (variables)
        symbols = list(left_expr.free_symbols.union(right_expr.free_symbols))
        
        if not symbols:
            # No variables, just evaluate both sides
            left_val = float(left_expr.evalf())
            right_val = float(right_expr.evalf())
            return {
                "expression": equation,
                "result": "True" if abs(left_val - right_val) < 1e-10 else "False",
                "left_value": left_val,
                "right_value": right_val,
                "steps": steps if show_steps else None
            }
        
        # Solve for each variable
        solutions = {}
        for symbol in symbols:
            sol = sp.solve(sp.Eq(left_expr, right_expr), symbol)
            solutions[str(symbol)] = [str(s) for s in sol]
            if show_steps:
                steps.append(f"Solve for {symbol}: {', '.join(str(s) for s in sol)}")
        
        return {
            "expression": equation,
            "result": solutions,
            "steps": steps if show_steps else None,
            "type": "equation"
        }
        
    except Exception as e:
        return {"expression": equation, "result": f"Error: {str(e)}"}


def _solve_calculus(expr: str, show_steps: bool = True) -> Dict[str, Any]:
    """Solve calculus problems"""
    if sp is None:
        return {"expression": expr, "result": "SymPy required for calculus"}
    
    try:
        steps = []
        # Detect operation type
        expr_lower = expr.lower()
        
        if 'integrate' in expr_lower or '∫' in expr:
            # Integration
            # Extract function
            match = re.search(r'integrate\((.+?)\)', expr, re.IGNORECASE)
            if match:
                func_str = match.group(1)
                parts = func_str.split(',')
                func = sp.sympify(parts[0])
                var = sp.Symbol(parts[1].strip()) if len(parts) > 1 else sp.Symbol('x')
                
                result_expr = sp.integrate(func, var)
                if show_steps:
                    steps.append(f"Integrate {func} with respect to {var}")
                    steps.append(f"Result: {result_expr} + C")
                
                return {"expression": expr, "result": str(result_expr) + " + C", "steps": steps, "type": "integration"}
        
        elif 'diff' in expr_lower or "'" in expr or '∂' in expr:
            # Differentiation
            match = re.search(r'diff\((.+?)\)', expr, re.IGNORECASE)
            if match:
                func_str = match.group(1)
                parts = func_str.split(',')
                func = sp.sympify(parts[0])
                var = sp.Symbol(parts[1].strip()) if len(parts) > 1 else sp.Symbol('x')
                
                result_expr = sp.diff(func, var)
                if show_steps:
                    steps.append(f"Differentiate {func} with respect to {var}")
                    steps.append(f"Result: {result_expr}")
                
                return {"expression": expr, "result": str(result_expr), "steps": steps, "type": "differentiation"}
        
        return {"expression": expr, "result": "Could not parse calculus expression"}
    except Exception as e:
        return {"expression": expr, "result": f"Error: {str(e)}"}


def _extract_math_expressions(text: str) -> List[str]:
    """Extract mathematical expressions from OCR text"""
    expressions = []
    
    # Clean text - be more aggressive with cleaning
    text = text.replace('×', '*').replace('÷', '/').replace('x', '*')
    text = text.replace('X', '*').replace(' ', '')  # Remove all spaces
    
    # Common OCR corrections
    text = text.replace('O', '0').replace('o', '0')
    text = text.replace('l', '1').replace('I', '1').replace('|', '1')
    text = text.replace('S', '5').replace('s', '5')
    text = text.replace('B', '8').replace('Z', '2')
    text = text.replace('?', '').replace('!', '')
    
    # Find lines with math operators and numbers
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    
    for line in lines:
        # Look for equations or expressions
        if any(op in line for op in ['=', '+', '-', '*', '/', '^', '(', ')']) and any(c.isdigit() for c in line):
            # Clean further
            cleaned = re.sub(r'[^0-9+\-*/()=.x^\s]', '', line)
            if cleaned.strip():
                expressions.append(cleaned.strip())
    
    # If no expressions found, try to extract any numbers with operators
    if not expressions:
        # Look for patterns like "1+1", "2*3", etc.
        patterns = [
            r'\d+\s*\+\s*\d+',  # Addition: 1+1, 1 + 1
            r'\d+\s*\-\s*\d+',  # Subtraction
            r'\d+\s*\*\s*\d+',  # Multiplication
            r'\d+\s*/\s*\d+',   # Division
            r'\d+\s*=\s*\?',    # Equation format: 1+1=?
        ]
        for pattern in patterns:
            matches = re.findall(pattern, text)
            expressions.extend([m.replace(' ', '') for m in matches])
    
    # NEW: If still nothing, try to find consecutive numbers and assume addition
    if not expressions:
        # Look for pattern: digit digit (like "1 1" which might be "1+1")
        numbers = re.findall(r'\d+', text)
        if len(numbers) == 2:
            expressions.append(f"{numbers[0]}+{numbers[1]}")
        elif len(numbers) >= 2:
            # Try first two numbers
            expressions.append(f"{numbers[0]}+{numbers[1]}")
    
    return expressions


def _preprocess_image_multiple(img: Image.Image) -> List[tuple]:
    """Apply multiple preprocessing techniques for better OCR"""
    results = []
    
    # Convert to grayscale
    gray = img.convert('L')
    
    # Technique 1: Simple threshold with different values
    arr = np.array(gray)
    for threshold_val in [128, 150, 180, 200, 220]:
        binary = (arr < threshold_val).astype(np.uint8) * 255
        results.append((Image.fromarray(binary), f'threshold_{threshold_val}'))
    
    # Technique 2: Inverted (white on black)
    inverted_arr = 255 - arr
    results.append((Image.fromarray(inverted_arr), 'inverted'))
    
    # Technique 3: High contrast
    enhanced = ImageEnhance.Contrast(gray).enhance(3.0)
    results.append((enhanced, 'high_contrast'))
    
    # Technique 4: Sharpened
    sharpened = gray.filter(ImageFilter.SHARPEN)
    arr_sharp = np.array(sharpened)
    binary_sharp = (arr_sharp < 180).astype(np.uint8) * 255
    results.append((Image.fromarray(binary_sharp), 'sharpened_binary'))
    
    # Technique 5: Edge enhancement
    edges = gray.filter(ImageFilter.EDGE_ENHANCE_MORE)
    results.append((edges, 'edges'))
    
    return results


async def _solve_with_vision(image_data: bytes) -> Dict[str, Any]:
    """Use OpenAI Vision API to solve problems from image"""
    try:
        import base64
        
        # Encode image
        img_base64 = base64.b64encode(image_data).decode('utf-8')
        
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """Analyze this whiteboard image and solve any mathematical problems or questions you see.
                            
                            Provide:
                            1. The problem/equation you identified
                            2. Step-by-step solution
                            3. Final answer
                            
                            Format as JSON with keys: problem, steps (array), answer"""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{img_base64}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000
        )
        
        content = response.choices[0].message.content
        
        # Try to parse JSON response
        try:
            result = json.loads(content)
            return {
                "success": True,
                "method": "ai_vision",
                **result
            }
        except:
            # Return as text if not JSON
            return {
                "success": True,
                "method": "ai_vision",
                "solution": content
            }
            
    except Exception as e:
        return {"success": False, "error": str(e)}


async def _solve_advanced_problem(problem: str, prob_type: str, show_steps: bool) -> Dict[str, Any]:
    """Solve advanced problems using AI"""
    
    # Try SymPy first for symbolic math
    if prob_type in ['algebra', 'calculus'] and sp is not None:
        if '=' in problem:
            return _solve_equation(problem, show_steps)
        elif any(op in problem.lower() for op in ['integrate', 'diff', 'derivative']):
            return _solve_calculus(problem, show_steps)
    
    # Use OpenAI for word problems or complex questions
    if openai and OPENAI_API_KEY:
        try:
            response = openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a math tutor. Solve the problem step-by-step. Format: Problem | Step 1: ... | Step 2: ... | Answer: ..."
                    },
                    {
                        "role": "user",
                        "content": problem
                    }
                ],
                max_tokens=800
            )
            
            solution = response.choices[0].message.content
            
            # Parse steps
            parts = solution.split('|')
            steps = [p.strip() for p in parts]
            answer = next((s.replace('Answer:', '').strip() for s in steps if 'Answer:' in s), steps[-1])
            
            return {
                "problem": problem,
                "solution": solution,
                "steps": steps if show_steps else None,
                "answer": answer,
                "method": "ai_assistant"
            }
        except Exception as e:
            return {"problem": problem, "error": f"AI solving failed: {str(e)}"}
    
    # Fallback to basic solving
    return _solve_with_steps(problem, show_steps)


def _detect_shapes(img: Image.Image) -> Dict[str, Any]:
    """Detect geometric shapes in the image (triangles, circles, rectangles, etc.)"""
    try:
        # FIRST: Check if there's text/numbers using OCR
        # If OCR finds numbers or operators, skip shape detection
        if pytesseract:
            try:
                quick_text = pytesseract.image_to_string(img, config='--psm 6').strip()
                # If we find any digits or math operators, this is NOT a pure shape
                if any(char in quick_text for char in '0123456789+-*/='):
                    return {"detected": False}
            except:
                pass
        
        # Convert to grayscale and numpy array
        gray = img.convert('L')
        img_array = np.array(gray)
        
        # Simple edge detection - count dark pixels forming closed shapes
        # Threshold: anything darker than 200 is considered drawn
        binary = (img_array < 200).astype(np.uint8) * 255
        
        # Count contiguous regions (shapes)
        # Detect if there are significant dark pixels (a drawing exists)
        dark_pixels = np.sum(binary > 0)
        total_pixels = binary.shape[0] * binary.shape[1]
        coverage = dark_pixels / total_pixels
        
        # If less than 0.1% coverage, no significant drawing (more sensitive)
        if coverage < 0.001:
            return {"detected": False}
        
        # Analyze shape characteristics
        # Find bounding box of the drawing
        rows = np.any(binary > 0, axis=1)
        cols = np.any(binary > 0, axis=0)
        
        if not np.any(rows) or not np.any(cols):
            return {"detected": False}
        
        y_min, y_max = np.where(rows)[0][[0, -1]]
        x_min, x_max = np.where(cols)[0][[0, -1]]
        
        width = x_max - x_min
        height = y_max - y_min
        
        # Require minimum size (at least 30 pixels in each dimension)
        if width < 30 or height < 30:
            return {"detected": False}
        
        aspect_ratio = width / height if height > 0 else 1
        
        # Extract the shape region
        shape_region = binary[y_min:y_max+1, x_min:x_max+1]
        
        # Count corners/vertices - triangles are low density, pointy
        shape_density = np.sum(shape_region > 0) / (width * height) if width > 0 and height > 0 else 0
        
        # Detect based on characteristics (more forgiving ranges)
        if 0.5 <= aspect_ratio <= 1.5 and shape_density < 0.5:
            # Likely a triangle (low density, roughly square aspect ratio, hollow)
            return {
                "detected": True,
                "result": "Triangle 🔺",
                "answer": "**Triangle Detected!**\n\n**Properties:**\n• 3 sides and 3 vertices\n• Sum of interior angles = 180°\n• Area = ½ × base × height\n\n**Types:**\n• Equilateral: All sides equal\n• Isosceles: Two sides equal\n• Scalene: All sides different\n• Right: Has a 90° angle\n\n**Formulas:**\n• Perimeter = a + b + c\n• Area = ½bh or √[s(s-a)(s-b)(s-c)] (Heron's formula)\n• Pythagorean theorem (right triangle): a² + b² = c²",
                "category": "Geometry - Shapes",
                "steps": [
                    "Identified shape as a triangle",
                    "Triangle has 3 sides and 3 angles",
                    "Interior angles always sum to 180°",
                    "Use appropriate formula based on type"
                ]
            }
        elif 0.85 <= aspect_ratio <= 1.15 and shape_density > 0.5:
            # Likely a circle (very symmetric, high density)
            return {
                "detected": True,
                "result": "Circle ⭕",
                "answer": "**Circle Detected!**\n\n**Properties:**\n• All points equidistant from center\n• Infinite lines of symmetry\n• 360 degrees around\n\n**Formulas:**\n• Area = πr²\n• Circumference = 2πr = πd\n• π ≈ 3.14159\n\n**Example:** If radius = 5, Area = 25π ≈ 78.54 square units",
                "category": "Geometry - Shapes",
                "steps": None
            }
        elif aspect_ratio > 1.4 or aspect_ratio < 0.6:
            # Rectangle/square (elongated)
            return {
                "detected": True,
                "result": "Rectangle 📐",
                "answer": "**Rectangle Detected!**\n\n**Properties:**\n• 4 sides, opposite sides equal\n• All angles are 90°\n• If all sides equal = Square\n\n**Formulas:**\n• Area = length × width\n• Perimeter = 2(l + w)\n• Square: A = s², P = 4s",
                "category": "Geometry - Shapes",
                "steps": None
            }
        else:
            # Generic shape
            return {
                "detected": True,
                "result": "Geometric Shape",
                "answer": "**Shape Detected!** 🔷\n\nI can see you drew a geometric shape! Common shapes:\n• Triangle 🔺: 3 sides, angles = 180°\n• Circle ⭕: A = πr²\n• Rectangle 📐: A = l×w\n• Square ⬜: A = s²\n\nType your geometry question below for detailed help!",
                "category": "Geometry",
                "steps": None
            }
    
    except Exception:
        return {"detected": False}


@router.post("/solve")
async def solve_board(image: UploadFile = File(...)) -> Dict[str, Any]:
    """Solve problems from whiteboard image using OCR, shape detection, and AI"""
    data = await image.read()
    try:
        img = Image.open(io.BytesIO(data))
    except Exception:
        return {"error": "Invalid image"}
    
    # FIRST: Try shape detection (triangles, circles, rectangles, etc.)
    shape_result = _detect_shapes(img)
    if shape_result.get('detected'):
        return shape_result
    
    # Try OpenAI Vision API for complex problems
    if openai and OPENAI_API_KEY:
        vision_result = await _solve_with_vision(data)
        if vision_result.get('success'):
            return vision_result
    
    # Fallback to OCR with advanced preprocessing
    if pytesseract is None:
        return {"error": "OCR unavailable. Install Tesseract or set OPENAI_API_KEY for AI solving."}
    
    # Try multiple preprocessing techniques
    ocr_results = []
    all_text = []
    
    for processed_img, method in _preprocess_image_multiple(img):
        try:
            # Try different PSM modes
            for psm in [6, 7, 8, 11, 13]:
                text = pytesseract.image_to_string(processed_img, config=f'--psm {psm} -c tessedit_char_whitelist=0123456789+-*/=.()x ')
                if text.strip():
                    ocr_results.append({'text': text.strip(), 'method': f'{method}_psm{psm}'})
                    all_text.append(text.strip())
        except Exception:
            pass
    
    if not ocr_results:
        # Try solving simple expressions directly from image analysis
        return {
            "error": "No text or shapes detected. Please draw clearer or use the text input box below.", 
            "tip": "Tips for better recognition:\n• Draw LARGER (use more of the canvas)\n• Use THICKER pen (marker mode)\n• Write in BLACK on WHITE background\n• Write clearly: '1+1' or '2*3'\n• Use the text input box for guaranteed results",
            "quick_solve": "Type your math problem in the text input box and click 'Solve Text Problem' for instant results!",
            "example": "Try typing: 1+1, 2*3, 10/2, (5+3)*2"
        }
    
    # Combine all OCR results
    combined_text = ' '.join(all_text)
    
    # Extract math expressions
    expressions = _extract_math_expressions(combined_text)
    
    if not expressions:
        # Try to find any numeric content
        numbers = re.findall(r'\d+', combined_text)
        if len(numbers) >= 2:
            # Assume addition if we have two numbers
            expr = f"{numbers[0]}+{numbers[1]}"
            expressions = [expr]
    
    if not expressions:
        return {
            "ocr": combined_text, 
            "ocr_detected": "Yes - but no math found",
            "error": "No mathematical expressions detected in the text",
            "tip": "I saw text but couldn't find math. Try:\n• Writing operators clearly: + - * / =\n• Format: '1+1' or '2*3=?' or '5-2'\n• Use the TEXT INPUT BOX below for guaranteed accuracy!",
            "detected_text": combined_text[:100],
            "suggestion": "Use the text input box and type: 1+1, 2*3, 10/2, etc."
        }
    
    # Solve each expression
    solutions = []
    for expr in expressions:
        sol = _solve_with_steps(expr, True)
        solutions.append(sol)
    
    return {
        "ocr": combined_text,
        "expressions_found": len(expressions),
        "solutions": solutions,
        "primary_answer": solutions[0]['result'] if solutions else "Could not solve",
        "method": ocr_results[0]['method'] if ocr_results else "unknown"
    }
