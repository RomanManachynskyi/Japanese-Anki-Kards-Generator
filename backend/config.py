"""
Configuration file for Anki Vocabulary Generator
"""
# ElevenLabs API Configuration
API_KEY = ""
VOICE_ID = "fUjY9K2nAIwlALOwSiwc"
# Yui - Japanese female Anime  - fUjY9K2nAIwlALOwSiwc
# Shunshun - Japanese Cute Voice - lhTvHflPVOqgSWyuWQry
# Aki - Friendly, Clear and Natural - ngvNHfiCrXLPAHcTrZK1
MODEL_ID = "eleven_multilingual_v2"

# Audio Generation Settings
AUDIO_VARIANTS_COUNT = 3  # Number of audio variants to generate per word

# File Paths
INPUT_FILE = "input.json"  # Path to input JSON file (relative to backend/)
RESULTS_DIR = "../results"  # Base directory for results (relative to backend/)

# Anki Configuration
NOTE_TYPE_ID = 1607392319  # Update this to match your actual note type ID
# To find your note type ID:
# 1. In Anki, go to Tools > Manage Note Types
# 2. Select "Japanese-Anki-Kard"
# 3. The ID is shown in the URL or you can use AnkiConnect to query it
