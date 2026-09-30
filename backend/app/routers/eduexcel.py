import io
import os
import uuid
from typing import Any, Dict

import pandas as pd
from fastapi import APIRouter, File, UploadFile
from app.utils.storage import STORAGE_ROOT

router = APIRouter()

EXPORT_ROOT = STORAGE_ROOT
os.makedirs(EXPORT_ROOT, exist_ok=True)


def _build_excel(df: pd.DataFrame, path: str) -> None:
    with pd.ExcelWriter(path, engine="xlsxwriter") as writer:
        df.to_excel(writer, sheet_name="Data", index=False)

        # Simple summary stats
        desc = df.describe(include="all").transpose().reset_index()
        desc.to_excel(writer, sheet_name="Summary", index=False)

        # Add a simple chart if numeric columns exist
        numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
        if len(numeric_cols) >= 1:
            sheet = writer.book.add_worksheet("Chart")
            # write headers
            sheet.write(0, 0, "Index")
            for i, col in enumerate(numeric_cols[:3]):
                sheet.write(0, i+1, col)
                for r, val in enumerate(df[col].fillna(0).tolist(), start=1):
                    sheet.write(r, 0, r)
                    sheet.write(r, i+1, float(val))

            chart = writer.book.add_chart({"type": "line"})
            max_rows = len(df)
            for i, col in enumerate(numeric_cols[:3]):
                chart.add_series({
                    "name": ["Chart", 0, i+1],
                    "categories": ["Chart", 1, 0, max_rows, 0],
                    "values": ["Chart", 1, i+1, max_rows, i+1],
                })
            chart.set_title({"name": "Numeric Columns"})
            sheet.insert_chart(1, 5, chart)


@router.post("/generate")
async def generate_excel(file: UploadFile = File(...)) -> Dict[str, Any]:
    content = await file.read()
    name = (file.filename or "data").lower()
    uid = str(uuid.uuid4())
    out_path = os.path.join(EXPORT_ROOT, f"{uid}.xlsx")

    try:
        if name.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        elif name.endswith(".json"):
            df = pd.read_json(io.BytesIO(content))
        else:
            # Try CSV by default
            df = pd.read_csv(io.BytesIO(content))
    except Exception:
        return {"error": "Unable to parse file. Provide CSV or JSON."}

    if df.empty:
        return {"error": "No data rows found."}

    try:
        _build_excel(df, out_path)
    except Exception as e:
        return {"error": f"Failed to create Excel: {e}"}

    # lightweight insights
    insights = []
    numeric = df.select_dtypes(include=["number"]) if not df.empty else df
    if not numeric.empty:
        for col in numeric.columns[:5]:
            s = numeric[col].dropna()
            if s.empty:
                continue
            insights.append({
                "column": str(col),
                "mean": float(s.mean()),
                "min": float(s.min()),
                "max": float(s.max()),
            })

    return {
        "id": uid,
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "insights": insights,
        "download_url": f"/files/{os.path.basename(out_path)}",
    }
