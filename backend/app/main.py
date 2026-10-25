from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException

load_dotenv()

from .extract import extract, is_sample_mode  # noqa: E402  (needs .env loaded first)
from .grounding import check_tasks  # noqa: E402
from .schemas import OrganizeRequest, OrganizeResponse  # noqa: E402

app = FastAPI(title="Chaos to Clarity")


@app.get("/api/health")
def health():
    return {"mode": "sample" if is_sample_mode() else "live"}


@app.post("/api/organize", response_model=OrganizeResponse)
def organize(req: OrganizeRequest):
    if not req.notes.strip():
        raise HTTPException(status_code=400, detail="Paste notes first.")
    extraction, mode = extract(req.notes)
    tasks = check_tasks(extraction.tasks, req.notes)
    return OrganizeResponse(mode=mode, tasks=tasks, open_questions=extraction.open_questions)
