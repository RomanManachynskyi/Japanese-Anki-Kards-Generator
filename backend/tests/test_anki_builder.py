import tempfile
import unittest
from pathlib import Path

from services.anki_builder import build_anki_note, create_anki_package


class AnkiBuilderTests(unittest.TestCase):
    def test_build_anki_note_sets_image_audio_and_example_fields(self):
        note_payload = build_anki_note(
            {
                "kanji": "お兄さん",
                "reading_hiragana": "おにいさん",
                "reading_furigana": "お兄[にい]さん",
                "translation": "older brother",
                "audio_paths": ["C:/tmp/word_1.mp3"],
                "sentence_kana": "お兄さんは元気です。",
                "sentence_english": "My older brother is well.",
                "sentence_audio_paths": ["C:/tmp/word_sentence_1.mp3"],
                "sentence_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
                "notes": "family term",
            }
        )

        fields = note_payload["fields"]
        self.assertEqual("お兄さん", fields["Vocabulary-Kanji"])
        self.assertEqual("1", fields["Has-Example"])
        self.assertIn("[sound:word_1.mp3]", fields["Vocabulary-Audio"])
        self.assertIn("[sound:word_sentence_1.mp3]", fields["Sentence-Audio"])
        self.assertIn("<img src=", fields["Word-Image"])
        self.assertEqual("family term", fields["Notes"])
        self.assertEqual(2, len(note_payload["audio"]))
        self.assertEqual(1, len(note_payload["images"]))

    def test_create_anki_package_creates_apkg_for_both_modes(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            results_dir = Path(temp_dir)
            audio_dir = results_dir / "Audio"
            audio_dir.mkdir(exist_ok=True)
            audio_path = audio_dir / "test_1.mp3"
            audio_path.write_bytes(b"audio")

            word_result = {
                "kanji": "家族",
                "generation_mode": "both",
                "anki_note": build_anki_note(
                    {
                        "kanji": "家族",
                        "reading_hiragana": "かぞく",
                        "reading_furigana": "家族[かぞく]",
                        "translation": "family",
                        "audio_paths": [str(audio_path)],
                        "sentence_kana": "",
                        "sentence_english": "",
                        "sentence_audio_paths": [],
                        "sentence_image": "",
                        "notes": "",
                    }
                ),
            }

            apkg_path = create_anki_package(results_dir, [word_result])
            self.assertTrue(Path(apkg_path).exists())
            self.assertEqual(".apkg", Path(apkg_path).suffix)


if __name__ == "__main__":
    unittest.main()
