from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from services.anki_builder import create_anki_package
from services.audio_generator import AudioGenerator
from services.file_manager import FileManager
from services.vocabulary_processor import VocabularyProcessor

DEFAULT_DECK_NAME = "Japanese Vocabulary"


@dataclass
class RuntimeAudioConfig:
    api_key: str
    voice_id: str
    model_id: str


@dataclass
class GenerationPipelineResult:
    results_dir: Path
    processed_items: List[Dict[str, Any]]
    apkg_path: str
    total_word_audio_files: int
    total_sentence_audio_files: int
    saved_files: Optional[Dict[str, str]] = None

    @property
    def total_audio_files(self) -> int:
        return self.total_word_audio_files + self.total_sentence_audio_files


def run_generation_pipeline(
    vocabulary_items: List[Dict[str, Any]],
    runtime_audio_config: RuntimeAudioConfig,
    deck_name: str = DEFAULT_DECK_NAME,
    file_manager: Optional[FileManager] = None,
    vocabulary_processor_factory: Callable[[AudioGenerator], VocabularyProcessor] = VocabularyProcessor,
    save_outputs: bool = False,
    original_input: Optional[Dict[str, Any]] = None,
) -> GenerationPipelineResult:
    resolved_file_manager = file_manager or FileManager()
    results_dir = resolved_file_manager.create_results_directory()
    audio_dir = results_dir / "Audio"
    audio_dir.mkdir(exist_ok=True)

    audio_generator = AudioGenerator(
        api_key=runtime_audio_config.api_key,
        voice_id=runtime_audio_config.voice_id,
        model_id=runtime_audio_config.model_id,
    )
    vocabulary_processor = vocabulary_processor_factory(audio_generator=audio_generator)
    processed_items = vocabulary_processor.process_vocabulary(vocabulary_items, str(audio_dir))

    apkg_path = create_anki_package(results_dir, processed_items, deck_name=deck_name)
    saved_files = None
    if save_outputs:
        payload_for_storage = original_input if original_input is not None else {"vocabulary": vocabulary_items}
        saved_files = resolved_file_manager.save_all_results(results_dir, payload_for_storage, processed_items)

    total_word_audio_files = sum(len(item["audio_paths"]) for item in processed_items)
    total_sentence_audio_files = sum(len(item.get("sentence_audio_paths", [])) for item in processed_items)

    return GenerationPipelineResult(
        results_dir=results_dir,
        processed_items=processed_items,
        apkg_path=apkg_path,
        total_word_audio_files=total_word_audio_files,
        total_sentence_audio_files=total_sentence_audio_files,
        saved_files=saved_files,
    )
