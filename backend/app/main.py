import logging

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException

load_dotenv()

from .extract import ExtractionError, extract, is_sample_mode  # noqa: E402  (needs .env loaded first)
from .grounding import check_tasks  # noqa: E402
from .schemas import OrganizeRequest, OrganizeResponse  # noqa: E402

log = logging.getLogger("uvicorn.error")

app = FastAPI(title="Chaos to Clarity")


@app.get("/api/health")
def health():
    return {"mode": "sample" if is_sample_mode() else "live"}


@app.post("/api/organize", response_model=OrganizeResponse)
def organize(req: OrganizeRequest):
    if not req.notes.strip():
        raise HTTPException(status_code=400, detail="Paste notes first.")
    try:
        extraction, mode = extract(req.notes)
    except ExtractionError as e:
        log.error("Organize failed: %s", e, exc_info=e.__cause__)  # full reason in the backend terminal
        raise HTTPException(status_code=502, detail=f"The AI step failed: {e}. {e.hint}")
    tasks = check_tasks(extraction.tasks, req.notes)
    return OrganizeResponse(mode=mode, tasks=tasks, open_questions=extraction.open_questions)
