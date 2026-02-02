"""
Japanese text processing utilities
Handles conversion between kanji, hiragana, katakana, and furigana generation
"""
from pykakasi import kakasi
from fugashi import Tagger


class JapaneseTextProcessor:
    """Handles Japanese text processing operations."""
    
    def __init__(self):
        """Initialize Japanese text processing tools."""
        # Initialize fugashi tagger
        self.tagger = Tagger()
        
        # Initialize pykakasi converter
        kks = kakasi()
        kks.setMode("J", "H")   # Kanji → Hiragana
        kks.setMode("K", "H")   # Katakana → Hiragana
        self.converter = kks.getConverter()
    
    def convert_to_hiragana(self, text):
        """
        Convert text to hiragana using pykakasi.
        Handles both old and new API.
        
        Args:
            text: Input text (kanji, katakana, or hiragana)
            
        Returns:
            str: Text converted to hiragana
        """
        try:
            # Try new API: convert() returns list of dicts
            result = self.converter.convert(text)
            if isinstance(result, list) and len(result) > 0 and isinstance(result[0], dict):
                # Join all hiragana from the result
                return ''.join(item.get('hira', item.get('orig', '')) for item in result)
        except (AttributeError, TypeError, KeyError):
            pass
        
        # Fallback to old API (deprecated but still works)
        try:
            return self.converter.do(text)
        except AttributeError:
            return text  # Return original if conversion fails
    
    def build_furigana(self, kanji_word, reading_hiragana):
        """
        Build furigana string from kanji and hiragana reading.
        Example: 郵便局 + ゆうびんきょく → 郵[ゆう]便[びん]局[きょく]
        
        Args:
            kanji_word: Word in kanji
            reading_hiragana: Reading in hiragana
            
        Returns:
            str: Furigana-formatted string
        """
        tokens = self.tagger(kanji_word)
        reading_index = 0
        result = ""
        
        for token in tokens:
            surface = token.surface
            kana = self.convert_to_hiragana(surface)
            kana_len = len(kana)
            
            segment = reading_hiragana[reading_index:reading_index+kana_len]
            reading_index += kana_len
            
            if surface == kana:
                result += surface
            else:
                result += f"{surface}[{segment}]"
        
        return result
    
    def is_katakana(self, text):
        """
        Check if text contains katakana characters.
        
        Args:
            text: Input text to check
            
        Returns:
            bool: True if text contains katakana
        """
        # Katakana range: U+30A0-U+30FF
        return any('\u30A0' <= char <= '\u30FF' for char in text)
    
    def is_kanji(self, text):
        """
        Check if text contains kanji characters.
        
        Args:
            text: Input text to check
            
        Returns:
            bool: True if text contains kanji
        """
        # Kanji ranges: CJK Unified Ideographs and extensions
        for char in text:
            code = ord(char)
            if ((0x4E00 <= code <= 0x9FFF) or  # CJK Unified Ideographs
                (0x3400 <= code <= 0x4DBF) or  # CJK Extension A
                (0x20000 <= code <= 0x2A6DF) or  # CJK Extension B
                (0x2A700 <= code <= 0x2B73F) or  # CJK Extension C
                (0x2B740 <= code <= 0x2B81F) or  # CJK Extension D
                (0xF900 <= code <= 0xFAFF)):  # CJK Compatibility Ideographs
                return True
        return False
    
    def is_pure_katakana(self, text):
        """
        Check if text is pure katakana (contains only katakana, no kanji, no hiragana).
        
        Args:
            text: Input text to check
            
        Returns:
            bool: True if text is pure katakana
        """
        if not text:
            return False
        
        # Check if contains kanji or hiragana
        if self.is_kanji(text):
            return False
        
        # Hiragana range: U+3040-U+309F
        if any('\u3040' <= char <= '\u309F' for char in text):
            return False
        
        # Check if all characters are katakana or common punctuation/whitespace
        for char in text:
            code = ord(char)
            # Allow katakana, punctuation, whitespace
            if not ((0x30A0 <= code <= 0x30FF) or  # Katakana
                    char.isspace() or  # Whitespace
                    char in '・ー'):  # Common katakana punctuation
                return False
        
        # Must contain at least one katakana character
        return any('\u30A0' <= char <= '\u30FF' for char in text)

