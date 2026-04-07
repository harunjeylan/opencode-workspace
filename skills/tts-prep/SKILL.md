---
name: tts-prep
description: Text preprocessing for natural human-like TTS output using Kokoro TTS and similar engines
version: "1.0.0"
---

# TTS Text Preprocessing Skill

Optimize text for natural, human-like speech output. Essential before using Kokoro-TTS or any TTS engine.

## Quick Start

```
@tts-prep Convert this text for TTS: [paste your text]
```

The agent will:
1. Normalize text (numbers, dates, abbreviations)
2. Add proper punctuation for pacing
3. Apply phonetic spellings for proper nouns
4. Insert SSML markup if supported

---

## Kokoro TTS SSML Support

**Kokoro Web** (browser) supports limited SSML:
- `<break time="250ms"/>` - pause (use multiples for longer breaks)
- `<emphasis level="moderate">text</emphasis>` - stress/emphasis
- `<say-as interpret-as="characters">AI</say-as>` - spell out

**Core Kokoro** (Python/CLI): No native SSML - use text normalization instead.

---

## Text Normalization Rules

### Numbers

| Input | Spoken Output |
|-------|---------------|
| `$42.50` | "forty-two dollars and fifty cents" |
| `1,234` | "one thousand two hundred thirty-four" |
| `3.14` | "three point one four" |
| `100%` | "one hundred percent" |
| `1/2` | "one half" |
| `⅔` | "two-thirds" |
| `2nd` | "second" |
| `XIV` | "fourteen" (or "the fourteenth" if a title) |

### Dates

| Input | Spoken Output |
|-------|---------------|
| `2024-01-01` | "January first, two thousand twenty-four" |
| `01/02/2023` | "January second, two thousand twenty-three" |
| `March 15` | "March fifteenth" |
| `1990s` | "nineteen nineties" |

### Time

| Input | Spoken Output |
|-------|---------------|
| `9:23 AM` | "nine twenty-three AM" |
| `14:30` | "two thirty PM" |
| `3:00` | "three o'clock" |

### Phone Numbers

| Input | Spoken Output |
|-------|---------------|
| `555-123-4567` | "five five five, one two three, four five six seven" |
| `+1-555-123-4567` | "plus one, five five five, one two three, four five six seven" |

### Currency

| Input | Spoken Output |
|-------|---------------|
| `$1,000` | "one thousand dollars" |
| `£50.99` | "fifty pounds and ninety-nine pence" |
| `€25` | "twenty-five euros" |

### URLs & Addresses

| Input | Spoken Output |
|-------|---------------|
| `example.com` | "example dot com" |
| `api.example.com/docs` | "api dot example dot com slash docs" |
| `123 Main St` | "one two three Main Street" |

### Abbreviations & Acronyms

| Input | Spoken Output |
|-------|---------------|
| `Dr.` | "Doctor" |
| `Mr.` | "Mister" |
| `St.` | "Street" (but "Saint Patrick") |
| `Ave.` | "Avenue" |
| `Inc.` | "Incorporated" |
| `etc.` | "etcetera" |
| `AI` | "A I" or "artificial intelligence" |
| `NASA` | "N A S A" or "NASA" |

### Keyboard Shortcuts

| Input | Spoken Output |
|-------|---------------|
| `Ctrl + Z` | "control Z" |
| `Cmd + C` | "command C" |
| `Alt + Tab` | "alt tab" |

---

## Punctuation Guidelines

### For Natural Pacing

| Symbol | Effect | Use Case |
|--------|--------|----------|
| `,` | Micro-pause (breath) | Within sentences, before important words |
| `.` | Hard stop | End of statements |
| `...` | Hesitation/trail | Thinking, uncertainty, dramatic effect |
| `—` or `--` | Sharp break | Interrupted speech, change of thought |
| `?` | Rising tone | Questions |
| `!` | Excitement/emphasis | Exclamations |

### Sentence Length

- **Optimal**: 15-25 words per sentence
- **Long sentences**: Break into 2 shorter sentences
- **Complex ideas**: Use commas for natural breathing points

### Example Transformations

**Before (robotic):**
```
The meeting is scheduled for March 15th at 2:30 PM in Conference Room B. Please bring your Q3 reports and confirm your attendance via email to admin@company.com.
```

