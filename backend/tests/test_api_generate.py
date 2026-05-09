import unittest
from pathlib import Path
from unittest.mock import patch

import api
from api import CardInput, GenerateRequest, KanjiData, generate_cards


class _FakePipelineResult:
    def __init__(self):
        self.results_dir = Path("results/2026-05-08_20-00-00")
        self.processed_items = [{"audio_paths": ["a.mp3"], "sentence_audio_paths": ["b.mp3"]}]
        self.apkg_path = "results/2026-05-08_20-00-00/vocabulary.apkg"
        self.total_audio_files = 2


class ApiGenerateTests(unittest.IsolatedAsyncioTestCase):
    async def test_generate_cards_returns_counts_and_run_id(self):
        request_payload = GenerateRequest(
            cards=[
                CardInput(
                    reading="かぞく",
                    kanji=KanjiData(kanji="家族", furigana="家族[かぞく]"),
                    translation="family",
                    sentence_kana="かぞくです",
                    sentence_english="It is family",
                    audio_count=1,
                    generation_mode="both",
                )
            ]
        )

        with patch.object(api, "run_generation_pipeline", lambda **kwargs: _FakePipelineResult()):
            response = await generate_cards(request_payload)

        self.assertTrue(response.success)
        self.assertEqual("2026-05-08_20-00-00", response.run_id)
        self.assertEqual(1, response.total_cards)
        self.assertEqual(2, response.total_audio_files)

    async def test_generate_cards_passes_custom_deck_name_to_pipeline(self):
        request_payload = GenerateRequest(
            cards=[
                CardInput(
                    reading="かぞく",
                    kanji=KanjiData(kanji="家族", furigana="家族[かぞく]"),
                    translation="family",
                    generation_mode="both",
                )
            ],
            deck_name=" Family Deck ",
        )

        with patch.object(api, "run_generation_pipeline") as run_pipeline_mock:
            run_pipeline_mock.return_value = _FakePipelineResult()
            await generate_cards(request_payload)

        self.assertEqual("Family Deck", run_pipeline_mock.call_args.kwargs["deck_name"])


if __name__ == "__main__":
    unittest.main()
