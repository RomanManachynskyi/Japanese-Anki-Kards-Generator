"""
Anki package builder module
Handles Anki note structure creation and .apkg file generation
"""
import os
import re
import base64
from datetime import datetime
from pathlib import Path
import genanki
import config


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
    
    # Audio field: include ALL audio files if available
    audio_field = ""
    audio_array = []
    
    if word.get("audio_paths") and len(word["audio_paths"]) > 0:
        # Build audio field with ALL audio files
        audio_tags = []
        for audio_path in word["audio_paths"]:
            audio_filename = os.path.basename(audio_path)
            audio_tags.append(f"[sound:{audio_filename}]")
            audio_array.append({
                "path": audio_path,
                "filename": audio_filename
            })
        audio_field = "".join(audio_tags)
    
    # Sentence fields
    sentence_kana = word.get("sentence_kana", "") or ""
    sentence_english = word.get("sentence_english", "") or ""
    word_image_data = word.get("sentence_image", "") or ""  # API still sends sentence_image; we store as Word-Image
    
    # Sentence audio field: include ALL sentence audio files if available
    sentence_audio_field = ""
    sentence_audio_paths = word.get("sentence_audio_paths", [])
    if sentence_audio_paths and len(sentence_audio_paths) > 0:
        sentence_audio_tags = []
        for audio_path in sentence_audio_paths:
            audio_filename = os.path.basename(audio_path)
            sentence_audio_tags.append(f"[sound:{audio_filename}]")
            audio_array.append({
                "path": audio_path,
                "filename": audio_filename
            })
        sentence_audio_field = "".join(sentence_audio_tags)
    
    # Word Image: convert base64 to file if provided
    word_image_field = ""
    image_array = []
    if word_image_data:
        try:
            if word_image_data.startswith("data:image/"):
                header, encoded = word_image_data.split(",", 1)
                image_format = header.split("/")[1].split(";")[0]
                ext_map = {"jpeg": "jpg", "jpg": "jpg", "png": "png", "gif": "gif", "webp": "webp"}
                ext = ext_map.get(image_format.lower(), "png")
                image_bytes = base64.b64decode(encoded)
                import hashlib
                image_hash = hashlib.md5(image_bytes).hexdigest()[:8]
                image_filename = f"word_{image_hash}.{ext}"
                image_array.append({"data": image_bytes, "filename": image_filename})
                word_image_field = f'<img src="{image_filename}">'
        except Exception as e:
            print(f"Warning: Failed to process word image: {e}")

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
    _templates_dir = Path(__file__).resolve().parent.parent / "templates"

    def _strip_comments(html):
        return re.sub(r"<!--.*?-->", "", html, flags=re.DOTALL).strip()

    _front_html = (_templates_dir / "anki-card-front.html").read_text(encoding="utf-8")
    _back_jp_en_html = (_templates_dir / "anki-card-back-jp-en.html").read_text(encoding="utf-8")
    _back_en_jp_html = (_templates_dir / "anki-card-back-en-jp.html").read_text(encoding="utf-8")

    _qfmt = _strip_comments(_front_html)
    _afmt_jp_en = _strip_comments(_back_jp_en_html)
    _afmt_en_jp = _strip_comments(_back_en_jp_html)

    # Note type 1: Japanese → English (front: Japanese word, back: translation + example etc.)
    note_model_jp_en = genanki.Model(
        note_type_id,
        "Japanese-Anki-Kard (Japanese→English)",
        fields=[
            {"name": "Vocabulary-Kanji"},
            {"name": "Vocabulary-Kana"},
            {"name": "Word-Furigana"},
            {"name": "Vocabulary-English"},
            {"name": "Vocabulary-Audio"},
            {"name": "Has-Example"},
            {"name": "Sentence-Kana"},
            {"name": "Sentence-English"},
            {"name": "Sentence-Audio"},
            {"name": "Word-Image"},
            {"name": "Notes"},
        ],
        templates=[
            {"name": "Japanese to English", "qfmt": _qfmt, "afmt": _afmt_jp_en},
        ],
        css="",
    )

    # Note type 2: English → Japanese (front: English word, back: Japanese + example etc.)
    note_model_en_jp = genanki.Model(
        note_type_id + 1,
        "Japanese-Anki-Kard (English→Japanese)",
        fields=[
            {"name": "Vocabulary-Kanji"},
            {"name": "Vocabulary-Kana"},
            {"name": "Word-Furigana"},
            {"name": "Vocabulary-English"},
            {"name": "Vocabulary-Audio"},
            {"name": "Has-Example"},
            {"name": "Sentence-Kana"},
            {"name": "Sentence-English"},
            {"name": "Sentence-Audio"},
            {"name": "Word-Image"},
            {"name": "Notes"},
        ],
        templates=[
            {"name": "English to Japanese", "qfmt": _qfmt, "afmt": _afmt_en_jp},
        ],
        css="",
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
        
        fields = anki_note_data.get("fields", {})
        
        # Field order matches the model definition exactly
        vocabulary_kanji = str(fields.get("Vocabulary-Kanji", "") or "")
        vocabulary_kana = str(fields.get("Vocabulary-Kana", "") or "")
        word_furigana = str(fields.get("Word-Furigana", "") or "")
        vocabulary_english = str(fields.get("Vocabulary-English", "") or "")
        vocabulary_audio = str(fields.get("Vocabulary-Audio", "") or "")
        has_example = str(fields.get("Has-Example", "") or "")
        sentence_kana = str(fields.get("Sentence-Kana", "") or "")
        sentence_english = str(fields.get("Sentence-English", "") or "")
        sentence_audio = str(fields.get("Sentence-Audio", "") or "")
        word_image = str(fields.get("Word-Image", "") or "")
        notes = str(fields.get("Notes", "") or "")
        
        # Get generation_mode to determine which cards to create
        generation_mode = item.get("generation_mode", "both")
        
        # Check if word has kanji (if no kanji, it's pure hiragana/katakana)
        has_kanji = item.get("kanji") and item.get("kanji").strip()
        
        # Create Japanese → English note if Vocabulary-Kanji field is not empty
        should_create_jp_en = (
            vocabulary_kanji.strip() and 
            (generation_mode == "both" or generation_mode == "jp_en")
        )
        
        if should_create_jp_en:
            # For Japanese → English cards: if word is pure hiragana/katakana (no kanji),
            # set Vocabulary-Kana to empty
            vocabulary_kana_for_jp_en = "" if not has_kanji else vocabulary_kana
            
            # Note 1: Japanese → English (completely separate note)
            note_jp_en = genanki.Note(
                model=note_model_jp_en,
                fields=[
                    vocabulary_kanji,
                    vocabulary_kana_for_jp_en,
                    word_furigana,
                    vocabulary_english,
                    vocabulary_audio,
                    has_example,
                    sentence_kana,
                    sentence_english,
                    sentence_audio,
                    word_image,
                    notes,
                ]
            )
            deck.add_note(note_jp_en)
            notes_added += 1
        
        # Create English → Japanese note if English translation exists
        # This is independent of the Japanese note - can exist even without kanji
        should_create_en_jp = (
            vocabulary_english.strip() and 
            (generation_mode == "both" or generation_mode == "en_jp")
        )
        
        if should_create_en_jp:
            # Note 2: English → Japanese (completely separate note, like a different word)
            # Swap Vocabulary-Kanji and Vocabulary-English for the English version
            note_en_jp = genanki.Note(
                model=note_model_en_jp,
                fields=[
                    vocabulary_english,  # Vocabulary-Kanji = English translation
                    vocabulary_kana,
                    word_furigana,
                    "  ",    # Vocabulary-English = empty (two spaces) for English → Japanese cards
                    vocabulary_audio,
                    has_example,
                    sentence_kana,
                    sentence_english,
                    sentence_audio,
                    word_image,
                    notes,
                ]
            )
            deck.add_note(note_en_jp)
            notes_added += 1
        
        # Collect audio files for package
        audio_array = anki_note_data.get("audio", [])
        for audio_item in audio_array:
            audio_path = audio_item.get("path")
            if audio_path and os.path.exists(audio_path):
                media_files.append(audio_path)
        
        # Collect image files for package
        image_array = anki_note_data.get("images", [])
        for image_item in image_array:
            image_data = image_item.get("data")
            image_filename = image_item.get("filename")
            if image_data and image_filename:
                # Create temporary image file in results directory
                image_dir = results_dir / "Media"
                image_dir.mkdir(exist_ok=True)
                image_path = image_dir / image_filename
                with open(image_path, "wb") as f:
                    f.write(image_data)
                media_files.append(str(image_path))
    
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
