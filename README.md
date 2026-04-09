# Anki Vocabulary Card Generator

A full-stack application for generating Anki vocabulary cards with Japanese text processing, furigana, and audio pronunciation files. Features a modern web UI built with Next.js and a Python backend.

## Project Structure

```
Anki-Kards-Info-Generator/
├── api.py                  # FastAPI backend server
├── Main.py                 # CLI entry point (alternative to UI)
├── config.py               # Configuration constants
├── input.json              # Input vocabulary data (for CLI mode)
├── requirements.txt        # Python dependencies
├── services/               # Backend service classes
│   ├── __init__.py
│   ├── japanese_text.py    # Japanese text processing (furigana, conversion)
│   ├── audio_generator.py  # Audio generation using ElevenLabs API
│   ├── vocabulary_processor.py # Vocabulary processing logic
│   ├── anki_builder.py     # Anki package (.apkg) creation
│   └── file_manager.py     # File I/O operations
├── frontend/               # Next.js web UI
│   ├── app/                # Next.js app router pages
│   ├── components/         # React components
│   ├── lib/                # Utility functions & API client
│   └── package.json        # Frontend dependencies
└── results/                # Generated output (created automatically)
```

## Installation

### Backend Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. **Required:** Download the UniDic dictionary (needed for Japanese text processing; run once per environment):
```bash
python -m unidic download
```
Without this, the app will fail with a MeCab/unidic error (e.g. "no such file or directory: ... unidic\\dicdir\\mecabrc"). Alternatively, use `fugashi[unidic-lite]` in `requirements.txt` for a self-contained install (no separate download).

3. Configure your ElevenLabs API key in `config.py`:
```python
API_KEY = "your_elevenlabs_api_key_here"
VOICE_ID = "your_voice_id_here"
MODEL_ID = "eleven_multilingual_v2"
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install Node.js dependencies:
```bash
pnpm install
# or
npm install
```

3. Create `.env.local` file:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Running the Application

### Option 1: Start scripts (recommended)

Use the start scripts to run **both** the backend and frontend. They install dependencies if needed, then open two windows (backend + frontend) and open the app in your browser.

- **Windows (Command Prompt):** double-click `start.bat` or run:
  ```cmd
  start.bat
  ```
- **Windows (PowerShell):**
  ```powershell
  .\start.ps1
  ```

- Backend API: `http://localhost:8000`
- Frontend UI: `http://localhost:3000`  
- Close the two terminal windows to stop the servers.

### Option 2: Single terminal (npm)

From the project root, run both in one terminal (requires Node and Python in PATH):

```bash
npm install
npm run dev
```

### Option 3: Manual (separate terminals)

1. Backend: `cd backend` then `python api.py` → `http://localhost:8000`
2. Frontend: `cd frontend` then `npm run dev` → `http://localhost:3000`

### Option 4: CLI Mode

1. Edit `input.json` with your vocabulary data:
```json
{
  "vocabulary": [
    {
      "reading": "ゆうびんきょく",
      "kanji": {
        "kanji": "郵便局",
        "furigana": "郵便[ゆうびん]局[きょく]"
      },
      "translation": "post office",
      "sentence_kana": "郵便局に行きます",
      "sentence_english": "I will go to the post office",
      "audio_count": 2
    },
    {
      "reading": "ビジネス",
      "kanji": null,
      "translation": "business",
      "sentence_kana": "",
      "sentence_english": "",
      "audio_count": null
    }
  ]
}
```

2. Run the CLI application:
```bash
python Main.py
```

## Input JSON Format

The `input.json` file should contain:

- **vocabulary** (array, required): List of vocabulary items
  - **reading** (string, required): Hiragana/katakana reading
  - **kanji** (object or null): Kanji information
    - **kanji** (string): The kanji characters
    - **furigana** (string): Furigana format, e.g., `歴[れき]史[し]`
  - **translation** (string, required): English translation
  - **sentence_kana** (string, optional): Example sentence in Japanese
  - **sentence_english** (string, optional): Example sentence translation
  - **audio_count** (number or null): Number of audio files to generate (null = no audio)

## Output

The application generates a timestamped directory in `results/` containing:

- `vocabulary_data.json` - Complete vocabulary data with metadata
- `summary.txt` - Human-readable summary report
- `vocabulary.apkg` - Anki package file ready for import
- `Audio/` - Directory with generated audio files

## API Endpoints

When running the backend (`python api.py`):

- `GET /api/health` - Health check
- `GET /api/config` - Get current configuration
- `POST /api/config` - Update audio configuration
- `POST /api/generate` - Generate Anki cards
- `GET /api/download/{filename}` - Download generated .apkg file

## Features

- 🎌 **Japanese Text Processing**: Automatic furigana generation, kanji/kana handling
- 🔊 **Audio Generation**: ElevenLabs TTS with multiple voice variants
- 📦 **Anki Package Export**: Direct .apkg file generation
- 🎨 **Modern Web UI**: Beautiful dark-themed card creator interface
- 📝 **Card Preview**: Live preview of front and back of cards
- 💾 **Auto-save**: Cards saved to browser localStorage
- ⚙️ **Configurable**: API settings manageable through UI

## Configuration

### Backend (config.py)
- `API_KEY` - ElevenLabs API key
- `VOICE_ID` - Voice ID for TTS
- `MODEL_ID` - TTS model ID
- `NOTE_TYPE_ID` - Anki note type ID (for matching existing note types)

### Frontend
- Settings can be configured through the UI settings modal (gear icon)
- Backend API URL configured via `NEXT_PUBLIC_API_URL` environment variable

## Tech Stack

- **Backend**: Python, FastAPI, genanki, ElevenLabs API
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Japanese Processing**: pykakasi, fugashi
