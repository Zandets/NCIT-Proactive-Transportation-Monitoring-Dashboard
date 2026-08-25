# Proactive Transportation Monitor

FastAPI dashboard for fleet and corridor monitoring. It includes sample network data, triage controls, and a model adapter designed for ML/DL inference.

## Run locally

Anyone who copies this folder can run it without Codex. They only need Python 3.10+.

### Windows PowerShell

```powershell
cd C:\Users\mhshu\Documents\Codex\2026-07-29\bi\outputs\transport-monitor
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --reload
```

### macOS / Linux

```bash
cd transport-monitor
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn app:app --reload
```

Open `http://127.0.0.1:8000`. Keep the terminal running while using the dashboard. Stop the server with `Ctrl+C`.

For a machine or server that should be reachable on its network, use `--host 0.0.0.0` and open port 8000 in its firewall:

```bash
python -m uvicorn app:app --host 0.0.0.0 --port 8000
```

### Quick API check

```bash
curl http://127.0.0.1:8000/api/overview
curl -X POST http://127.0.0.1:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"vehicle_id":"V-204","speed_kph":31,"delay_minutes":9,"vehicle_age_years":6,"weather_risk":0.7}'
```

## Plug in your model

Replace `RiskModel.predict()` in `app.py` with your inference code. Load the trained artifact once when the application starts, then return one normalized score per request. For example:

```python
class RiskModel:
    name = "my-model-v2"

    def __init__(self):
        self.model = load_my_model("models/risk_model.pt")

    def predict(self, payload: PredictionRequest) -> float:
        features = [[payload.speed_kph, payload.delay_minutes,
                     payload.vehicle_age_years, payload.weather_risk]]
        return float(self.model.predict_proba(features)[0][1])
```

The dashboard calls `POST /api/predict` using this payload:

```json
{"vehicle_id":"V-204","speed_kph":31,"delay_minutes":9,"vehicle_age_years":6,"weather_risk":0.7}
```

Return a normalized `risk_score` between 0 and 1. The API automatically maps it to low, watch, or high risk.

## Upload a marks CSV

The dashboard accepts a CSV with these columns:

```csv
id,marks
V-204,82
V-118,66
V-307,74
```

Choose the file in the **Upload marks CSV** panel. The chart redraws in the browser immediately; no file is uploaded to the server.

## Project map

- `app.py` — FastAPI routes, request validation, sample data, and model adapter.
- `static/index.html` — dashboard layout.
- `static/styles.css` — dashboard styling and responsive layout.
- `static/app.js` — charts, API calls, and prediction form.
- `requirements.txt` — Python dependencies.

## Common issues

- **Site cannot be reached:** the server is not running, or the URL/port differs. Start `python -m uvicorn app:app --reload` from this folder.
- **Address already in use:** another process owns port 8000. Stop it or run `python -m uvicorn app:app --port 8001` and open port 8001.
- **PowerShell blocks activation:** run `Set-ExecutionPolicy -Scope Process Bypass`, then activate `.\.venv\Scripts\Activate.ps1`.
