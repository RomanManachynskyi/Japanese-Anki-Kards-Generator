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
EN_JP_EMPTY_TRANSLATION_PLACEHOLDER = "  "
TEMPLATE_DIRECTORY = Path(__file__).resolve().parent.parent / "templates"
ANKI_FIELD_NAMES = [
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


def _build_note_model(model_id, name, template_name, question_format, answer_format):
    return genanki.Model(
        model_id,
        name,
        fields=[{"name": field_name} for field_name in ANKI_FIELD_NAMES],
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
        EN_JP_EMPTY_TRANSLATION_PLACEHOLDER,
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
    return {field_name: str(source_fields.get(field_name, "") or "") for field_name in ANKI_FIELD_NAMES}


def build_anki_note(word):
    """
    Build Anki note structure for Japanese-Anki-Kard note type.
    
    Args:
        word: Dictionary containing:
            - kanji (str or None) - the kanji string
            - reading_hiragana (str)
            - reading_furigana (str) - e.g., 郵便[ゆうびん]局[きょく]
            - translation (str)
            - audio_paths (list of str)
            - sentence_kana (str, optional)
            - sentence_english (str, optional)
            - sentence_audio_paths (list of str, optional)
    
    Returns:
        dict: Anki note structure with fields and audio array
    """
    # Vocabulary-Kanji = kanji if available, otherwise reading_hiragana
    vocabulary_kanji = word["kanji"] if word["kanji"] else word["reading_hiragana"]
    
    # Vocabulary-Kana = reading_hiragana (the reading in hiragana)
    vocabulary_kana = word["reading_hiragana"]
    
    # Vocabulary-English = translation
    vocabulary_english = word["translation"]
    
    # Word-Furigana = word-only furigana for back card (e.g. 郵便[ゆうびん]局[きょく])
    reading_furigana = word.get("reading_furigana", "") if word.get("kanji") else ""
    
    audio_field, audio_array = _build_audio_field(word.get("audio_paths", []))
    
    # Sentence fields
    sentence_kana = word.get("sentence_kana", "") or ""
    sentence_english = word.get("sentence_english", "") or ""
    word_image_data = word.get("sentence_image", "") or ""  # API still sends sentence_image; we store as Word-Image
    
    sentence_audio_field, sentence_audio_array = _build_audio_field(word.get("sentence_audio_paths", []))
    audio_array.extend(sentence_audio_array)
    
    # Word Image: convert base64 to file if provided
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
    """
    Create an Anki package file (.apkg) from the generated vocabulary items.
    
    Args:
        results_dir: Directory where results are saved
        results: List of processed vocabulary items with anki_note data
        deck_name: Name of the Anki deck to create
    
    Returns:
        str: Path to the created .apkg file
    """
    # Two separate note types with templates in backend/templates/
    note_type_id = config.NOTE_TYPE_ID

    def _strip_comments(html):
        return re.sub(r"<!--.*?-->", "", html, flags=re.DOTALL).strip()

    _front_html = (TEMPLATE_DIRECTORY / "anki-card-front.html").read_text(encoding="utf-8")
    _back_jp_en_html = (TEMPLATE_DIRECTORY / "anki-card-back-jp-en.html").read_text(encoding="utf-8")
    _back_en_jp_html = (TEMPLATE_DIRECTORY / "anki-card-back-en-jp.html").read_text(encoding="utf-8")

    _qfmt = _strip_comments(_front_html)
    _afmt_jp_en = _strip_comments(_back_jp_en_html)
    _afmt_en_jp = _strip_comments(_back_en_jp_html)

    # Note type 1: Japanese → English (front: Japanese word, back: translation + example etc.)
    note_model_jp_en = _build_note_model(
        note_type_id,
        "Japanese-Anki-Kard (Japanese→English)",
        "Japanese to English",
        _qfmt,
        _afmt_jp_en,
    )

    # Note type 2: English → Japanese (front: English word, back: Japanese + example etc.)
    note_model_en_jp = _build_note_model(
        note_type_id + 1,
        "Japanese-Anki-Kard (English→Japanese)",
        "English to Japanese",
        _qfmt,
        _afmt_en_jp,
    )
    
    # Create deck
    deck_id = int(datetime.now().timestamp())
    deck = genanki.Deck(deck_id, deck_name)
    
    # Add notes and audio files
    # Create TWO separate notes for each vocabulary item - completely independent
    media_files = []
    notes_added = 0
    for item in results:
        anki_note_data = item.get("anki_note", {})
        if not anki_note_data:
            continue
        
        fields = _extract_ordered_fields(anki_note_data)
        
        # Get generation_mode to determine which cards to create
        generation_mode = item.get("generation_mode", DEFAULT_GENERATION_MODE)
        
        # Check if word has kanji (if no kanji, it's pure hiragana/katakana)
        has_kanji = item.get("kanji") and item.get("kanji").strip()
        
        # Create Japanese → English note if Vocabulary-Kanji field is not empty
        should_create_jp_en = (
            fields["Vocabulary-Kanji"].strip()
            and (generation_mode == DEFAULT_GENERATION_MODE or generation_mode == JP_EN_GENERATION_MODE)
        )
        
        if should_create_jp_en:
            # For Japanese → English cards: if word is pure hiragana/katakana (no kanji),
            # set Vocabulary-Kana to empty
            note_jp_en = genanki.Note(
                model=note_model_jp_en,
                fields=_build_jp_en_note_fields(fields, has_kanji),
            )
            deck.add_note(note_jp_en)
            notes_added += 1
        
        # Create English → Japanese note if English translation exists
        # This is independent of the Japanese note - can exist even without kanji
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
        
        # Collect audio files for package
        _collect_audio_media(anki_note_data, media_files)
        _collect_image_media(results_dir, anki_note_data, media_files)
    
    # Ensure deck has notes before creating package
    if notes_added == 0:
        raise ValueError("No notes were added to the deck. Cannot create empty Anki package.")
    
    # Create package with deck and media files
    # genanki automatically includes models used by notes in the deck
    # But we explicitly include models to ensure they're in the package
    package = genanki.Package(deck)
    package.media_files = list(set(media_files))  # Remove duplicates
    # Models are automatically included when notes using them are added to the deck
    
    # Save package
    apkg_path = results_dir / "vocabulary.apkg"
    package.write_to_file(str(apkg_path))
    
    return str(apkg_path)
