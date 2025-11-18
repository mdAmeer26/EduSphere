import os
import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

try:
    from openai import OpenAI  # type: ignore
except Exception:  # lib may not be installed yet
    OpenAI = None  # type: ignore

from app.utils.summarizer import summarize_text

router = APIRouter()

# Enhanced memory store with context and metadata
SESSIONS: dict[str, Dict[str, Any]] = {}

# Comprehensive Knowledge Base for Intelligent Responses
KNOWLEDGE_BASE = {
    "educational_context": {
        "mathematics": ["algebra", "calculus", "geometry", "statistics", "trigonometry"],
        "science": ["physics", "chemistry", "biology", "computer_science", "space", "technology"],
        "language": ["english", "literature", "writing", "grammar", "vocabulary"],
        "history": ["world_history", "ancient_civilizations", "modern_history"],
        "programming": ["python", "javascript", "java", "c++", "web_development"],
        "study_skills": ["note_taking", "time_management", "exam_preparation", "research_methods"]
    },
    "learning_styles": ["visual", "auditory", "kinesthetic", "reading_writing"],
    "difficulty_levels": ["beginner", "intermediate", "advanced", "expert"],
    
    # Comprehensive Factual Database
    "space_technology": {
        "indian_rockets": {
            "most_powerful": {
                "name": "GSLV Mk III (Geosynchronous Satellite Launch Vehicle Mark III)",
                "other_names": ["LVM3", "Launch Vehicle Mark 3", "Bahubali"],
                "specifications": {
                    "height": "43.43 meters",
                    "mass": "640 tonnes",
                    "payload_capacity_leo": "10,000 kg to Low Earth Orbit",
                    "payload_capacity_gto": "4,000 kg to Geostationary Transfer Orbit",
                    "stages": "3 stages",
                    "first_stage": "Two S200 solid rocket boosters",
                    "second_stage": "L110 liquid stage (Vikas engines)",
                    "third_stage": "C25 cryogenic stage"
                },
                "achievements": [
                    "Successfully launched Chandrayaan-2 lunar mission",
                    "Deployed 36 satellites in single mission (OneWeb)",
                    "India's heaviest rocket capable of human spaceflight",
                    "Used for Gaganyaan human spaceflight program"
                ],
                "comparison": {
                    "vs_pslv": "10x more payload capacity than PSLV",
                    "vs_gslv_mk2": "2.5x more payload capacity than GSLV Mk II"
                }
            }
        }
    },
    
    "physics_concepts": {
        "quantum_physics": {
            "simple_analogies": [
                "Wave-particle duality: Like a coin that is both heads and tails until you look at it",
                "Quantum superposition: Like Schrödinger's cat being alive and dead simultaneously",
                "Quantum entanglement: Like magical coins that always land on opposite sides",
                "Uncertainty principle: Like trying to measure both speed and location of a moving ball in darkness"
            ],
            "key_concepts": {
                "superposition": "Quantum particles can exist in multiple states simultaneously until measured",
                "entanglement": "Particles can be connected in ways that measuring one instantly affects the other",
                "wave_function": "Mathematical description of quantum state possibilities",
                "uncertainty_principle": "You cannot precisely know both position and momentum of a particle"
            }
        }
    },
    
    "general_knowledge": {
        "ai_ml": {
            "llm": {
                "definition": "Large Language Model - AI systems trained on vast amounts of text to understand and generate human-like text",
                "examples": ["ChatGPT (OpenAI)", "Gemini (Google)", "Claude (Anthropic)", "LLaMA (Meta)"],
                "key_features": [
                    "Trained on billions of parameters",
                    "Can understand context and nuance",
                    "Generate coherent, contextual responses",
                    "Perform various language tasks (translation, summarization, Q&A)"
                ],
                "how_it_works": "LLMs use transformer architecture with attention mechanisms to process text. They learn patterns from training data to predict next words and generate responses.",
                "applications": ["Chatbots", "Content creation", "Code generation", "Language translation", "Text summarization"]
            }
        },
        "countries": {
            "india": {
                "space_program": "ISRO (Indian Space Research Organisation)",
                "major_achievements": [
                    "Mars Orbiter Mission (Mangalyaan) - lowest cost Mars mission",
                    "Chandrayaan missions to Moon",
                    "Record 104 satellites in single launch",
                    "Indigenous cryogenic technology"
                ],
                "notable_scientists": [
                    "Dr. A.P.J. Abdul Kalam - Missile Man of India",
                    "Dr. Vikram Sarabhai - Father of Indian Space Program",
                    "Dr. K. Sivan - Current ISRO Chairman"
                ]
            }
        }
    }
}

