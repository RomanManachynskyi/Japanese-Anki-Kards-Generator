"""
Vocabulary processing module
Handles vocabulary item generation and processing
"""
from .japanese_text import JapaneseTextProcessor
from .audio_generator import AudioGenerator
from .anki_builder import build_anki_note
import config


class VocabularyProcessor:
    """Processes vocabulary items and generates required data."""
    
    def __init__(self, audio_generator=None):
        """
        Initialize vocabulary processor.
        
        Args:
            audio_generator: AudioGenerator instance (creates new if None)
        """
        self.text_processor = JapaneseTextProcessor()
        self.audio_generator = audio_generator or AudioGenerator()
    
    def _determine_audio_filename(self, kanji, reading, reading_hiragana):
        """
        Determine audio filename based on word type.
        Format: kanji(hiragana).mp3 or katakana.mp3 or hiragana.mp3
        
        Args:
            kanji: Kanji representation (can be None)
            reading: Original reading (hiragana/katakana)
            reading_hiragana: Reading converted to hiragana
            
        Returns:
            str: Base filename for audio files
        """
        if kanji:
            # Format: kanji(hiragana)
            return f"{kanji}({reading_hiragana})"
        else:
            # Check if original reading contains katakana
            if self.text_processor.is_katakana(reading):
                # Format: katakana.mp3
                return reading
            else:
                # Format: hiragana.mp3
                return reading_hiragana
    
    def process_word(self, word_data, audio_dir):
        """
        Process a single vocabulary word.
        
        Args:
            word_data: Dictionary with 'reading', 'kanji' (object or None), 'translation',
                       'sentence_kana' (optional), 'sentence_english' (optional),
                       'audio_count' (int or None - if None, no audio is generated)
            audio_dir: Directory to save audio files
        
        Returns:
            dict: Processed word data with furigana, audio paths, and anki_note
        """
        reading = word_data["reading"]
        kanji_data = word_data.get("kanji")  # Now an object or None
        translation = word_data["translation"]
        sentence_kana = word_data.get("sentence_kana", "")
        sentence_english = word_data.get("sentence_english", "")
        sentence_image = word_data.get("sentence_image", "")
        
        # Get per-word audio count (if None, no audio is generated)
        audio_count = word_data.get("audio_count")
        
        # Extract kanji and furigana from the kanji object
        if kanji_data:
            kanji = kanji_data.get("kanji")
            reading_furigana = kanji_data.get("furigana", "")
        else:
            kanji = None
            reading_furigana = ""
        
        # Preserve Katakana if the reading is pure Katakana (no Kanji)
        # Otherwise, convert to hiragana for processing
        if self.text_processor.is_pure_katakana(reading):
            # Keep Katakana as-is
            reading_hiragana = reading
        else:
            # Convert reading to clean hiragana (handles Kanji and mixed text)
            reading_hiragana = self.text_processor.convert_to_hiragana(reading)
        
        # If furigana not provided but kanji exists, generate it automatically (fallback)
        if kanji and not reading_furigana:
            reading_furigana = self.text_processor.build_furigana(kanji, reading_hiragana)
        
        # If no kanji, use hiragana reading as furigana
        if not kanji:
            reading_furigana = reading_hiragana
        
        # Generate vocabulary audio files if audio_count is specified (not None)
        audio_files = []
        if audio_count is not None and audio_count > 0:
            audio_file_name = self._determine_audio_filename(kanji, reading, reading_hiragana)
            audio_files = self.audio_generator.generate_audio_variants(
                reading_hiragana,
                audio_file_name,
                audio_dir,
                count=audio_count
            )
        
        # Generate sentence audio files if sentence_kana is provided and audio_count is specified
        sentence_audio_files = []
        if audio_count is not None and audio_count > 0 and sentence_kana:
            sentence_audio_base = self._determine_audio_filename(kanji, reading, reading_hiragana) + "_sentence"
            sentence_audio_files = self.audio_generator.generate_audio_variants(
                sentence_kana,
                sentence_audio_base,
                audio_dir,
                count=audio_count
            )
        
        generation_mode = word_data.get("generation_mode", "both")
        
        item = {
            "kanji": kanji,
            "reading_hiragana": reading_hiragana,
            "reading_furigana": reading_furigana,
            "translation": translation,
            "audio_paths": audio_files,
            "sentence_kana": sentence_kana,
            "sentence_english": sentence_english,
            "sentence_image": sentence_image,
            "sentence_audio_paths": sentence_audio_files,
            "generation_mode": generation_mode
        }
        
        # Build and attach Anki note
        item["anki_note"] = build_anki_note(item)
        
        return item
    
    def process_vocabulary(self, word_list, audio_dir):
        """
        Process a list of vocabulary words.
        
        Args:
            word_list: List of word dictionaries (each with its own audio settings)
            audio_dir: Directory to save audio files
        
        Returns:
            list: List of processed word dictionaries with anki_note
        """
        results = []
        
        for word_data in word_list:
            processed_word = self.process_word(word_data, audio_dir)
            results.append(processed_word)
        
        return results

