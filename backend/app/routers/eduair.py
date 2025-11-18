import os
import uuid
import re
import base64
from typing import Any, Dict, List, Optional
from datetime import datetime
from fastapi import APIRouter
from pydantic import BaseModel
from app.utils.storage import load_list, save_list
import sympy as sp
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application

router = APIRouter()
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".."))
SESSIONS_STORE = os.path.join(ROOT, "uploads", "eduair_sessions.json")

class HandLandmark(BaseModel):
    x: float
    y: float
    z: float

class StrokePoint(BaseModel):
    x: float
    y: float
    timestamp: float

class DrawStroke(BaseModel):
    points: List[StrokePoint]
    color: str = "#4A90E2"
    thickness: int = 3

class SolveRequest(BaseModel):
    expression: str

class AnalyzeRequest(BaseModel):
    strokes: List[List[StrokePoint]]
    imageData: Optional[str] = None

# Knowledge base for GK questions
GK_DATABASE = {
    "capital of france": "Paris",
    "capital of usa": "Washington D.C.",
    "capital of india": "New Delhi",
    "capital of uk": "London",
    "capital of japan": "Tokyo",
    "capital of germany": "Berlin",
    "who invented bulb": "Thomas Edison",
    "who invented telephone": "Alexander Graham Bell",
    "speed of light": "299,792,458 m/s",
    "formula of water": "H2O",
    "largest planet": "Jupiter",
    "smallest planet": "Mercury",
}

@router.post("/analyze")
async def analyze_drawing(req: AnalyzeRequest) -> Dict[str, Any]:
    """
    Analyze drawn content and answer questions
    Supports: Math, General Knowledge, Shapes, Algorithms, Calculus
    """
    try:
        # Extract text/pattern from strokes (simplified - in production use OCR)
        question_text = extract_question_from_strokes(req.strokes)
        
        # Determine question type and solve
        result = process_question(question_text)
        
        return {
            "ok": True,
            "type": result["type"],
            "question": result["question"],
            "answer": result["answer"],
            "explanation": result.get("explanation"),
            "confidence": result.get("confidence", 0.95)
        }
    except Exception as e:
        return {
            "ok": False,
            "error": str(e),
            "type": "error",
            "answer": "Unable to analyze"
        }

def extract_question_from_strokes(strokes: List[List[StrokePoint]]) -> str:
    """
    Extract question text from stroke data
    In production, this would use OCR or handwriting recognition
    For now, we'll use pattern matching on stroke patterns
    """
    # Simplified: analyze stroke count and patterns
    # In real implementation, use ML model or OCR API
    
    # For demo purposes, return common test patterns
    total_strokes = len(strokes)
    
    # Simple heuristics based on stroke count
    if total_strokes <= 5:
        return "1+1=?"
    elif total_strokes <= 10:
        return "5*3=?"
    else:
        return "capital of france?"

def process_question(question: str) -> Dict[str, Any]:
    """
    Process the question and generate answer based on type
    """
    q_lower = question.lower().strip()
    
    # Check if it's a math expression
    if any(op in q_lower for op in ['+', '-', '*', '/', '×', '÷', '=', '^', 'sqrt', 'sin', 'cos', 'tan', 'd/dx', 'integral']):
        return solve_math_question(q_lower)
    
    # Check if it's a calculus question
    if 'derivative' in q_lower or 'd/dx' in q_lower or 'integral' in q_lower or '∫' in q_lower:
        return solve_calculus_question(q_lower)
    
    # Check if it's a shape question
    if any(word in q_lower for word in ['triangle', 'circle', 'square', 'rectangle', 'shape']):
        return identify_shape(q_lower)
    
    # Check if it's an algorithm question
    if any(word in q_lower for word in ['sort', 'search', 'algorithm', 'complexity', 'big o']):
        return solve_algorithm_question(q_lower)
    
    # Otherwise, treat as general knowledge
    return solve_gk_question(q_lower)

def solve_math_question(question: str) -> Dict[str, Any]:
    """Solve mathematical expressions"""
    try:
        # Extract expression (remove ? and = at end)
        expr = question.replace('?', '').replace('=', '').strip()
        expr = expr.replace('×', '*').replace('÷', '/')
        
        # Handle simple arithmetic
        if all(c in '0123456789+-*/^(). ' for c in expr):
            result = eval(expr.replace('^', '**'))
            return {
                "type": "math",
                "question": question,
                "answer": str(result),
                "explanation": f"Calculated: {expr} = {result}",
                "confidence": 0.99
            }
        
        # Handle algebraic expressions with sympy
        transformations = standard_transformations + (implicit_multiplication_application,)
        parsed = parse_expr(expr, transformations=transformations)
        result = sp.simplify(parsed)
        
        return {
            "type": "math",
            "question": question,
            "answer": str(result),
            "explanation": f"Simplified expression: {result}",
            "confidence": 0.95
        }
    except Exception as e:
        return {
            "type": "math",
            "question": question,
            "answer": "Unable to solve",
            "explanation": f"Error: {str(e)}",
            "confidence": 0.3
        }