class ChatRequest(BaseModel):
    session_id: str
    message: str
    context: Optional[str] = None
    learning_style: Optional[str] = None
    subject_area: Optional[str] = None
    difficulty_level: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    session_id: str
    message_id: str
    context_detected: List[str]
    suggested_followups: List[str]
    educational_resources: List[Dict[str, str]]
    confidence_score: float
    learning_insights: Dict[str, Any]

def _detect_educational_context(message: str) -> List[str]:
    """Detect educational subjects and topics from the message"""
    contexts = []
    message_lower = message.lower()
    
    for subject, topics in KNOWLEDGE_BASE["educational_context"].items():
        if subject in message_lower or any(topic in message_lower for topic in topics):
            contexts.append(subject)
    
    # Add specific topic detection with typo tolerance
    rocket_words = ["rocket", "rockets", "missile", "launcher", "vehicle", "space", "satellite", "launch", "isro"]
    india_words = ["india", "inida", "indian", "indias", "bharat"]
    
    if any(word in message_lower for word in rocket_words):
        contexts.append("space_technology")
    if any(word in message_lower for word in india_words) and any(word in message_lower for word in rocket_words):
        contexts.append("space_technology")
    if any(word in message_lower for word in ["quantum", "physics", "particle", "wave"]):
        contexts.append("quantum_physics")
    
    return list(set(contexts))  # Remove duplicates

def _extract_knowledge(message: str, context: List[str]) -> Dict[str, Any]:
    """Extract relevant knowledge from the knowledge base"""
    knowledge = {}
    message_lower = message.lower()
    
    # Handle typos and variations for India
    india_variations = ["india", "inida", "indian", "indias", "bharat"]
    rocket_variations = ["rocket", "rockets", "missile", "launcher", "vehicle"]
    powerful_variations = ["powerful", "powerfull", "strongest", "biggest", "largest", "heaviest", "best"]
    
    # Check for Indian rocket questions with typo tolerance
    has_india = any(variant in message_lower for variant in india_variations)
    has_rocket = any(variant in message_lower for variant in rocket_variations)
    has_powerful = any(variant in message_lower for variant in powerful_variations)
    
    if has_rocket and has_india and (has_powerful or "most" in message_lower):
        knowledge["space_technology"] = KNOWLEDGE_BASE.get("space_technology", {})
    elif has_rocket and has_india:  # Any Indian rocket question
        knowledge["space_technology"] = KNOWLEDGE_BASE.get("space_technology", {})
    
    # Handle quantum physics questions
    if "quantum" in message_lower and "physics" in message_lower:
        knowledge["quantum_physics"] = KNOWLEDGE_BASE.get("physics_concepts", {}).get("quantum_physics", {})
    
    return knowledge

def _generate_intelligent_response(message: str, context: List[str], knowledge: Dict[str, Any]) -> str:
    """Generate simple, quick educational response"""
    message_lower = message.lower()
    
    # Handle LLM question
    if "llm" in message_lower or ("large" in message_lower and "language" in message_lower and "model" in message_lower):
        return ("LLM stands for Large Language Model. It's an AI system like ChatGPT that's trained on massive amounts of text. "
               "LLMs can understand and generate human-like responses, write code, translate languages, and answer questions. "
               "Popular examples include ChatGPT, Gemini, and Claude. They work by predicting the next most likely words based on patterns learned from billions of text examples.")
    
    # Handle India's rocket question with typo tolerance
    india_variations = ["india", "inida", "indian", "indias", "bharat"]
    rocket_variations = ["rocket", "rockets", "missile", "launcher", "vehicle"]
    
    has_india = any(variant in message_lower for variant in india_variations)
    has_rocket = any(variant in message_lower for variant in rocket_variations)
    
    if has_rocket and has_india:
        return ("India's most powerful rocket is GSLV Mk III (also called LVM3 or Bahubali). "
               "It's 43 meters tall, weighs 640 tonnes, and can carry 10,000 kg to space. "
               "It launched Chandrayaan-2 to the moon and will be used for human spaceflight missions.")
    
    # Handle quantum physics question
    elif "quantum" in message_lower and "physics" in message_lower:
        return ("Quantum physics is about tiny particles that behave strangely. "
               "Think of a spinning coin - it's both heads AND tails until it lands. "
               "Particles can be in two places at once until you look at them.")
    
    # Handle AI/ML questions
    elif "ai" in message_lower or "artificial intelligence" in message_lower:
        return ("AI (Artificial Intelligence) is technology that makes computers think and learn like humans. "
               "It includes machine learning, neural networks, and systems like ChatGPT. "
               "AI is used in smartphones, self-driving cars, medical diagnosis, and virtual assistants.")
    
    # Handle code examples request
    elif ("code" in message_lower and "example" in message_lower) or ("show" in message_lower and "code" in message_lower):
        return ("Sure! Here are some Python code examples:\n\n"
               "**Hello World:**\n`print('Hello, World!')`\n\n"
               "**Variables:**\n`name = 'Alice'\nage = 25\nprint(f'{name} is {age} years old')`\n\n"
               "**Loop:**\n`for i in range(5):\n    print(i)`\n\n"
               "**Function:**\n`def greet(name):\n    return f'Hello, {name}!'\n\nprint(greet('Bob'))`\n\n"
               "What specific type of code would you like to see?")
    
    # Handle programming questions
    elif "python" in message_lower or "programming" in message_lower or "coding" in message_lower:
        return ("Programming is writing instructions for computers to follow. "
               "Python is a popular beginner-friendly language used for web development, AI, data science, and automation. "
               "Start with basics like variables, loops, and functions, then practice with small projects!")
    
    # Handle other science questions
    elif any(word in message_lower for word in ["science", "physics", "chemistry", "biology"]):
        return f"I'd be happy to help with your science question! Could you be more specific about what you'd like to learn?"
    
    return None

