"""
Vocabulary processing module
Handles vocabulary item generation and processing
"""
from .japanese_text import JapaneseTextProcessor
from .audio_generator import AudioGenerator
from .anki_builder import build_anki_note
DEFAULT_GENERATION_MODE = "both"


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
        if kanji:
            return f"{kanji}({reading_hiragana})"
        else:
            if self.text_processor.is_katakana(reading):
                return reading
            else:
                return reading_hiragana

    def _resolve_reading_hiragana(self, reading):
        if self.text_processor.is_pure_katakana(reading):
            return reading
        return self.text_processor.convert_to_hiragana(reading)

    @staticmethod
    def _is_audio_enabled(audio_count):
        return audio_count is not None and audio_count > 0

    @staticmethod
    def _extract_kanji_data(kanji_data):
        if not kanji_data:
            return None, ""
        return kanji_data.get("kanji"), kanji_data.get("furigana", "")
    
    def process_word(self, word_data, audio_dir):
        reading = word_data["reading"]
        kanji_data = word_data.get("kanji")
        translation = word_data["translation"]
        sentence_kana = word_data.get("sentence_kana", "")
        sentence_english = word_data.get("sentence_english", "")
        sentence_image = word_data.get("sentence_image", "")

        audio_count = word_data.get("audio_count")

        kanji, reading_furigana = self._extract_kanji_data(kanji_data)

        reading_hiragana = self._resolve_reading_hiragana(reading)

        if kanji and not reading_furigana:
            reading_furigana = self.text_processor.build_furigana(kanji, reading_hiragana)

        if not kanji:
            reading_furigana = reading_hiragana

        audio_files = []
        if self._is_audio_enabled(audio_count):
            audio_file_name = self._determine_audio_filename(kanji, reading, reading_hiragana)
            audio_files = self.audio_generator.generate_audio_variants(
                reading_hiragana,
                audio_file_name,
                audio_dir,
                count=audio_count
            )
        
        sentence_audio_files = []
        if self._is_audio_enabled(audio_count) and sentence_kana:
            sentence_audio_base = self._determine_audio_filename(kanji, reading, reading_hiragana) + "_sentence"
            sentence_audio_files = self.audio_generator.generate_audio_variants(
                sentence_kana,
                sentence_audio_base,
                audio_dir,
                count=audio_count
            )
        
        generation_mode = word_data.get("generation_mode", DEFAULT_GENERATION_MODE)
        notes = word_data.get("notes", "") or ""

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
            "generation_mode": generation_mode,
            "notes": notes,
        }
        
        item["anki_note"] = build_anki_note(item)
        
        return item
    
    def process_vocabulary(self, word_list, audio_dir):
        results = []
        
        for word_data in word_list:
            processed_word = self.process_word(word_data, audio_dir)
            results.append(processed_word)
        
        return results

