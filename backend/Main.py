"""
Main entry point for Anki Vocabulary Generator
"""
import json
from pathlib import Path
from services.file_manager import FileManager
from services.pipeline import RuntimeAudioConfig, run_generation_pipeline
import config


def validate_input(input_data):
    """
    Validate input JSON data.
    
    Args:
        input_data: Dictionary from input JSON
        
    Returns:
        list: vocab_list or None if invalid
    """
    vocabulary_items = input_data.get("vocabulary", [])

    if not vocabulary_items:
        print("Error: No vocabulary items found in input.json!")
        return None
    
    # Validate each vocabulary item has valid audio_count (null or positive integer)
    for i, word in enumerate(vocabulary_items):
        audio_count = word.get("audio_count")
        
        # audio_count can be null (no audio) or a positive integer
        if audio_count is not None:
            try:
                audio_count = int(audio_count)
                if audio_count < 1:
                    print(f"Error: 'audio_count' must be a positive integer (or null) for word {i+1}!")
                    return None
            except (ValueError, TypeError):
                print(f"Error: 'audio_count' must be a valid integer (or null) for word {i+1}!")
                return None
    
    return vocabulary_items


def main():
    """Main execution function."""
    # Load input from JSON file
    input_file = Path("input.json")
    if not input_file.exists():
        print(f"Error: {input_file} not found!")
        exit(1)
    
    with open(input_file, "r", encoding="utf-8") as f:
        input_data = json.load(f)
    
    # Validate input
    vocabulary_items = validate_input(input_data)
    if vocabulary_items is None:
        exit(1)
    
    print(f"Loaded {len(vocabulary_items)} vocabulary items from input.json")
    
    # Count words with audio enabled (audio_count is not null)
    words_with_audio = sum(1 for word in vocabulary_items if word.get("audio_count") is not None)
    print(f"Words with audio generation enabled: {words_with_audio}/{len(vocabulary_items)}")
    
    # Initialize services
    file_manager = FileManager()
    
    # Generate vocabulary items
    print("Generating vocabulary items...")

    pipeline_result = run_generation_pipeline(
        vocabulary_items=vocabulary_items,
        runtime_audio_config=RuntimeAudioConfig(
            api_key=config.API_KEY,
            voice_id=config.VOICE_ID,
            model_id=config.MODEL_ID,
        ),
        file_manager=file_manager,
        save_outputs=True,
        original_input=input_data,
    )
    results_dir = pipeline_result.results_dir
    saved_files = pipeline_result.saved_files or {}
    audio_dir = results_dir / "Audio"
    
    print("\n" + "=" * 60)
    print("GENERATION COMPLETE!")
    print("=" * 60)
    print(f"Results saved to: {results_dir}")
    print(f"\nGenerated files:")
    print(f"  - {saved_files['json_path']}")
    print(f"  - {saved_files['summary_path']}")
    print(f"  - {saved_files['apkg_path']} (Anki package - ready to import!)")
    print(f"  - Audio files in: {audio_dir}")
    print(f"\nTotal words: {len(pipeline_result.processed_items)}")
    print(f"Total vocabulary audio files: {pipeline_result.total_word_audio_files}")
    print(f"Total sentence audio files: {pipeline_result.total_sentence_audio_files}")
    print("=" * 60)


if __name__ == "__main__":
    main()
