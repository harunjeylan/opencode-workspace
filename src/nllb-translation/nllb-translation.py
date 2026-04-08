#!/usr/bin/env python3
"""
NLLB Translation Script

Translates text using Facebook's NLLB-200 model via Hugging Face Transformers.
Reads input from stdin as JSON, outputs result as JSON to stdout.

Usage:
    echo '{"text": "Hello", "source_lang": "eng_Latn", "target_lang": "fra_Latn"}' | python3 nllb-translation.py
"""

import sys
import json
import re

# Model and chunk settings
MODEL_ID = "facebook/nllb-200-distilled-600M"
DEFAULT_CHUNK_SIZE = 350  # words per chunk (~512 tokens)

# Supported languages mapping
LANGUAGES = {
    # African
    "amh_Ethi": "Amharic",
    "gaz_Latn": "Afaan Oromo",
    "som_Latn": "Somali",
    "swa_Latn": "Swahili",
    "hau_Latn": "Hausa",
    "wol_Latn": "Wolof",
    "yor_Latn": "Yoruba",
    "zul_Latn": "Zulu",
    "xho_Latn": "Xhosa",
    "ibo_Latn": "Igbo",
    "lin_Latn": "Lingala",
    "bem_Latn": "Bemba",
    "ewe_Latn": "Ewe",
    "twi_Latn": "Twi",
    "bam_Latn": "Bambara",
    "kin_Latn": "Kinyarwanda",
    "luo_Latn": "Luo",
    
    # European
    "eng_Latn": "English",
    "fra_Latn": "French",
    "spa_Latn": "Spanish",
    "deu_Latn": "German",
    "ita_Latn": "Italian",
    "por_Latn": "Portuguese",
    "dut_Latn": "Dutch",
    "pol_Latn": "Polish",
    "ron_Latn": "Romanian",
    "hun_Latn": "Hungarian",
    "ces_Latn": "Czech",
    "bul_Latn": "Bulgarian",
    "hrv_Latn": "Croatian",
    "slk_Latn": "Slovak",
    "slv_Latn": "Slovenian",
    "dan_Latn": "Danish",
    "nor_Latn": "Norwegian",
    "swe_Latn": "Swedish",
    "fin_Latn": "Finnish",
    "ell_Grek": "Greek",
    "lit_Latn": "Lithuanian",
    "lav_Latn": "Latvian",
    "est_Latn": "Estonian",
    
    # Asian / Middle East
    "arb_Arab": "Arabic",
    "hin_Deva": "Hindi",
    "ben_Beng": "Bengali",
    "jpn_Jpan": "Japanese",
    "kor_Hang": "Korean",
    "zho_Hans": "Chinese (Simplified)",
    "zho_Hant": "Chinese (Traditional)",
    "tur_Latn": "Turkish",
    "fas_Arab": "Persian (Farsi)",
    "urd_Arab": "Urdu",
    "tam_Taml": "Tamil",
    "tel_Telu": "Telugu",
    "mar_Deva": "Marathi",
    "guj_Gujr": "Gujarati",
    "kan_Knda": "Kannada",
    "mal_Mlym": "Malayalam",
    "tha_Thai": "Thai",
    "vie_Latn": "Vietnamese",
    "ind_Latn": "Indonesian",
    "msa_Latn": "Malay",
    "mya_Mymr": "Burmese",
    "khm_Khmr": "Khmer",
    "lao_Laoo": "Lao",
    
    # Russian / Slavic
    "rus_Cyrl": "Russian",
    "ukr_Cyrl": "Ukrainian",
    "bel_Cyrl": "Belarusian",
    "srp_Cyrl": "Serbian",
    "mkd_Cyrl": "Macedonian",
    
    # South Asian
    "pan_Guru": "Punjabi",
    "nep_Deva": "Nepali",
    "sin_Sinh": "Sinhala",
}

# Global translator cache
translator_instance = None

def get_translator():
    """Get or create the translator pipeline instance."""
    global translator_instance
    if translator_instance is None:
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
        import torch
        print("Loading NLLB model...", file=sys.stderr)
        
        # Load model and tokenizer
        tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_ID, torch_dtype=torch.bfloat16)
        
        # Store both for use in translation
        translator_instance = {"tokenizer": tokenizer, "model": model}
        print("Model loaded!", file=sys.stderr)
    return translator_instance


