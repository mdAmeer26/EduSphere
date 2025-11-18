import os
import uuid
from typing import Any, Dict
from datetime import datetime

from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel

from app.utils.storage import load_list, save_list

router = APIRouter()

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".."))
CIRCUITS_STORE = os.path.join(ROOT, "uploads", "circuits.json")


class CircuitComponent(BaseModel):
    type: str  # resistor, capacitor, battery, led, wire, etc.
    value: str = ""
    x: float
    y: float


class CircuitRequest(BaseModel):
    name: str
    components: list[CircuitComponent]


@router.post("/create")
async def create_circuit(req: CircuitRequest) -> Dict[str, Any]:
    """
    Save circuit diagram and run basic simulation.
    """
    circuits = load_list(CIRCUITS_STORE)
    
    # Basic circuit validation
    has_power = any(c.type == "battery" for c in req.components)
    has_load = any(c.type in ["resistor", "led", "capacitor", "inductor"] for c in req.components)
    has_wires = any(c.type == "wire" for c in req.components)
    
    # Enhanced circuit analysis
    total_resistance = 0
    voltage = 0
    capacitance = 0
    inductance = 0
    current = 0
    power = 0
    
    for c in req.components:
        if c.type == "battery":
            try:
                voltage = float(c.value.replace("V", "").replace("v", "").strip())
            except:
                voltage = 9  # Default
        elif c.type == "resistor":
            try:
                val = c.value.upper().replace("Ω", "").replace("OHM", "").strip()
                if "K" in val:
                    total_resistance += float(val.replace("K", "")) * 1000
                else:
                    total_resistance += float(val)
            except:
                total_resistance += 1000
        elif c.type == "capacitor":
            try:
                val = c.value.upper().replace("F", "").strip()
                if "U" in val or "µ" in val:
                    capacitance += float(val.replace("U", "").replace("µ", "")) * 1e-6
                elif "N" in val:
                    capacitance += float(val.replace("N", "")) * 1e-9
                elif "P" in val:
                    capacitance += float(val.replace("P", "")) * 1e-12
                else:
                    capacitance += float(val)
            except:
                capacitance += 1e-6
        elif c.type == "inductor":
            try:
                val = c.value.upper().replace("H", "").strip()
                if "M" in val:
                    inductance += float(val.replace("M", "")) * 1e-3
                elif "U" in val or "µ" in val:
                    inductance += float(val.replace("U", "").replace("µ", "")) * 1e-6
                else:
                    inductance += float(val)
            except:
                inductance += 1e-3
    
    # Calculate current (Ohm's law)
    current = voltage / total_resistance if total_resistance > 0 else 0
    power = voltage * current
    
    # Time constant calculations
    rc_time = total_resistance * capacitance if capacitance > 0 else 0
    rl_time = inductance / total_resistance if total_resistance > 0 and inductance > 0 else 0
    
    simulation = {
        "valid": has_power and (has_load or has_wires),
        "voltage": round(voltage, 2),
        "total_resistance": round(total_resistance, 2),
        "current": round(current, 4),
        "power": round(power, 4),
        "warnings": []
    }
    
    if not has_power:
        simulation["warnings"].append("No power source (battery) detected")
    if not has_load:
        simulation["warnings"].append("No load components detected")
    if current > 1:
        simulation["warnings"].append("High current detected - check component ratings")
    if power > 10:
        simulation["warnings"].append("High power dissipation - heat management needed")
    
    if capacitance > 0:
        simulation["capacitance"] = capacitance
        simulation["rc_time_constant"] = round(rc_time, 6)
    
    if inductance > 0:
        simulation["inductance"] = inductance
        simulation["rl_time_constant"] = round(rl_time, 6)
    
    circuit = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "components": [
            {
                "type": c.type,
                "value": c.value,
                "x": c.x,
                "y": c.y
            }
            for c in req.components
        ],
        "valid": simulation["valid"],
        "created_at": datetime.utcnow().isoformat() + "Z",
        "simulation": simulation,
    }
    circuits.append(circuit)
    save_list(CIRCUITS_STORE, circuits)
    
    return {
        "ok": True,
        "circuit": circuit,
        "simulation": simulation
    }


@router.post("/sketch")
async def sketch_to_circuit(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Placeholder for sketch-to-circuit ML model.
    Production: train CNN to detect components from hand-drawn sketches.
    """
    sketch_id = str(uuid.uuid4())
    
    # Placeholder: would process image with ML model
    detected_components = [
        {"type": "battery", "confidence": 0.95, "x": 100, "y": 100},
        {"type": "resistor", "confidence": 0.88, "x": 200, "y": 100},
        {"type": "led", "confidence": 0.92, "x": 300, "y": 100},
    ]
    
    return {
        "ok": True,
        "sketch_id": sketch_id,
        "detected_components": detected_components,
        "note": "Sketch recognition requires custom CNN training"
    }


@router.get("/list")
async def list_circuits() -> Dict[str, Any]:
    circuits = load_list(CIRCUITS_STORE)
    return {"count": len(circuits), "circuits": circuits}


@router.get("/{circuit_id}/simulate")
async def simulate_circuit(circuit_id: str) -> Dict[str, Any]:
    """
    Run circuit simulation.
    Production: integrate PySpice or ngspice.
    """
    circuits = load_list(CIRCUITS_STORE)
    circuit = next((c for c in circuits if c["id"] == circuit_id), None)
    
    if not circuit:
        return {"ok": False, "error": "Circuit not found"}
    
    # Placeholder simulation results
    return {
        "ok": True,
        "circuit_id": circuit_id,
        "results": {
            "voltage": "5V",
            "current": "0.02A",
            "power": "0.1W",
            "note": "Real simulation requires PySpice/ngspice integration"
        }
    }
