"""
Anki package builder module
Handles Anki note structure creation and .apkg file generation
"""
import os
import base64
from datetime import datetime
from pathlib import Path
import genanki
import config


def build_anki_note(word):
    """
    Build Anki note structure for Japanese-75658 note type.
    
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
    
    # Vocabulary-Furigana = reading_hiragana (plain hiragana, e.g., ゆうびんきょく)
    vocabulary_furigana = word["reading_hiragana"]
    
    # Vocabulary-Kana = reading_hiragana (the reading in hiragana)
    vocabulary_kana = word["reading_hiragana"]
    
    # Vocabulary-English = translation
    vocabulary_english = word["translation"]
    
    # Reading = reading_furigana if kanji exists, otherwise empty
    # e.g., 郵便[ゆうびん]局[きょく] or "" if no kanji
    reading_furigana = word.get("reading_furigana", "") if word.get("kanji") else ""
    
    # Expression = same as Vocabulary-Kanji
    expression = vocabulary_kanji
    
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
    sentence_image_data = word.get("sentence_image", "") or ""
    
    # Reading field: vocabulary reading with furigana + sentence kana
    # Format: 郵便[ゆうびん]局[きょく]<br>郵便局に行きます
    reading_parts = []
    if reading_furigana:
        reading_parts.append(reading_furigana)
    if sentence_kana:
        reading_parts.append(sentence_kana)
    reading = "<br>".join(reading_parts)
    
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
    
    # Handle sentence image: convert base64 to file if provided
    sentence_image_field = ""
    sentence_english_with_image = sentence_english
    image_array = []
    if sentence_image_data:
        try:
            # Check if it's a base64 data URL
            if sentence_image_data.startswith("data:image/"):
                # Extract base64 data and image format
                header, encoded = sentence_image_data.split(",", 1)
                # Get image format from header (e.g., "data:image/png;base64")
                image_format = header.split("/")[1].split(";")[0]
                # Determine file extension
                ext_map = {"jpeg": "jpg", "jpg": "jpg", "png": "png", "gif": "gif", "webp": "webp"}
                ext = ext_map.get(image_format.lower(), "png")
                
                # Decode base64
                image_bytes = base64.b64decode(encoded)
                
                # Generate unique filename
                import hashlib
                image_hash = hashlib.md5(image_bytes).hexdigest()[:8]
                image_filename = f"sentence_{image_hash}.{ext}"
                
                # Store image data for later file creation
                image_array.append({
                    "data": image_bytes,
                    "filename": image_filename
                })
                
                # Set field to reference the image
                sentence_image_field = f'<img src="{image_filename}">'
                
                # Also include image in Sentence-English field (in separate row)
                if sentence_english:
                    sentence_english_with_image = f"{sentence_english}<br><br>{sentence_image_field}"
                else:
                    sentence_english_with_image = sentence_image_field
        except Exception as e:
            # If conversion fails, leave empty
            print(f"Warning: Failed to process sentence image: {e}")
            sentence_image_field = ""
    
    return {
        "note_type": "Japanese-75658",
        "fields": {
            "Vocabulary-Kanji": vocabulary_kanji,
            "Vocabulary-Furigana": vocabulary_furigana,
            "Vocabulary-Kana": vocabulary_kana,
            "Vocabulary-English": vocabulary_english,
            "Vocabulary-Audio": audio_field,
            "Vocabulary-Pos": "",  # Empty by default
            "Caution": "",  # Empty by default
            "Expression": expression,
            "Reading": reading,
            "Sentence-Kana": sentence_kana,
            "Sentence-English": sentence_english_with_image,
            "Sentence-Clozed": "",  # Empty by default
            "Sentence-Audio": sentence_audio_field,
            "Sentence-Image": sentence_image_field,
            "Notes": "",  # Empty by default
            "Core-Index": "",  # Empty by default
            "Optimized-Voc-Index": "",  # Empty by default
            "Optimized-Sent-Index": ""  # Empty by default
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
    # Create note type matching "Japanese-75658"
    # IMPORTANT: The note_type_id must match your existing Anki note type ID
    # To find your note type ID:
    # 1. In Anki, go to Tools > Manage Note Types
    # 2. Select "Japanese-75658"
    # 3. The ID is shown in the URL or you can use AnkiConnect to query it
    # If the ID doesn't match, Anki may match to a different note type or create a new one
    note_type_id = config.NOTE_TYPE_ID
    
    # Create two completely separate note types
    # This ensures cards are completely independent, like two different words
    
    # Model 1: Japanese → English
    note_model_jp_en = genanki.Model(
        note_type_id,
        "Japanese-75658",
        fields=[
            {"name": "Vocabulary-Kanji"},
            {"name": "Vocabulary-Furigana"},
            {"name": "Vocabulary-Kana"},
            {"name": "Vocabulary-English"},
            {"name": "Vocabulary-Audio"},
            {"name": "Vocabulary-Pos"},
            {"name": "Caution"},
            {"name": "Expression"},
            {"name": "Reading"},
            {"name": "Sentence-Kana"},
            {"name": "Sentence-English"},
            {"name": "Sentence-Clozed"},
            {"name": "Sentence-Audio"},
            {"name": "Sentence-Image"},
            {"name": "Notes"},
            {"name": "Core-Index"},
            {"name": "Optimized-Voc-Index"},
            {"name": "Optimized-Sent-Index"},
        ],
        templates=[
            {
                "name": "English Translate",
                "qfmt": "<span style=\"font-size: 50px;\">{{Vocabulary-Kanji}}</span>",
                "afmt": "{{FrontSide}}<hr id=answer>{{Vocabulary-Audio}}{{#Sentence-Kana}}<br>{{Sentence-Kana}}{{/Sentence-Kana}}<br><span style=\"font-size: 30px;\">{{Vocabulary-English}}</span><br><span style=\"font-size: 14px;\"></span><br><span style=\"font-size: 40px;\">{{furigana:Reading}}</span><br><span style=\"font-size: 25px;\">{{Sentence-English}}</span><br>",
            },
        ],
        css="""
        .card {
            font-family: arial;
            font-size: 25px;
            text-align: center;
            color: White;
            background-color: Black;
        }
        """
    )
    
    # Model 2: English → Japanese (completely separate note type)
    # Use same name as backup implementation for consistency
    note_model_en_jp = genanki.Model(
        note_type_id + 1,  # Different ID
        "Japanese-75658",
        fields=[
            {"name": "Vocabulary-Kanji"},
            {"name": "Vocabulary-Furigana"},
            {"name": "Vocabulary-Kana"},
            {"name": "Vocabulary-English"},
            {"name": "Vocabulary-Audio"},
            {"name": "Vocabulary-Pos"},
            {"name": "Caution"},
            {"name": "Expression"},
            {"name": "Reading"},
            {"name": "Sentence-Kana"},
            {"name": "Sentence-English"},
            {"name": "Sentence-Clozed"},
            {"name": "Sentence-Audio"},
            {"name": "Sentence-Image"},
            {"name": "Notes"},
            {"name": "Core-Index"},
            {"name": "Optimized-Voc-Index"},
            {"name": "Optimized-Sent-Index"},
        ],
        templates=[
            {
                "name": "English Translate",
                "qfmt": "<span style=\"font-size: 50px;\">{{Vocabulary-English}}</span>",
                "afmt": "{{FrontSide}}<hr id=answer>{{Vocabulary-Audio}}{{#Sentence-Kana}}<br>{{Sentence-Kana}}{{/Sentence-Kana}}<br><span style=\"font-size: 30px;\">{{Vocabulary-Kanji}}</span><br><span style=\"font-size: 14px;\"></span><br><span style=\"font-size: 40px;\">{{furigana:Reading}}</span><br><span style=\"font-size: 25px;\">{{Sentence-English}}</span>",
            },
        ],
        css="""
        .card {
            font-family: arial;
            font-size: 25px;
            text-align: center;
            color: White;
            background-color: Black;
        }
        """
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
        
        # Ensure all fields are strings (not None) for genanki
        # Field order matches the model definition exactly
        vocabulary_kanji = str(fields.get("Vocabulary-Kanji", "") or "")
        vocabulary_furigana = str(fields.get("Vocabulary-Furigana", "") or "")
        vocabulary_kana = str(fields.get("Vocabulary-Kana", "") or "")
        vocabulary_english = str(fields.get("Vocabulary-English", "") or "")
        vocabulary_audio = str(fields.get("Vocabulary-Audio", "") or "")
        vocabulary_pos = str(fields.get("Vocabulary-Pos", "") or "")
        caution = str(fields.get("Caution", "") or "")
        expression = str(fields.get("Expression", "") or "")
        reading = str(fields.get("Reading", "") or "")
        sentence_kana = str(fields.get("Sentence-Kana", "") or "")
        sentence_english = str(fields.get("Sentence-English", "") or "")
        sentence_clozed = str(fields.get("Sentence-Clozed", "") or "")
        sentence_audio = str(fields.get("Sentence-Audio", "") or "")
        sentence_image = str(fields.get("Sentence-Image", "") or "")
        notes = str(fields.get("Notes", "") or "")
        core_index = str(fields.get("Core-Index", "") or "")
        optimized_voc_index = str(fields.get("Optimized-Voc-Index", "") or "")
        optimized_sent_index = str(fields.get("Optimized-Sent-Index", "") or "")
        
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
                    vocabulary_furigana,
                    vocabulary_kana_for_jp_en,
                    vocabulary_english,
                    vocabulary_audio,
                    vocabulary_pos,
                    caution,
                    expression,
                    reading,
                    sentence_kana,
                    sentence_english,
                    sentence_clozed,
                    sentence_audio,
                    sentence_image,
                    notes,
                    core_index,
                    optimized_voc_index,
                    optimized_sent_index
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
                    vocabulary_furigana,
                    vocabulary_kana,
                    "  ",    # Vocabulary-English = empty (two spaces) for English → Japanese cards
                    vocabulary_audio,
                    vocabulary_pos,
                    caution,
                    expression,
                    reading,
                    sentence_kana,
                    sentence_english,
                    sentence_clozed,
                    sentence_audio,
                    sentence_image,
                    notes,
                    core_index,
                    optimized_voc_index,
                    optimized_sent_index
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