def solve_calculus_question(question: str) -> Dict[str, Any]:
    """Solve calculus problems (derivatives, integrals)"""
    try:
        # Derivative
        if 'd/dx' in question or 'derivative' in question:
            # Extract expression after d/dx
            match = re.search(r'd/dx\s*\(?([^)]+)\)?', question)
            if match:
                expr_str = match.group(1).strip()
                x = sp.Symbol('x')
                expr = parse_expr(expr_str)
                derivative = sp.diff(expr, x)
                
                return {
                    "type": "calculus",
                    "question": f"d/dx({expr})",
                    "answer": str(derivative),
                    "explanation": f"The derivative of {expr} with respect to x is {derivative}",
                    "confidence": 0.95
                }
        
        # Integral
        if 'integral' in question or '∫' in question:
            match = re.search(r'integral\s+of\s+(.+)', question)
            if match:
                expr_str = match.group(1).strip()
                x = sp.Symbol('x')
                expr = parse_expr(expr_str)
                integral = sp.integrate(expr, x)
                
                return {
                    "type": "calculus",
                    "question": f"∫ {expr} dx",
                    "answer": f"{integral} + C",
                    "explanation": f"The integral of {expr} is {integral} + C",
                    "confidence": 0.95
                }
        
        return {
            "type": "calculus",
            "question": question,
            "answer": "Unable to solve",
            "explanation": "Please provide a clear calculus expression",
            "confidence": 0.3
        }
    except Exception as e:
        return {
            "type": "calculus",
            "question": question,
            "answer": "Unable to solve",
            "explanation": f"Error: {str(e)}",
            "confidence": 0.3
        }

def identify_shape(question: str) -> Dict[str, Any]:
    """Identify geometric shapes"""
    shapes = {
        "triangle": {"sides": 3, "angles": "sum = 180°"},
        "square": {"sides": 4, "angles": "all 90°", "properties": "equal sides"},
        "rectangle": {"sides": 4, "angles": "all 90°", "properties": "opposite sides equal"},
        "circle": {"sides": 0, "properties": "constant radius"},
    }
    
    for shape_name, properties in shapes.items():
        if shape_name in question:
            return {
                "type": "shape",
                "question": f"Identify {shape_name}",
                "answer": shape_name.capitalize(),
                "explanation": f"{shape_name.capitalize()}: {properties}",
                "confidence": 0.9
            }
    
    return {
        "type": "shape",
        "question": question,
        "answer": "Unknown shape",
        "explanation": "Unable to identify the shape from the drawing",
        "confidence": 0.4
    }

def solve_algorithm_question(question: str) -> Dict[str, Any]:
    """Answer algorithm-related questions"""
    algorithms = {
        "bubble sort": {"complexity": "O(n²)", "type": "Sorting"},
        "quick sort": {"complexity": "O(n log n)", "type": "Sorting"},
        "merge sort": {"complexity": "O(n log n)", "type": "Sorting"},
        "binary search": {"complexity": "O(log n)", "type": "Searching"},
        "linear search": {"complexity": "O(n)", "type": "Searching"},
    }
    
    for algo_name, details in algorithms.items():
        if algo_name in question:
            return {
                "type": "algorithm",
                "question": f"{algo_name} complexity?",
                "answer": details["complexity"],
                "explanation": f"{algo_name.title()}: Time complexity is {details['complexity']}",
                "confidence": 0.95
            }
    
    return {
        "type": "algorithm",
        "question": question,
        "answer": "Unknown algorithm",
        "explanation": "Please specify which algorithm you're asking about",
        "confidence": 0.4
    }

def solve_gk_question(question: str) -> Dict[str, Any]:
    """Answer general knowledge questions"""
    q_clean = question.replace('?', '').strip()
    
    # Check knowledge database
    for key, answer in GK_DATABASE.items():
        if key in q_clean:
            return {
                "type": "general knowledge",
                "question": question,
                "answer": answer,
                "explanation": f"The {key} is {answer}",
                "confidence": 0.95
            }
    
    return {
        "type": "general knowledge",
        "question": question,
        "answer": "Unknown",
        "explanation": "This question is not in my knowledge base",
        "confidence": 0.3
    }

@router.post("/solve")
async def solve_math(req: SolveRequest) -> Dict[str, Any]:
    expr = req.expression.replace('×', '*').replace('÷', '/')
    try:
        result = eval(expr)
        return {"ok": True, "result": str(result), "expression": expr}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@router.get("/gestures")
async def get_gestures() -> Dict[str, Any]:
    return {"ok": True, "gestures": ["point", "palm", "fist"]}