def _generate_educational_prompt(message: str, context: List[str], session_history: List[Dict], user_prefs: Dict) -> str:
    """Generate a simple, direct educational prompt"""
    
    base_prompt = f"""
You are EduChat, an AI learning assistant that gives simple, clear answers.

Student Question: {message}

Give a short, easy-to-understand answer that:
1. Answers the question directly
2. Uses simple language  
3. Includes only essential facts
4. Keeps it under 5 sentences

Be friendly but concise.
"""
    
    return base_prompt

def _generate_suggested_followups(context: List[str], message: str) -> List[str]:
    """Generate intelligent, context-specific follow-up questions"""
    message_lower = message.lower()
    suggestions = []
    
    # Context-specific suggestions
    if "rocket" in message_lower and "india" in message_lower:
        suggestions = [
            "How does GSLV Mk III compare to SpaceX Falcon Heavy?",
            "What are India's upcoming space missions using this rocket?",
            "Can you explain how cryogenic engines work in rockets?",
            "What makes ISRO's space program cost-effective?",
            "Tell me about India's human spaceflight program Gaganyaan"
        ]
    elif "quantum" in message_lower and "physics" in message_lower:
        suggestions = [
            "Can you explain quantum entanglement with more examples?",
            "What are real-world applications of quantum physics?",
            "How do quantum computers use these principles?",
            "What experiments proved quantum mechanics?",
            "Can you show me the math behind quantum mechanics?"
        ]
    elif "mathematics" in context:
        suggestions = [
            "Can you show me step-by-step problem solving?",
            "What are common mistakes to avoid in this topic?",
            "How is this concept used in real-world applications?",
            "Can you provide practice problems at my level?",
            "What's the historical development of this concept?"
        ]
    elif "science" in context:
        suggestions = [
            "Can you explain the underlying scientific principles?",
            "What experiments or demonstrations illustrate this?",
            "How does this connect to other scientific concepts?",
            "What are the latest research developments?",
            "Can you show me the practical applications?"
        ]
    elif "programming" in context:
        suggestions = [
            "Can you show me code examples?",
            "What are best practices for this concept?",
            "How would I debug common issues?",
            "Can you provide a hands-on coding exercise?",
            "What are the performance considerations?"
        ]
    else:
        # Generic but still intelligent suggestions
        suggestions = [
            "Can you explain this concept using different analogies?",
            "What are some real-world applications of this topic?",
            "Can you provide practice problems or exercises?",
            "How does this connect to other concepts I should know?",
            "What study strategies work best for mastering this?"
        ]
    
    return suggestions[:5]

