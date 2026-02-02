"""
File management module
Handles file I/O operations, directory creation, and result saving
"""
import os
import json
from datetime import datetime
from pathlib import Path
import config


class FileManager:
    """Handles file operations and result management."""
    
    def __init__(self, base_results_dir=None):
        """
        Initialize file manager.
        
        Args:
            base_results_dir: Base directory for results (defaults to config)
        """
        if base_results_dir is None:
            # Resolve relative path from backend/ directory
            backend_dir = Path(__file__).parent.parent
            results_path = backend_dir / config.RESULTS_DIR
            self.base_results_dir = results_path.resolve()
        else:
            self.base_results_dir = Path(base_results_dir)
    
    def create_results_directory(self):
        """
        Create a results directory with timestamp.
        
        Returns:
            Path: Path to created results directory
        """
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        results_dir = self.base_results_dir / timestamp
        results_dir.mkdir(parents=True, exist_ok=True)
        return results_dir
    
    def save_json(self, results_dir, vocab_data, results):
        """
        Save vocabulary data as JSON.
        
        Args:
            results_dir: Directory to save file
            vocab_data: Original vocabulary input
            results: Processed vocabulary results
            
        Returns:
            str: Path to saved JSON file
        """
        json_path = results_dir / "vocabulary_data.json"
        
        metadata = {
            "total_words": len(results),
            "words_with_kanji": sum(1 for r in results if r["kanji"]),
            "words_without_kanji": sum(1 for r in results if not r["kanji"]),
            "total_audio_files": sum(len(r["audio_paths"]) for r in results)
        }
        
        data = {
            "input_vocabulary": vocab_data,
            "generated_items": results,
            "metadata": metadata
        }
        
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        return str(json_path)
    
    def save_summary(self, results_dir, results):
        """
        Save human-readable summary report.
        
        Args:
            results_dir: Directory to save file
            results: Processed vocabulary results
            
        Returns:
            str: Path to saved summary file
        """
        summary_path = results_dir / "summary.txt"
        
        with open(summary_path, "w", encoding="utf-8") as f:
            f.write("=" * 60 + "\n")
            f.write("ANKI VOCABULARY GENERATION SUMMARY\n")
            f.write("=" * 60 + "\n\n")
            f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Total words processed: {len(results)}\n")
            f.write(f"Words with kanji: {sum(1 for r in results if r['kanji'])}\n")
            f.write(f"Words without kanji: {sum(1 for r in results if not r['kanji'])}\n")
            f.write(f"Total audio files generated: {sum(len(r['audio_paths']) for r in results)}\n")
            f.write("\n" + "=" * 60 + "\n")
            f.write("VOCABULARY ITEMS\n")
            f.write("=" * 60 + "\n\n")
            
            for i, item in enumerate(results, 1):
                f.write(f"{i}. ")
                if item["kanji"]:
                    f.write(f"{item['kanji']} ({item['reading_hiragana']})\n")
                else:
                    f.write(f"{item['reading_hiragana']}\n")
                f.write(f"   Furigana: {item['reading_furigana']}\n")
                f.write(f"   Translation: {item['translation']}\n")
                f.write(f"   Audio files: {len(item['audio_paths'])} files\n")
                f.write("\n")
        
        return str(summary_path)
    
    def save_csv(self, results_dir, results):
        """
        Save vocabulary data as CSV for easy import.
        
        Args:
            results_dir: Directory to save file
            results: Processed vocabulary results
            
        Returns:
            str: Path to saved CSV file
        """
        csv_path = results_dir / "vocabulary.csv"
        
        with open(csv_path, "w", encoding="utf-8") as f:
            f.write("Kanji,Reading (Hiragana),Furigana,Translation,Audio File 1,Audio File 2,Audio File 3\n")
            for item in results:
                kanji = item["kanji"] or ""
                reading = item["reading_hiragana"]
                furigana = item["reading_furigana"]
                translation = item["translation"]
                audio_files = item["audio_paths"]
                # Use relative paths from results directory
                rel_audio = [os.path.relpath(audio, results_dir) for audio in audio_files]
                f.write(f'"{kanji}","{reading}","{furigana}","{translation}",')
                f.write(f'"{rel_audio[0] if len(rel_audio) > 0 else ""}",')
                f.write(f'"{rel_audio[1] if len(rel_audio) > 1 else ""}",')
                f.write(f'"{rel_audio[2] if len(rel_audio) > 2 else ""}"\n')
        
        return str(csv_path)
    
    def save_all_results(self, results_dir, vocab_data, results):
        """
        Save all result files (JSON, summary, Anki package).
        
        Args:
            results_dir: Directory to save files
            vocab_data: Original vocabulary input
            results: Processed vocabulary results
            
        Returns:
            dict: Dictionary with paths to all saved files
        """
        from .anki_builder import create_anki_package
        
        # Create Anki package file
        apkg_path = create_anki_package(results_dir, results)
        
        return {
            "json_path": self.save_json(results_dir, vocab_data, results),
            "summary_path": self.save_summary(results_dir, results),
            "apkg_path": apkg_path
        }
    
    def load_input_json(self, input_file=None):
        """
        Load vocabulary data from JSON file.
        
        Args:
            input_file: Path to input JSON file (defaults to config)
            
        Returns:
            dict: Loaded vocabulary data
        """
        if input_file is None:
            # Resolve relative path from backend/ directory
            backend_dir = Path(__file__).parent.parent
            input_file = backend_dir / config.INPUT_FILE
            input_file = input_file.resolve()
        
        with open(input_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        return data

