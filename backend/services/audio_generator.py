"""
Audio generation module
Handles text-to-speech conversion using ElevenLabs API
"""
import os
from elevenlabs import ElevenLabs
import config


class AudioGenerator:
    """Handles audio file generation for Japanese vocabulary."""
    
    def __init__(self, api_key=None, voice_id=None, model_id=None):
        """
        Initialize audio generator.
        
        Args:
            api_key: ElevenLabs API key (defaults to config)
            voice_id: Voice ID to use (defaults to config)
            model_id: Model ID to use (defaults to config)
        """
        self.api_key = api_key or config.API_KEY
        self.voice_id = voice_id or config.VOICE_ID
        self.model_id = model_id or config.MODEL_ID
        self.client = ElevenLabs(api_key=self.api_key)
    
    def generate_audio_file(self, text, file_path):
        """
        Generate a single audio file from text.
        
        Args:
            text: Text to convert to speech
            file_path: Path where audio file should be saved
            
        Returns:
            str: Path to generated audio file
        """
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        audio = self.client.text_to_speech.convert(
            voice_id=self.voice_id,
            model_id=self.model_id,
            text=text
        )
        
        with open(file_path, "wb") as f:
            for chunk in audio:
                f.write(chunk)
        
        return file_path
    
    def generate_audio_variants(self, text, file_name_base, audio_dir, count=3):
        """
        Generate multiple audio variants for a word.
        
        Args:
            text: Text to convert to speech
            file_name_base: Base name for audio files (without extension)
            audio_dir: Directory to save audio files
            count: Number of variants to generate (defaults to 3)
            
        Returns:
            list: List of paths to generated audio files
        """
        
        file_paths = []
        
        for i in range(1, count + 1):
            file_name = f"{file_name_base}_{i}.mp3"
            file_path = os.path.join(audio_dir, file_name)
            self.generate_audio_file(text, file_path)
            file_paths.append(file_path)
        
        return file_paths