def translate_text(text, src_lang, tgt_lang):
    """Translate a single text segment."""
    translator = get_translator()
    tokenizer = translator["tokenizer"]
    model = translator["model"]
    
    # Tokenize with source language
    inputs = tokenizer(text, return_tensors="pt", padding=True, src_lang=src_lang)
    
    # Translate
    outputs = model.generate(
        **inputs,
        forced_bos_token_id=tokenizer.convert_tokens_to_ids(tgt_lang),
        max_new_tokens=512
    )
    
    # Decode
    translated = tokenizer.batch_decode(outputs, skip_special_tokens=True)[0]
    return translated

def split_text_into_chunks(text, max_words=DEFAULT_CHUNK_SIZE):
    """Split text into word-based chunks for optimal translation."""
    if not text or not text.strip():
        return []
    
    # Try to split by sentences first
    sentences = re.findall(r'[^.!?।]+[.!?।]+', text)
    
    # If no sentence boundaries, try paragraphs
    if len(sentences) < 2:
        paragraphs = [p for p in text.split('\n\n') if p.strip()]
        if len(paragraphs) >= 2:
            chunks = []
            current_chunk = ""
            word_count = 0
            
            for para in paragraphs:
                para_words = len(para.strip().split())
                if word_count + para_words > max_words and current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = para
                    word_count = para_words
                else:
                    current_chunk += ("\n\n" if current_chunk else "") + para
                    word_count += para_words
            
            if current_chunk:
                chunks.append(current_chunk.strip())
            return chunks if chunks else [text]
    
    # Sentence-based chunking
    chunks = []
    current_chunk = ""
    word_count = 0
    
    for sentence in sentences:
        sentence_words = len(sentence.strip().split())
        
        if word_count + sentence_words > max_words and current_chunk:
            chunks.append(current_chunk.strip())
            current_chunk = sentence
            word_count = sentence_words
        else:
            current_chunk += (" " if current_chunk else "") + sentence
            word_count += sentence_words
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks if chunks else [text]

def format_language(lang_code):
    """Format language code for display."""
    name = LANGUAGES.get(lang_code, lang_code)
    return f"{name} ({lang_code})"

def main():
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        text = input_data.get("text", "").strip()
        src_lang = input_data.get("source_lang", "")
        tgt_lang = input_data.get("target_lang", "")
        
        # Validate input
        if not text:
            raise ValueError("text is required")
        if not src_lang:
            raise ValueError("source_lang is required")
        if not tgt_lang:
            raise ValueError("target_lang is required")
        
        if src_lang not in LANGUAGES:
            raise ValueError(f"Unknown source language: {src_lang}")
        if tgt_lang not in LANGUAGES:
            raise ValueError(f"Unknown target language: {tgt_lang}")
        
        # Count words
        source_word_count = len(text.split())
        
        # Show progress
        print(f"Source: {format_language(src_lang)}", file=sys.stderr)
        print(f"Target: {format_language(tgt_lang)}", file=sys.stderr)
        print(f"Input: {source_word_count} words", file=sys.stderr)
        
        # Split into chunks
        chunks = split_text_into_chunks(text)
        print(f"Chunks: {len(chunks)}", file=sys.stderr)
        
        # Translate each chunk
        translated_chunks = []
        for i, chunk in enumerate(chunks, 1):
            print(f"Translating chunk {i}/{len(chunks)}...", file=sys.stderr)
            translated = translate_text(chunk, src_lang, tgt_lang)
            translated_chunks.append(translated)
        
        # Concatenate results
        final_translation = " ".join(translated_chunks)
        target_word_count = len(final_translation.split())
        
        # Output result as JSON
        result = {
            "success": True,
            "translation": final_translation,
            "source_lang": src_lang,
            "target_lang": tgt_lang,
            "source_words": source_word_count,
            "target_words": target_word_count,
            "chunks": len(chunks)
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        # Output error as JSON
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
