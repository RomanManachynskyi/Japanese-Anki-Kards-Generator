# Japanese Anki Kards Generator

Build Japanese vocabulary decks for [Anki](https://apps.ankiweb.net/) in the browser. You edit cards in a Next.js UI, the Python backend handles furigana, optional ElevenLabs audio, and packaging—then you download a ready-to-import `.apkg` file.

This repository is a **frontend + backend** app: a web client (`frontend/`) and a FastAPI service (`backend/`). Run both together for the full workflow.

---

## Is this for you?

Use it if you want:

- **One place to author cards** — readings, kanji with furigana, translations, example sentences, optional sentence images, and per-card audio counts.
- **Live card preview** — see how the Anki note will look (front and back) before you generate.
- **Deck export** — download an Anki package you can import on desktop or mobile Anki.
- **Japanese tooling** — furigana and text processing on the server (MeCab / UniDic via fugashi).

You will need an **ElevenLabs** API key if you want generated pronunciation audio (configurable in the UI and on the server).

---

## What it looks like

### Web app

<img width="1919" height="903" alt="image_2026-05-11_18-03-07" src="https://github.com/user-attachments/assets/36d21746-6086-43a0-9074-577d2562bf08" />

### Anki card preview — front

<img width="1919" height="1036" alt="image_2026-05-11_18-03-53" src="https://github.com/user-attachments/assets/88529bf0-69d0-4ea3-ac87-2d73d99d0d56" />

### Anki card preview — back

<img width="1919" height="1032" alt="image_2026-05-11_18-03-53 (2)" src="https://github.com/user-attachments/assets/d823e198-4f6a-4550-aee8-f5d1b730cc4f" />

---

## Highlights

- Japanese text processing (furigana, kanji / kana handling) on the backend  
- Optional TTS via ElevenLabs (multiple clips per card when you set `audio_count`)  
- Direct **`.apkg`** export for Anki  
- Dark-themed card creator with **front/back preview**  
- Cards persisted in the browser (**localStorage**) while you work  
- Audio and API defaults editable from the **settings** UI (gear) plus `backend/config.py` defaults  

---

## Development setup

### Repository layout

```
Japanese-Anki-Kards-Generator/
├── backend/                 # FastAPI API + card pipeline
│   ├── api.py               # HTTP server entrypoint
│   ├── config.py            # Default ElevenLabs / note-type settings
│   ├── requirements.txt
│   ├── Main.py              # Optional CLI batch entry (input.json)
│   ├── input.json           # Sample / CLI vocabulary input
│   ├── services/            # Text, audio, Anki build, file I/O
│   ├── templates/           # HTML templates for Anki card faces
│   └── tests/
├── frontend/                # Next.js app
│   ├── app/
│   ├── components/
│   ├── lib/                 # API client, card helpers
│   └── package.json
├── start.bat / start.ps1    # Windows: install deps + run both servers
├── package.json             # Root: `npm run dev` runs API + web together
└── results/                 # Generated runs (created when you generate)
```

### Backend

1. Install Python dependencies from the repo root:

```bash
pip install -r backend/requirements.txt
```

2. **UniDic** — Japanese analysis needs the UniDic dictionary once per environment:

```bash
python -m unidic download
```

If MeCab cannot find UniDic (e.g. missing `mecabrc`), install the dictionary as above. The project uses `fugashi[unidic]` in `backend/requirements.txt`.

3. Optional defaults in `backend/config.py` (ElevenLabs `API_KEY`, `VOICE_ID`, `MODEL_ID`, etc.). You can also set ElevenLabs credentials from the frontend settings when the API is running.

### Frontend

1. Install dependencies:

```bash
cd frontend
pnpm install
# or: npm install
```

2. Create `frontend/.env.local` if the API is not on the default host:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Running the app

### Option A — Start scripts (Windows)

Installs missing dependencies, starts backend and frontend, and opens the app in the browser.

- **Command Prompt:** `start.bat`  
- **PowerShell:** `.\start.ps1`

- API: `http://localhost:8000`  
- UI: `http://localhost:3000`  

### Option B — One command from repo root

Requires Python and Node on your `PATH`, and root dependencies installed once:

```bash
npm install
npm run dev
```

This runs `python api.py` inside `backend/` and `npm run dev` inside `frontend/` via `concurrently`.

### Option C — Two terminals

1. Backend: `cd backend` then `python api.py`  
2. Frontend: `cd frontend` then `npm run dev` (or `pnpm dev`)

---

## API (backend)

With `backend/api.py` running:

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/config` | Current audio-related config (masked key state, voice, model, note type id) |
| `POST` | `/api/config` | Update ElevenLabs `api_key`, `voice_id`, `model_id` |
| `POST` | `/api/generate` | Build deck from JSON body (`cards[]`, optional `deck_name`) |
| `GET` | `/api/download/{filename}` | Download a generated `.apkg` |

Generate request shape matches the frontend types in `frontend/lib/api.ts`: each card includes `reading`, optional `kanji` + `furigana`, `translation`, optional sentences, optional `sentence_image` (base64 data URL), `audio_count`, `generation_mode` (`both` | `jp_en` | `en_jp`), and optional `notes`.

---

## Output

Successful runs write under `results/` (timestamped run folders) typically including:

- `vocabulary.apkg` — import into Anki  
- `vocabulary_data.json` — processed payload  
- `summary.txt` — short run summary  
- `Audio/` — generated audio files when `audio_count` is used  

---

## Configuration

| Layer | What to set |
|--------|----------------|
| `backend/config.py` | Default `API_KEY`, `VOICE_ID`, `MODEL_ID`, `NOTE_TYPE_ID`, etc. |
| Frontend | Settings modal (gear); `NEXT_PUBLIC_API_URL` in `.env.local` |

---

## Tech stack

- **Backend:** Python, FastAPI, genanki, ElevenLabs, pykakasi, fugashi  
- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui  

---

## Optional CLI batch

For batch generation without the UI, you can use `backend/Main.py` with `backend/input.json`. The primary workflow supported by this README is the **web UI + API**.