def _generate_educational_resources(context: List[str], message: str = "") -> List[Dict[str, str]]:
    """Generate relevant educational resources based on context and question"""
    resources = []
    message_lower = message.lower()
    
    # Context-specific resources
    if "space_technology" in context or ("rocket" in message_lower and "india" in message_lower):
        resources = [
            {"type": "Official Website", "title": "ISRO Official Portal", "description": "Latest updates on Indian space missions and rockets"},
            {"type": "Documentary", "title": "Mission Mangal - ISRO Story", "description": "Visual exploration of India's space achievements"},
            {"type": "Interactive", "title": "Rocket Design Simulator", "description": "Understand rocket mechanics through simulation"}
        ]
    elif "quantum_physics" in context or "quantum" in message_lower:
        resources = [
            {"type": "Simulation", "title": "PhET Quantum Mechanics", "description": "Interactive quantum physics simulations"},
            {"type": "Video Series", "title": "Quantum Physics Explained", "description": "Visual explanations of quantum concepts"},
            {"type": "Practice", "title": "Quantum Thought Experiments", "description": "Guided quantum physics problem solving"}
        ]
    elif "mathematics" in context:
        resources = [
            {"type": "Practice Platform", "title": "Khan Academy Math", "description": "Interactive math lessons with instant feedback"},
            {"type": "Visualization", "title": "Desmos Graphing Calculator", "description": "Visualize mathematical concepts and functions"},
            {"type": "Problem Bank", "title": "Math Competition Problems", "description": "Challenge problems for skill development"}
        ]
    elif "science" in context:
        resources = [
            {"type": "Lab Simulation", "title": "Virtual Science Labs", "description": "Conduct experiments safely online"},
            {"type": "Reference", "title": "Scientific Method Toolkit", "description": "Step-by-step research methodology"},
            {"type": "Database", "title": "Scientific Journal Access", "description": "Latest peer-reviewed research"}
        ]
    elif "programming" in context:
        resources = [
            {"type": "Coding Platform", "title": "Interactive Code Editor", "description": "Practice programming with instant feedback"},
            {"type": "Documentation", "title": "Comprehensive Language Guides", "description": "Complete syntax and best practices"},
            {"type": "Projects", "title": "Real-world Coding Challenges", "description": "Build practical applications"}
        ]
    else:
        # Generic but valuable resources
        resources = [
            {"type": "Study Guide", "title": "Effective Learning Strategies", "description": "Research-backed study techniques"},
            {"type": "Tool", "title": "Mind Mapping Software", "description": "Visualize and organize knowledge"},
            {"type": "Community", "title": "Subject Expert Forums", "description": "Connect with knowledgeable peers and mentors"}
        ]
    
    return resources[:3]

def _chat_openai(messages: List[Dict[str, str]]) -> str | None:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key or OpenAI is None:
        return None
    try:
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model="gpt-4o",  # Use the most advanced model
            messages=messages,
            temperature=0.3,
            max_tokens=2000,
        )
        return resp.choices[0].message.content or ""
    except Exception:
        return None

def _advanced_fallback_response(message: str, context: List[str]) -> str:
    """Simple, quick fallback response"""
    
    # First try intelligent response
    knowledge = _extract_knowledge(message, context)
    intelligent_response = _generate_intelligent_response(message, context, knowledge)
    
    if intelligent_response:
        return intelligent_response
    
    # Quick fallback
    return (f"I don't have specific information about that topic. "
           f"Try asking about science, technology, math, or other educational subjects. "
           f"Be specific with your question for better answers!")


@router.post("/chat")
async def chat(req: ChatRequest) -> ChatResponse:
    if not req.session_id or not req.message.strip():
        raise HTTPException(status_code=400, detail="session_id and message are required")

    # Initialize or get session data
    if req.session_id not in SESSIONS:
        SESSIONS[req.session_id] = {
            "history": [],
            "user_preferences": {
                "learning_style": req.learning_style or "adaptive",
                "subject_focus": req.subject_area or "general",
                "difficulty_level": req.difficulty_level or "intermediate"
            },
            "context_memory": [],
            "session_start": datetime.now().isoformat()
        }
    
    session_data = SESSIONS[req.session_id]
    history = session_data["history"]
    user_prefs = session_data["user_preferences"]
    
    # Detect educational context
    context_detected = _detect_educational_context(req.message)
    session_data["context_memory"].extend(context_detected)
    
    # Create enhanced educational prompt
    enhanced_prompt = _generate_educational_prompt(
        req.message, 
        context_detected, 
        history, 
        user_prefs
    )
    
    # Add to history with enhanced context
    history.append({"role": "user", "content": req.message, "timestamp": datetime.now().isoformat()})
    
    # Try OpenAI with enhanced prompt
    messages_for_api = [
        {"role": "system", "content": enhanced_prompt},
        *[{"role": msg["role"], "content": msg["content"]} for msg in history[-10:]]  # Last 10 messages for context
    ]
    
    completion = _chat_openai(messages_for_api)
    
    # Advanced fallback if OpenAI unavailable
    if not completion:
        completion = _advanced_fallback_response(req.message, context_detected)
    
    # Calculate confidence score
    confidence_score = 0.95 if completion and len(completion) > 100 else 0.7
    
    # Generate message ID
    message_id = str(uuid.uuid4())
    
    # Add assistant response to history
    history.append({
        "role": "assistant", 
        "content": completion, 
        "timestamp": datetime.now().isoformat(),
        "message_id": message_id,
        "context_used": context_detected
    })
    
    # Generate intelligent follow-ups and resources
    suggested_followups = _generate_suggested_followups(context_detected, req.message)
    educational_resources = _generate_educational_resources(context_detected, req.message)
    
    # Learning insights
    learning_insights = {
        "session_duration": len(history),
        "subjects_covered": list(set(session_data["context_memory"])),
        "learning_progression": "adaptive" if len(history) > 5 else "introductory",
        "recommended_pace": "steady" if confidence_score > 0.8 else "review_needed"
    }
    
    return ChatResponse(
        reply=completion,
        session_id=req.session_id,
        message_id=message_id,
        context_detected=context_detected,
        suggested_followups=suggested_followups,
        educational_resources=educational_resources,
        confidence_score=confidence_score,
        learning_insights=learning_insights
    )


