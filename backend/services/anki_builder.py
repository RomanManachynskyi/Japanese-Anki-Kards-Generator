"""
Anki package builder module
Handles Anki note structure creation and .apkg file generation
"""
import os
import re
import base64
import hashlib
from datetime import datetime
from pathlib import Path
import genanki
import config

DEFAULT_GENERATION_MODE = "both"
JP_EN_GENERATION_MODE = "jp_en"
EN_JP_GENERATION_MODE = "en_jp"
TEMPLATE_DIRECTORY = Path(__file__).resolve().parent.parent / "templates"
JP_EN_FIELD_NAMES = [
    "Vocabulary-Kanji",
    "Vocabulary-Kana",
    "Word-Furigana",
    "Vocabulary-English",
    "Vocabulary-Audio",
    "Has-Example",
    "Sentence-Kana",
    "Sentence-English",
    "Sentence-Audio",
    "Word-Image",
    "Notes",
]
EN_JP_FIELD_NAMES = [
    "Vocabulary-English",
    "Vocabulary-Kana",
    "Word-Furigana",
    "Vocabulary-Kanji",
    "Vocabulary-Audio",
    "Has-Example",
    "Sentence-Kana",
    "Sentence-English",
    "Sentence-Audio",
    "Word-Image",
    "Notes",
]
ANKI_NOTE_FIELD_NAMES = [
    "Vocabulary-Kanji",
    "Vocabulary-Kana",
    "Word-Furigana",
    "Vocabulary-English",
    "Vocabulary-Audio",
    "Has-Example",
    "Sentence-Kana",
    "Sentence-English",
    "Sentence-Audio",
    "Word-Image",
    "Notes",
]
IMAGE_EXTENSION_MAP = {"jpeg": "jpg", "jpg": "jpg", "png": "png", "gif": "gif", "webp": "webp"}


def _build_audio_field(audio_paths):
    if not audio_paths:
        return "", []

    audio_tags = []
    audio_entries = []
    for audio_path in audio_paths:
        audio_filename = os.path.basename(audio_path)
        audio_tags.append(f"[sound:{audio_filename}]")
        audio_entries.append({"path": audio_path, "filename": audio_filename})
    return "".join(audio_tags), audio_entries


def _decode_word_image(word_image_data):
    if not word_image_data or not word_image_data.startswith("data:image/"):
        return "", []

    try:
        header, encoded = word_image_data.split(",", 1)
        image_format = header.split("/")[1].split(";")[0]
        extension = IMAGE_EXTENSION_MAP.get(image_format.lower(), "png")
        image_bytes = base64.b64decode(encoded)
        image_hash = hashlib.md5(image_bytes).hexdigest()[:8]
        image_filename = f"word_{image_hash}.{extension}"
        return f'<img src="{image_filename}">', [{"data": image_bytes, "filename": image_filename}]
    except Exception as error:
        print(f"Warning: Failed to process word image: {error}")
        return "", []


def _build_note_model(model_id, name, template_name, question_format, answer_format, field_names):
    return genanki.Model(
        model_id,
        name,
        fields=[{"name": field_name} for field_name in field_names],
        templates=[{"name": template_name, "qfmt": question_format, "afmt": answer_format}],
        css="",
    )


def _build_jp_en_note_fields(fields, has_kanji):
    vocabulary_kana = fields["Vocabulary-Kana"] if has_kanji else ""
    return [
        fields["Vocabulary-Kanji"],
        vocabulary_kana,
        fields["Word-Furigana"],
        fields["Vocabulary-English"],
        fields["Vocabulary-Audio"],
        fields["Has-Example"],
        fields["Sentence-Kana"],
        fields["Sentence-English"],
        fields["Sentence-Audio"],
        fields["Word-Image"],
        fields["Notes"],
    ]


def _build_en_jp_note_fields(fields):
    return [
        fields["Vocabulary-English"],
        fields["Vocabulary-Kana"],
        fields["Word-Furigana"],
        fields["Vocabulary-Kanji"],
        fields["Vocabulary-Audio"],
        fields["Has-Example"],
        fields["Sentence-Kana"],
        fields["Sentence-English"],
        fields["Sentence-Audio"],
        fields["Word-Image"],
        fields["Notes"],
    ]


def _collect_audio_media(anki_note_data, media_files):
    for audio_item in anki_note_data.get("audio", []):
        audio_path = audio_item.get("path")
        if audio_path and os.path.exists(audio_path):
            media_files.append(audio_path)


def _collect_image_media(results_dir, anki_note_data, media_files):
    image_dir = results_dir / "Media"
    for image_item in anki_note_data.get("images", []):
        image_data = image_item.get("data")
        image_filename = image_item.get("filename")
        if not (image_data and image_filename):
            continue

        image_dir.mkdir(exist_ok=True)
        image_path = image_dir / image_filename
        with open(image_path, "wb") as image_file:
            image_file.write(image_data)
        media_files.append(str(image_path))


def _extract_ordered_fields(anki_note_data):
    source_fields = anki_note_data.get("fields", {})
    return {field_name: str(source_fields.get(field_name, "") or "") for field_name in ANKI_NOTE_FIELD_NAMES}


