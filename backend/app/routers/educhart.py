import io
import os
import uuid
from typing import Any, Dict, List

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import FancyBboxPatch
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

EXPORT_ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "uploads"))
os.makedirs(EXPORT_ROOT, exist_ok=True)


class Series(BaseModel):
    name: str
    x: List[str | float | int] | None = None
    y: List[float] | None = None


class ChartRequest(BaseModel):
    type: str  # 'bar' | 'line' | 'pie' | 'flowchart' | 'mindmap'
    title: str | None = None
    labels: List[str] | None = None  # for pie or bar when one series
    values: List[float] | None = None
    series: List[Series] | None = None
    description: str | None = None  # for flowchart/mindmap generation (mermaid)


def _save_fig(fig, out_path: str):
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)


def _build_mermaid_flow(description: str, kind: str) -> str:
    # Heuristic: split lines into nodes and connect sequentially
    lines = [l.strip() for l in description.splitlines() if l.strip()]
    if not lines:
        lines = [description]
    code = ["flowchart TD" if kind == "flowchart" else "mindmap"]
    prev_id = None
    for i, l in enumerate(lines):
        node_id = f"N{i}"
        label = l.replace('"', "'")
        if kind == "flowchart":
            code.append(f"    {node_id}[\"{label}\"]")
            if prev_id is not None:
                code.append(f"    {prev_id} --> {node_id}")
        else:
            if i == 0:
                code.append(f"    root(( {label} ))")
                prev_id = "root"
                continue
            code.append(f"    {prev_id} --- {node_id}(( {label} ))")
            prev_id = node_id
        prev_id = node_id
    return "\n".join(code)


@router.post("/generate")
async def generate_chart(req: ChartRequest) -> Dict[str, Any]:
    t = (req.type or "").lower()
    uid = str(uuid.uuid4())
    out_path = os.path.join(EXPORT_ROOT, f"{uid}.png")

    if t in ("bar", "line"):
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Brown color palette
        colors = ['#D97706', '#92400E', '#B45309', '#78350F', '#A16207', '#C2410C']  # Various brown shades
        
        if req.series:
            for idx, s in enumerate(req.series):
                xs = s.x or list(range(len(s.y or [])))
                ys = s.y or []
                color = colors[idx % len(colors)]
                if t == "bar":
                    bars = ax.bar(xs, ys, label=s.name, alpha=0.85, color=color, edgecolor='white', linewidth=2.5)
                else:
                    ax.plot(xs, ys, label=s.name, marker='o', linewidth=4, markersize=12, 
                           color=color, markerfacecolor=color, markeredgecolor='white', 
                           markeredgewidth=2.5, alpha=0.9)
                    ax.fill_between(range(len(ys)), ys, alpha=0.15, color=color)
        elif req.labels and req.values:
            xs = req.labels
            ys = req.values
            if t == "bar":
                bars = ax.bar(xs, ys, color=colors[:len(xs)], alpha=0.85, edgecolor='white', linewidth=2.5)
                # Add value labels on bars
                for bar, value in zip(bars, ys):
                    height = bar.get_height()
                    ax.text(bar.get_x() + bar.get_width()/2., height + max(ys)*0.02,
                           f'{value:.1f}', ha='center', va='bottom', fontweight='bold', 
                           fontsize=12, color='#1F2937')
            else:
                ax.plot(xs, ys, marker='o', linewidth=4, markersize=14, color=colors[0],
                       markerfacecolor=colors[0], markeredgecolor='white', markeredgewidth=3, alpha=0.9)
                ax.fill_between(range(len(ys)), ys, alpha=0.2, color=colors[0])
                # Add value labels on points
                for i, (x, y) in enumerate(zip(xs, ys)):
                    ax.annotate(f'{y:.1f}', (i, y), textcoords="offset points", 
                               xytext=(0,14), ha='center', fontweight='bold', fontsize=11, 
                               color='#1F2937')
        else:
            return {"error": "Provide series or labels+values"}
        
        if req.title:
            ax.set_title(req.title, fontsize=20, fontweight='bold', pad=20, color='#1F2937')
        
        ax.grid(True, alpha=0.25, linestyle='--', linewidth=0.8, color='#E5E7EB')
        ax.set_facecolor('#ffffff')
        fig.patch.set_facecolor('#ffffff')
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color('#9CA3AF')
        ax.spines['bottom'].set_color('#9CA3AF')
        
        if req.series and len(req.series) > 1:
            ax.legend(loc='best', frameon=True, fancybox=True, shadow=True, framealpha=0.95)
        
        plt.tight_layout()
        _save_fig(fig, out_path)
        return {"id": uid, "type": t, "download_url": f"/files/{os.path.basename(out_path)}"}

    if t == "pie":
        if not (req.labels and req.values):
            return {"error": "Provide labels and values for pie"}
        
        fig, ax = plt.subplots(figsize=(9, 9))
        colors = ['#D97706', '#92400E', '#B45309', '#78350F', '#A16207', '#C2410C']  # Brown shades
        
        # Create explode effect
        explode = [0.08] * len(req.labels)
        
        wedges, texts, autotexts = ax.pie(
            req.values, 
            labels=req.labels, 
            autopct='%1.1f%%',
            colors=colors[:len(req.labels)],
            startangle=90,
            explode=explode,
            shadow=True,
            textprops={'fontsize': 12, 'fontweight': 'bold'},
            wedgeprops={'edgecolor': 'white', 'linewidth': 3, 'antialiased': True}
        )
        
        # Enhance text styling
        for autotext in autotexts:
            autotext.set_color('white')
            autotext.set_fontweight('bold')
            autotext.set_fontsize(13)
        
        # Style labels
        for text in texts:
            text.set_fontweight('bold')
            text.set_fontsize(12)
            text.set_color('#1F2937')
        
        if req.title:
            ax.set_title(req.title, fontsize=22, fontweight='bold', pad=25, color='#1F2937')
        
        ax.axis('equal')
        fig.patch.set_facecolor('#ffffff')
        plt.tight_layout()
        _save_fig(fig, out_path)
        return {"id": uid, "type": t, "download_url": f"/files/{os.path.basename(out_path)}"}

    if t in ("flowchart", "mindmap"):
        desc = (req.description or "").strip()
        if not desc:
            return {"error": "Provide description for flowchart/mindmap"}
        code = _build_mermaid_flow(desc, t)
        
        # Add title to mermaid code if provided
        if req.title:
            code = f"---\ntitle: {req.title}\n---\n" + code
        
        txt_path = os.path.join(EXPORT_ROOT, f"{uid}.mmd")
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write(code)
        return {"id": uid, "type": t, "mermaid": code, "download_url": f"/files/{os.path.basename(txt_path)}"}

    return {"error": "Unsupported chart type"}