**After (natural):**
```
The meeting is scheduled for March fifteenth at two thirty PM in Conference Room B. Please bring your Q3 reports and confirm your attendance via email to admin at company dot com.
```

---

## Pronunciation Control

### Phonetic Spelling

For proper nouns the TTS might mispronounce:

| Tries to Say | Force Pronunciation |
|--------------|---------------------|
| `Kveeky` | `Cheh-vee-kee` |
| `Siobhan` | `Shi-von` |
| `Choreography` | `koh-ree-og-ruh-fee` |

### Capitalization for Emphasis

- Use `CAPS` for words that need stress
- Helps TTS identify important terms

### Hyphens & Dashes

- Use hyphens for compound words: `well-known`, `real-time`
- Use em-dashes for natural speech breaks: `The weather—finally—turned nice.`

---

## SSML Markup (Kokoro Web)

### Pause Breaks

```xml
<break time="250ms"/>
<break time="500ms"/>  <!-- double pause -->
<break time="1s"/>    <!-- long pause -->
```

### Emphasis

```xml
<emphasis level="moderate">important</emphasis>
<emphasis level="strong">critical</emphasis>
```

### Say-As

```xml
<say-as interpret-as="characters">AI</say-as>
<say-as interpret-as="spell-out">API</say-as>
```

### Example Script

```xml
<speak>
Welcome to <emphasis level="moderate">Kokoro Web</emphasis>.

<break time="250ms"/>

Today we'll cover three topics:

<break time="500ms"/>

First, <emphasis level="moderate">installation</emphasis>.

<break time="250ms"/>

Second, <emphasis level="moderate">configuration</emphasis>.

<break time="250ms"/>

And finally, <emphasis level="moderate">advanced usage</emphasis>.

<say-as interpret-as="characters">SSML</say-as> support is built in.
</speak>
```

---

## Common Transformations Reference

### Numbers to Words

| Type | Rule | Example |
|------|------|---------|
| Cardinal | Full words | `42` → `forty-two` |
| Ordinal | Add suffix | `2nd` → `second` |
| Decimal | "point" | `3.14` → `three point one four` |
| Currency | Full form | `$5.99` → `five dollars and ninety-nine cents` |
| Percentage | "percent" | `75%` → `seventy-five percent` |
| Fractions | Common forms | `1/4` → `one quarter` |
| Large numbers | Group by thousands | `1,000,000` → `one million` |

### Special Characters

| Input | Output |
|-------|--------|
| `@` | "at" |
| `#` | "hash" or "number" |
| `&` | "and" |
| `%` | "percent" |
| `$` | Keep currency name |
| `°` | "degrees" |

---

## LLM Prompt for TTS-Ready Text Generation

When using an LLM to generate TTS scripts, prepend this prompt:

```
Convert the output text into a format suitable for text-to-speech. Ensure that numbers, symbols, and abbreviations are expanded for clarity when read aloud.

Rules:
- Expand all abbreviations to their full spoken forms
- Spell out all numbers as words (42 → forty-two)
- Convert dates to verbal form (2024-01-01 → January first, two thousand twenty-four)
- Replace URLs with "dot" notation (example.com → example dot com)
- Spell out acronyms unless universally known
- Keep punctuation for natural pauses
- Use short, natural sentences
- Break long sentences into multiple shorter ones

Example transformations:
"$42.50" → "forty-two dollars and fifty cents"
"Dr. Smith" → "Doctor Smith"
"api.example.com/docs" → "a pi dot example dot com slash docs"
"Ctrl + Z" → "control Z"
```

---

## Best Practices Summary

1. **Normalize everything**: Numbers, dates, URLs, abbreviations
2. **Keep sentences short**: 15-25 words max
3. **Use punctuation for pacing**: Commas, periods, ellipses
4. **Phonetic spellings**: For names and technical terms
5. **Test with TTS**: Listen and iterate
6. **SSML sparingly**: Too many tags sound robotic

---

## Quick Checklist

Before TTS generation:

- [ ] Numbers expanded to words
- [ ] Dates verbalized
- [ ] Abbreviations expanded
- [ ] URLs in "dot" notation
- [ ] Short sentences (no run-ons)
- [ ] Punctuation for pauses
- [ ] Proper nouns phonetically spelled
- [ ] SSML tags added (if supported)

---

**Version:** 1.0.0
**Last Updated:** April 2026