def build_anki_note(word):
    vocabulary_kanji = word["kanji"] if word["kanji"] else word["reading_hiragana"]
    vocabulary_kana = word["reading_hiragana"]
    vocabulary_english = word["translation"]
    reading_furigana = word.get("reading_furigana", "") if word.get("kanji") else ""
    
    audio_field, audio_array = _build_audio_field(word.get("audio_paths", []))
    
    sentence_kana = word.get("sentence_kana", "") or ""
    sentence_english = word.get("sentence_english", "") or ""
    word_image_data = word.get("sentence_image", "") or ""
    
    sentence_audio_field, sentence_audio_array = _build_audio_field(word.get("sentence_audio_paths", []))
    audio_array.extend(sentence_audio_array)
    
    word_image_field, image_array = _decode_word_image(word_image_data)

    word_furigana = reading_furigana
    notes = word.get("notes", "") or ""
    has_example = "1" if (sentence_kana or sentence_english or sentence_audio_field) else ""

    return {
        "note_type": "Japanese-Anki-Kard",
        "fields": {
            "Vocabulary-Kanji": vocabulary_kanji,
            "Vocabulary-Kana": vocabulary_kana,
            "Word-Furigana": word_furigana,
            "Vocabulary-English": vocabulary_english,
            "Vocabulary-Audio": audio_field,
            "Has-Example": has_example,
            "Sentence-Kana": sentence_kana,
            "Sentence-English": sentence_english,
            "Sentence-Audio": sentence_audio_field,
            "Word-Image": word_image_field,
            "Notes": notes,
        },
        "audio": audio_array,
        "images": image_array
    }


def create_anki_package(results_dir, results, deck_name="Japanese Vocabulary"):
    note_type_id = config.NOTE_TYPE_ID

    def _strip_comments(html):
        return re.sub(r"<!--.*?-->", "", html, flags=re.DOTALL).strip()

    _front_jp_en_html = (TEMPLATE_DIRECTORY / "anki-card-front.html").read_text(encoding="utf-8")
    _front_en_jp_html = (TEMPLATE_DIRECTORY / "anki-card-front-en-jp.html").read_text(encoding="utf-8")
    _back_jp_en_html = (TEMPLATE_DIRECTORY / "anki-card-back-jp-en.html").read_text(encoding="utf-8")
    _back_en_jp_html = (TEMPLATE_DIRECTORY / "anki-card-back-en-jp.html").read_text(encoding="utf-8")

    _qfmt_jp_en = _strip_comments(_front_jp_en_html)
    _qfmt_en_jp = _strip_comments(_front_en_jp_html)
    _afmt_jp_en = _strip_comments(_back_jp_en_html)
    _afmt_en_jp = _strip_comments(_back_en_jp_html)

    note_model_jp_en = _build_note_model(
        note_type_id,
        "Japanese-Anki-Kard (Japanese→English)",
        "Japanese to English",
        _qfmt_jp_en,
        _afmt_jp_en,
        JP_EN_FIELD_NAMES,
    )

    note_model_en_jp = _build_note_model(
        note_type_id + 1,
        "Japanese-Anki-Kard (English→Japanese)",
        "English to Japanese",
        _qfmt_en_jp,
        _afmt_en_jp,
        EN_JP_FIELD_NAMES,
    )
    
    deck_id = int(datetime.now().timestamp())
    deck = genanki.Deck(deck_id, deck_name)

    media_files = []
    notes_added = 0
    for item in results:
        anki_note_data = item.get("anki_note", {})
        if not anki_note_data:
            continue
        
        fields = _extract_ordered_fields(anki_note_data)
        
        generation_mode = item.get("generation_mode", DEFAULT_GENERATION_MODE)

        has_kanji = item.get("kanji") and item.get("kanji").strip()

        should_create_jp_en = (
            fields["Vocabulary-Kanji"].strip()
            and (generation_mode == DEFAULT_GENERATION_MODE or generation_mode == JP_EN_GENERATION_MODE)
        )
        
        if should_create_jp_en:
            note_jp_en = genanki.Note(
                model=note_model_jp_en,
                fields=_build_jp_en_note_fields(fields, has_kanji),
            )
            deck.add_note(note_jp_en)
            notes_added += 1
        
        should_create_en_jp = (
            fields["Vocabulary-English"].strip()
            and (generation_mode == DEFAULT_GENERATION_MODE or generation_mode == EN_JP_GENERATION_MODE)
        )
        
        if should_create_en_jp:
            note_en_jp = genanki.Note(
                model=note_model_en_jp,
                fields=_build_en_jp_note_fields(fields),
            )
            deck.add_note(note_en_jp)
            notes_added += 1
        
        _collect_audio_media(anki_note_data, media_files)
        _collect_image_media(results_dir, anki_note_data, media_files)

    if notes_added == 0:
        raise ValueError("No notes were added to the deck. Cannot create empty Anki package.")

    package = genanki.Package(deck)
    package.media_files = list(set(media_files))

    apkg_path = results_dir / "vocabulary.apkg"
    package.write_to_file(str(apkg_path))
    
    return str(apkg_path)
