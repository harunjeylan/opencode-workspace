# TTS Production Workspace

## Purpose
Organized workspace for text-to-speech content creation, script optimization, and audio production.

## Structure

```
tts-production/
├── scripts/           # Original text scripts (before TTS optimization)
├── processed/        # TTS-optimized scripts (numbers, dates, abbreviations expanded)
├── audio/            # Generated audio files
├── voices/           # Voice configurations and presets
├── exports/          # Final audio exports for distribution
└── metadata/         # Project metadata, voice settings, timing notes
```

## Usage

1. **Write scripts** in `scripts/` folder
2. **Optimize for TTS** using tts-prep skill:
   - Expand abbreviations
   - Convert numbers to words
   - Verbalize dates/times
   - Convert URLs to "dot" notation
   - Break long sentences
   - Add punctuation for pacing
3. **Save optimized scripts** to `processed/`
4. **Generate audio** using kokoro-tts tool
5. **Export final audio** to `exports/`

## Workflow

1. Place original text in `scripts/`
2. Run `@tts-prep` to optimize
3. Save optimized version to `processed/`
4. Use `kokoro-tts` to generate audio
5. Review and export to `exports/`
