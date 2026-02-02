"""
FastAPI backend for Anki Card Generator
Connects the frontend UI with the existing Python card generation logic
"""
import json
import os
from pathlib import Path
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from services.vocabulary_processor import VocabularyProcessor
from services.file_manager import FileManager
from services.anki_builder import create_anki_package
import config

app = FastAPI(title="Anki Card Generator API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class KanjiData(BaseModel):
    kanji: str
    furigana: str


class CardInput(BaseModel):
    reading: str
    kanji: Optional[KanjiData] = None
    translation: str
    sentence_kana: Optional[str] = ""
    sentence_english: Optional[str] = ""
    sentence_image: Optional[str] = ""  # Base64 data URL
    audio_count: Optional[int] = None  # None means no audio
    generation_mode: str = "both"  # "both", "jp_en", or "en_jp"


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
    total_cards: int = 0
    total_audio_files: int = 0


class ConfigResponse(BaseModel):
    api_key_set: bool
    voice_id: str
    model_id: str
    note_type_id: int


# Store runtime config (in production, use a proper config management)
runtime_config = {
    "api_key": config.API_KEY,
    "voice_id": config.VOICE_ID,
    "model_id": config.MODEL_ID,
}


@app.get("/api/config")
async def get_config() -> ConfigResponse:
    """Get current configuration (masks API key)"""
    return ConfigResponse(
        api_key_set=bool(runtime_config["api_key"]),
        voice_id=runtime_config["voice_id"],
        model_id=runtime_config["model_id"],
        note_type_id=config.NOTE_TYPE_ID,
    )


@app.post("/api/config")
async def update_config(config_data: AudioConfigRequest):
    """Update audio generation configuration"""
    runtime_config["api_key"] = config_data.api_key
    runtime_config["voice_id"] = config_data.voice_id
    runtime_config["model_id"] = config_data.model_id
    return {"success": True, "message": "Configuration updated"}


@app.post("/api/generate", response_model=GenerateResponse)
async def generate_cards(request: GenerateRequest):
    """Generate Anki cards from the provided card data"""
    try:
        if not request.cards:
            raise HTTPException(status_code=400, detail="No cards provided")

        # Filter out empty cards
        valid_cards = [
            card for card in request.cards
            if card.reading or (card.kanji and card.kanji.kanji) or card.translation
        ]

        if not valid_cards:
            raise HTTPException(status_code=400, detail="No valid cards to generate")

        # Convert frontend card format to backend format
        vocab_list = []
        for card in valid_cards:
            vocab_item = {
                "reading": card.reading,
                "kanji": {
                    "kanji": card.kanji.kanji,
                    "furigana": card.kanji.furigana
                } if card.kanji else None,
                "translation": card.translation,
                "sentence_kana": card.sentence_kana or "",
                "sentence_english": card.sentence_english or "",
                "sentence_image": card.sentence_image or "",
                "audio_count": card.audio_count,
                "generation_mode": card.generation_mode or "both",
            }
            vocab_list.append(vocab_item)

        # Initialize services with runtime config
        from services.audio_generator import AudioGenerator
        audio_generator = AudioGenerator(
            api_key=runtime_config["api_key"],
            voice_id=runtime_config["voice_id"],
            model_id=runtime_config["model_id"],
        )
        
        file_manager = FileManager()
        vocabulary_processor = VocabularyProcessor(audio_generator=audio_generator)

        # Create results directory
        results_dir = file_manager.create_results_directory()
        
        # Create Audio subdirectory
        audio_dir = results_dir / "Audio"
        audio_dir.mkdir(exist_ok=True)

        # Process vocabulary
        result = vocabulary_processor.process_vocabulary(vocab_list, str(audio_dir))

        # Create Anki package
        apkg_path = create_anki_package(results_dir, result)

        # Count audio files
        total_audio = sum(len(r['audio_paths']) for r in result)
        total_sentence_audio = sum(len(r.get('sentence_audio_paths', [])) for r in result)

        return GenerateResponse(
            success=True,
            message=f"Successfully generated {len(result)} cards",
            apkg_path=apkg_path,
            total_cards=len(result),
            total_audio_files=total_audio + total_sentence_audio,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/download/{filename}")
async def download_file(filename: str):
    """Download the generated .apkg file"""
    # Search for the file in results directory
    # Resolve relative path from backend/ directory
    results_path = Path(__file__).parent / config.RESULTS_DIR
    results_path = results_path.resolve()
    
    for dir_path in results_path.iterdir():
        if dir_path.is_dir():
            file_path = dir_path / filename
            if file_path.exists():
                return FileResponse(
                    path=str(file_path),
                    filename=filename,
                    media_type="application/octet-stream"
                )
    
    raise HTTPException(status_code=404, detail="File not found")


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Anki Card Generator API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

