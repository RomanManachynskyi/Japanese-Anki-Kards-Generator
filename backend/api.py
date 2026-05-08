"""
FastAPI backend for Anki Card Generator
Connects the frontend UI with the existing Python card generation logic
"""
from pathlib import Path
from dataclasses import dataclass
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

import config
from services.pipeline import RuntimeAudioConfig, run_generation_pipeline

app = FastAPI(title="Anki Card Generator API")

LOCAL_FRONTEND_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
DEFAULT_GENERATION_MODE = "both"

app.add_middleware(
    CORSMiddleware,
    allow_origins=LOCAL_FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class KanjiData(BaseModel):
    kanji: str
    furigana: str


class CardInput(BaseModel):
    reading: str
    kanji: Optional[KanjiData] = None
    translation: str
    sentence_kana: Optional[str] = ""
    sentence_english: Optional[str] = ""
    sentence_image: Optional[str] = ""
    audio_count: Optional[int] = None
    generation_mode: str = DEFAULT_GENERATION_MODE
    notes: Optional[str] = ""


class GenerateRequest(BaseModel):
    cards: List[CardInput]


class AudioConfigRequest(BaseModel):
    api_key: str
    voice_id: str
    model_id: str


class GenerateResponse(BaseModel):
    success: bool
    message: str
    apkg_path: Optional[str] = None
    run_id: Optional[str] = None
    total_cards: int = 0
    total_audio_files: int = 0


class ConfigResponse(BaseModel):
    api_key_set: bool
    voice_id: str
    model_id: str
    note_type_id: int


@dataclass
class RuntimeConfig:
    api_key: str
    voice_id: str
    model_id: str

    def to_audio_config(self) -> RuntimeAudioConfig:
        return RuntimeAudioConfig(
            api_key=self.api_key,
            voice_id=self.voice_id,
            model_id=self.model_id,
        )


runtime_config = RuntimeConfig(
    api_key=config.API_KEY,
    voice_id=config.VOICE_ID,
    model_id=config.MODEL_ID,
)


def _is_card_valid(card: CardInput) -> bool:
    return bool(card.reading or (card.kanji and card.kanji.kanji) or card.translation)


def _map_card_to_vocabulary_item(card: CardInput) -> dict:
    return {
        "reading": card.reading,
        "kanji": {
            "kanji": card.kanji.kanji,
            "furigana": card.kanji.furigana,
        }
        if card.kanji
        else None,
        "translation": card.translation,
        "sentence_kana": card.sentence_kana or "",
        "sentence_english": card.sentence_english or "",
        "sentence_image": card.sentence_image or "",
        "audio_count": card.audio_count,
        "generation_mode": card.generation_mode or DEFAULT_GENERATION_MODE,
        "notes": card.notes or "",
    }


@app.get("/api/config")
async def get_config() -> ConfigResponse:
    """Get current configuration (masks API key)"""
    return ConfigResponse(
        api_key_set=bool(runtime_config.api_key),
        voice_id=runtime_config.voice_id,
        model_id=runtime_config.model_id,
        note_type_id=config.NOTE_TYPE_ID,
    )


@app.post("/api/config")
async def update_config(config_data: AudioConfigRequest):
    """Update audio generation configuration"""
    runtime_config.api_key = config_data.api_key
    runtime_config.voice_id = config_data.voice_id
    runtime_config.model_id = config_data.model_id
    return {"success": True, "message": "Configuration updated"}


@app.post("/api/generate", response_model=GenerateResponse)
async def generate_cards(request: GenerateRequest):
    """Generate Anki cards from the provided card data"""
    try:
        if not request.cards:
            raise HTTPException(status_code=400, detail="No cards provided")

        valid_cards = [card for card in request.cards if _is_card_valid(card)]

        if not valid_cards:
            raise HTTPException(status_code=400, detail="No valid cards to generate")

        vocabulary_items = [_map_card_to_vocabulary_item(card) for card in valid_cards]
        pipeline_result = run_generation_pipeline(
            vocabulary_items=vocabulary_items,
            runtime_audio_config=runtime_config.to_audio_config(),
        )

        run_id = pipeline_result.results_dir.name
        return GenerateResponse(
            success=True,
            message=f"Successfully generated {len(pipeline_result.processed_items)} cards",
            apkg_path=pipeline_result.apkg_path,
            run_id=run_id,
            total_cards=len(pipeline_result.processed_items),
            total_audio_files=pipeline_result.total_audio_files,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/download/{filename}")
async def download_file(filename: str, run_id: Optional[str] = None):
    """Download the .apkg file. If run_id is given, use that run's dir; else use the newest."""
    results_path = Path(__file__).parent / config.RESULTS_DIR
    results_path = results_path.resolve()
    if not results_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    if run_id:
        dir_path = results_path / run_id
        file_path = dir_path / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/octet-stream",
        )
    candidates = []
    for dir_path in results_path.iterdir():
        if dir_path.is_dir():
            fp = dir_path / filename
            if fp.exists():
                candidates.append((dir_path, fp))
    if not candidates:
        raise HTTPException(status_code=404, detail="File not found")
    candidates.sort(key=lambda p: p[0].stat().st_mtime)
    file_path = candidates[-1][1]
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/octet-stream",
    )


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Anki Card Generator API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

