# Chaos to Clarity

Paste messy meeting notes and get an editable action plan: tasks, owners, deadlines, blockers, and open questions. Every task shows the exact phrase from your notes that supports it, and missing owners or deadlines are marked rather than guessed.

## Run it locally

Requires Node 18+ and [uv](https://docs.astral.sh/uv/) (backend uses Python 3.12 or 3.13).

**One-time setup:**
```
cd backend
uv venv --python 3.12
uv pip install -r requirements.txt
copy .env.example .env        # add DASHSCOPE_API_KEY, or leave blank for sample mode
cd ..\frontend
npm install
```

**Every time — start both** (two terminals; the app needs both running):
```
# terminal 1
cd backend
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000

# terminal 2
cd frontend
npm run dev
```
If Organize Notes says it can't reach the backend, terminal 1 isn't running.
Open http://localhost:5173 and paste the contents of `demo/notes.txt`.

**Sample mode:** with no API key set, the backend returns a saved, labeled sample response for `demo/notes.txt` instead of calling Qwen.

## Tests
```
cd backend && .venv\Scripts\python -m pytest
```
