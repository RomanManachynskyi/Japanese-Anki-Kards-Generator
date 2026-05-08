import tempfile
import unittest

from services.vocabulary_processor import VocabularyProcessor


class FakeAudioGenerator:
    def __init__(self):
        self.calls = []

    def generate_audio_variants(self, text, file_name_base, audio_dir, count=3):
        self.calls.append(
            {
                "text": text,
                "file_name_base": file_name_base,
                "audio_dir": audio_dir,
                "count": count,
            }
        )
        return [f"{audio_dir}/{file_name_base}_{index}.mp3" for index in range(1, count + 1)]


class VocabularyProcessorTests(unittest.TestCase):
    def test_process_word_generates_vocabulary_and_sentence_audio(self):
        processor = VocabularyProcessor(audio_generator=FakeAudioGenerator())
        with tempfile.TemporaryDirectory() as temp_dir:
            processed_word = processor.process_word(
                {
                    "reading": "おにいさん",
                    "kanji": {"kanji": "お兄さん", "furigana": "お兄[にい]さん"},
                    "translation": "older brother",
                    "sentence_kana": "お兄さんは元気です。",
                    "sentence_english": "My older brother is well.",
                    "audio_count": 2,
                    "generation_mode": "both",
                    "notes": "family term",
                },
                temp_dir,
            )

        self.assertEqual(2, len(processed_word["audio_paths"]))
        self.assertEqual(2, len(processed_word["sentence_audio_paths"]))
        self.assertEqual("both", processed_word["generation_mode"])
        self.assertEqual("family term", processed_word["notes"])
        self.assertIn("anki_note", processed_word)
        self.assertEqual("1", processed_word["anki_note"]["fields"]["Has-Example"])

    def test_process_word_skips_audio_when_audio_count_is_none(self):
        fake_audio_generator = FakeAudioGenerator()
        processor = VocabularyProcessor(audio_generator=fake_audio_generator)

        with tempfile.TemporaryDirectory() as temp_dir:
            processed_word = processor.process_word(
                {
                    "reading": "かぞく",
                    "kanji": {"kanji": "家族", "furigana": "家族[かぞく]"},
                    "translation": "family",
                    "audio_count": None,
                },
                temp_dir,
            )

        self.assertEqual([], processed_word["audio_paths"])
        self.assertEqual([], processed_word["sentence_audio_paths"])
        self.assertEqual(0, len(fake_audio_generator.calls))


if __name__ == "__main__":
    unittest.main()