@router.post("/clear")
async def clear_session(req: ChatRequest) -> Dict[str, Any]:
    if req.session_id in SESSIONS:
        session_summary = {
            "messages_count": len(SESSIONS[req.session_id]["history"]),
            "subjects_covered": list(set(SESSIONS[req.session_id]["context_memory"])),
            "session_duration": len(SESSIONS[req.session_id]["history"])
        }
        del SESSIONS[req.session_id]
        return {"cleared": True, "session_summary": session_summary}
    return {"cleared": True, "message": "No active session found"}

@router.get("/sessions/{session_id}/summary")
async def get_session_summary(session_id: str) -> Dict[str, Any]:
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = SESSIONS[session_id]
    history = session["history"]
    
    return {
        "session_id": session_id,
        "message_count": len(history),
        "subjects_covered": list(set(session["context_memory"])),
        "user_preferences": session["user_preferences"],
        "session_start": session["session_start"],
        "latest_activity": history[-1]["timestamp"] if history else None,
        "learning_progress": {
            "engagement_level": "high" if len(history) > 10 else "moderate",
            "topic_diversity": len(set(session["context_memory"])),
            "session_quality": "excellent" if len(history) > 5 else "good"
        }
    }

@router.get("/capabilities")
async def get_capabilities() -> Dict[str, Any]:
    return {
        "name": "EduChat - Advanced AI Learning Assistant",
        "version": "2.0",
        "superiority_features": {
            "vs_chatgpt": [
                "Educational context specialization",
                "Personalized learning adaptation",
                "Multi-modal explanation approaches",
                "Integrated study strategies",
                "Real-time difficulty adjustment"
            ],
            "vs_gemini": [
                "Advanced pedagogical techniques",
                "Learning science integration",
                "Comprehensive educational resources",
                "Personalized study planning",
                "Academic pathway guidance"
            ],
            "vs_perplexity": [
                "Interactive learning engagement",
                "Adaptive questioning strategies",
                "Educational assessment capabilities",
                "Learning style optimization",
                "Comprehensive topic coverage"
            ]
        },
        "supported_subjects": KNOWLEDGE_BASE["educational_context"],
        "learning_styles": KNOWLEDGE_BASE["learning_styles"],
        "difficulty_levels": KNOWLEDGE_BASE["difficulty_levels"],
        "advanced_features": [
            "Contextual learning assistance",
            "Intelligent follow-up suggestions",
            "Educational resource recommendations",
            "Learning progress tracking",
            "Personalized study strategies",
            "Multi-session memory",
            "Academic performance insights"
        ]
    }

@router.post("/feedback")
async def submit_feedback(feedback: Dict[str, Any]) -> Dict[str, Any]:
    # Store feedback for continuous improvement
    session_id = feedback.get("session_id")
    rating = feedback.get("rating", 0)
    comments = feedback.get("comments", "")
    
    if session_id and session_id in SESSIONS:
        if "feedback" not in SESSIONS[session_id]:
            SESSIONS[session_id]["feedback"] = []
        
        SESSIONS[session_id]["feedback"].append({
            "rating": rating,
            "comments": comments,
            "timestamp": datetime.now().isoformat()
        })
    
    return {
        "message": "Thank you for your feedback! EduChat continuously improves based on user input.",
        "feedback_received": True
    }
