from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, cast
import os
import re

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from supabase import create_client, Client

BASE_DIR = Path(__file__).parent
app = FastAPI(title="Proactive Transportation Monitor", version="1.0.0")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

load_dotenv(dotenv_path=Path(__file__).parent / ".env")
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase_url = cast(str, url)
supabase_key = cast(str, key)
supabase_client = create_client(supabase_url, supabase_key)

class PredictionRequest(BaseModel):
    vehicle_id: str = Field(examples=["V-204"])
    speed_kph: float = Field(ge=0, le=160)
    delay_minutes: float = Field(ge=0)
    vehicle_age_years: float = Field(ge=0)
    weather_risk: float = Field(ge=0, le=1)

class PredictionResponse(BaseModel):
    vehicle_id: str
    risk_score: float
    risk_band: Literal["low", "watch", "high"]
    model_name: str
    evaluated_at: datetime

class RiskModel:
    """Replace predict() with a trained sklearn, PyTorch, or TensorFlow model."""
    name = "baseline-operational-risk-v1"
    def predict(self, payload: PredictionRequest) -> float:
        risk = (0.035 * payload.delay_minutes + 0.050 * payload.vehicle_age_years +
                0.45 * payload.weather_risk + (0.12 if payload.speed_kph < 18 else 0))
        return round(min(1.0, max(0.0, risk)), 2)

model = RiskModel()
DATA_FILE = BASE_DIR / "data.csv"
FLEET = [
    {"id":"V-204","route":"Riverside → Central","status":"Delayed","eta":"+11 min","risk":.82,"left":52,"top":34},
    {"id":"V-118","route":"North Loop","status":"On time","eta":"2 min","risk":.21,"left":28,"top":58},
    {"id":"V-307","route":"Airport Express","status":"Weather watch","eta":"+6 min","risk":.63,"left":72,"top":54},
    {"id":"V-091","route":"Harbor Line","status":"On time","eta":"4 min","risk":.14,"left":44,"top":76},
]
ALERTS = [
    {"id":"A-719","severity":"High","title":"V-204 likely to miss Central transfer","detail":"Delay trend crossed the 15-minute intervention threshold.","action":"Dispatch spare from Depot 3","risk":.82},
    {"id":"A-720","severity":"Watch","title":"Airport Express exposure to storm cell","detail":"Rain intensity is rising along the east corridor.","action":"Notify route supervisor","risk":.63},
    {"id":"A-721","severity":"Watch","title":"North Loop headway widening","detail":"Two departures are 7 minutes apart during peak demand.","action":"Hold next departure","risk":.47},
]
@app.get("/", include_in_schema=False)
def dashboard(): return FileResponse(BASE_DIR / "static" / "index.html")

@app.get("/api/overview")
def overview():
    return {"updated_at":datetime.now(timezone.utc).isoformat(), "metrics":{"active_vehicles":48,"on_time_rate":91.4,"open_alerts":len(ALERTS),"estimated_impacts":126}, "fleet":FLEET, "alerts":ALERTS, "demand":[42,46,55,68,79,88,92,84,71,63,52,47], "demand_labels":["06","07","08","09","10","11","12","13","14","15","16","17"]}

@app.post("/api/predict", response_model=PredictionResponse)
def predict(payload: PredictionRequest):
    score=model.predict(payload)
    band: Literal["low","watch","high"] = "high" if score >= .70 else "watch" if score >= .40 else "low"
    return PredictionResponse(vehicle_id=payload.vehicle_id, risk_score=score, risk_band=band, model_name=model.name, evaluated_at=datetime.now(timezone.utc))

@app.get("/api/marks")
def marks_data() -> dict:
    """Read a local id/marks CSV or TSV placed beside app.py."""
    if not DATA_FILE.exists():
        return {"rows": [], "source": None}
    lines = [line.strip() for line in DATA_FILE.read_text(encoding="utf-8-sig").splitlines() if line.strip()]
    rows = []
    for line in lines:
        parts = re.split(r"[,;\t]", line)
        if len(parts) >= 2:
            try:
                if parts[0].strip().lower() == "id":
                    continue
                rows.append({"id": parts[0].strip(), "marks": float(parts[1].strip())})
            except ValueError:
                continue
    return {"rows": rows, "source": DATA_FILE.name}

async def fetch_supabase_data():
    response = supabase_client.table("Import Test").select("*").execute()
    return response.data

@app.get("/users")
async def output_data():
    data = await fetch_supabase_data()
    print (f"Fetched {len(data)} rows from table")
    for row in data:
        print (row)
    return{"users": data}
@app.post("/api/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """Upload image to Supabase storage."""
    try:
        # Read file content
        contents = await file.read()
        
        # Upload to Supabase Storage bucket "images"
        file_path = f"uploads/{file.filename}"
        supabase_client.storage.from_("Images").upload(
            file_path, 
            contents
        )
        
        # Get public URL
        public_url = supabase_client.storage.from_("Images").get_public_url(file_path)
        
        return {"url": public_url, "filename": file.filename}
    except Exception as e:
        return {"detail": str(e)}, 400