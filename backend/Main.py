"""
Main entry point for Anki Vocabulary Generator
"""
import json
from pathlib import Path
from services.vocabulary_processor import VocabularyProcessor
from services.file_manager import FileManager


def validate_input(input_data):
    """
    Validate input JSON data.
    
    Args:
        input_data: Dictionary from input JSON
        
    Returns:
        list: vocab_list or None if invalid
    """
    vocab = input_data.get("vocabulary", [])
    
    if not vocab:
        print("Error: No vocabulary items found in input.json!")
        return None
    
    # Validate each vocabulary item has valid audio_count (null or positive integer)
    for i, word in enumerate(vocab):
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
    
    return vocab


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
    vocab = validate_input(input_data)
    if vocab is None:
        exit(1)
    
    print(f"Loaded {len(vocab)} vocabulary items from input.json")
    
    # Count words with audio enabled (audio_count is not null)
    words_with_audio = sum(1 for w in vocab if w.get("audio_count") is not None)
    print(f"Words with audio generation enabled: {words_with_audio}/{len(vocab)}")
    
    # Initialize services
    file_manager = FileManager()
    vocabulary_processor = VocabularyProcessor()
    
    # Create results directory
    results_dir = file_manager.create_results_directory()
    print(f"Created results directory: {results_dir}")
    
    # Create Audio subdirectory (always create it, individual words control audio generation)
    audio_dir = results_dir / "Audio"
    audio_dir.mkdir(exist_ok=True)
    
    # Generate vocabulary items
    print("Generating vocabulary items...")
    
    result = vocabulary_processor.process_vocabulary(
        vocab,
        str(audio_dir)
    )
    
    # Save all results
    print("Saving results...")
    saved_files = file_manager.save_all_results(results_dir, input_data, result)
    
    # Count total audio files generated
    total_audio = sum(len(r['audio_paths']) for r in result)
    total_sentence_audio = sum(len(r.get('sentence_audio_paths', [])) for r in result)
    
    print("\n" + "=" * 60)
    print("GENERATION COMPLETE!")
    print("=" * 60)
    print(f"Results saved to: {results_dir}")
    print(f"\nGenerated files:")
    print(f"  - {saved_files['json_path']}")
    print(f"  - {saved_files['summary_path']}")
    print(f"  - {saved_files['apkg_path']} (Anki package - ready to import!)")
    print(f"  - Audio files in: {audio_dir}")
    print(f"\nTotal words: {len(result)}")
    print(f"Total vocabulary audio files: {total_audio}")
    print(f"Total sentence audio files: {total_sentence_audio}")
    print("=" * 60)


if __name__ == "__main__":
    main()
