/**
 * OpenCode NLLB Translation Tool
 *
 * Translation tool using NLLB-200-distilled-600M model via Python.
 * Translates text between 100+ supported languages.
 *
 * Text is split into chunks (~350 words each / ~512 tokens) for optimal
 * translation quality and memory usage.
 *
 * Supports both text input/output and file input/output.
 *
 * Requirements:
 *   - Python 3.8+
 *   - Virtual environment (.venv)
 *   - Dependencies: see src/nllb-translation/requirements.txt
 */

import fs from "node:fs";
import path from "node:path";
import { tool } from "@opencode-ai/plugin";
import { spawn } from "bun";

// Supported languages for validation
const LANGUAGES: Record<string, string> = {
  // African
  amh_Ethi: "Amharic",
  gaz_Latn: "Afaan Oromo",
  som_Latn: "Somali",
  swa_Latn: "Swahili",
  hau_Latn: "Hausa",
  wol_Latn: "Wolof",
  yor_Latn: "Yoruba",
  zul_Latn: "Zulu",
  xho_Latn: "Xhosa",
  ibo_Latn: "Igbo",
  lin_Latn: "Lingala",
  bem_Latn: "Bemba",
  ewe_Latn: "Ewe",
  twi_Latn: "Twi",
  bam_Latn: "Bambara",
  kin_Latn: "Kinyarwanda",
  luo_Latn: "Luo",

  // European
  eng_Latn: "English",
  fra_Latn: "French",
  spa_Latn: "Spanish",
  deu_Latn: "German",
  ita_Latn: "Italian",
  por_Latn: "Portuguese",
  dut_Latn: "Dutch",
  pol_Latn: "Polish",
  ron_Latn: "Romanian",
  hun_Latn: "Hungarian",
  ces_Latn: "Czech",
  bul_Latn: "Bulgarian",
  hrv_Latn: "Croatian",
  slk_Latn: "Slovak",
  slv_Latn: "Slovenian",
  dan_Latn: "Danish",
  nor_Latn: "Norwegian",
  swe_Latn: "Swedish",
  fin_Latn: "Finnish",
  ell_Grek: "Greek",
  lit_Latn: "Lithuanian",
  lav_Latn: "Latvian",
  est_Latn: "Estonian",

  // Asian / Middle East
  arb_Arab: "Arabic",
  hin_Deva: "Hindi",
  ben_Beng: "Bengali",
  jpn_Jpan: "Japanese",
  kor_Hang: "Korean",
  zho_Hans: "Chinese (Simplified)",
  zho_Hant: "Chinese (Traditional)",
  tur_Latn: "Turkish",
  fas_Arab: "Persian (Farsi)",
  urd_Arab: "Urdu",
  tam_Taml: "Tamil",
  tel_Telu: "Telugu",
  mar_Deva: "Marathi",
  guj_Gujr: "Gujarati",
  kan_Knda: "Kannada",
  mal_Mlym: "Malayalam",
  tha_Thai: "Thai",
  vie_Latn: "Vietnamese",
  ind_Latn: "Indonesian",
  msa_Latn: "Malay",
  mya_Mymr: "Burmese",
  khm_Khmr: "Khmer",
  lao_Laoo: "Lao",

  // Russian / Slavic
  rus_Cyrl: "Russian",
  ukr_Cyrl: "Ukrainian",
  bel_Cyrl: "Belarusian",
  srp_Cyrl: "Serbian",
  mkd_Cyrl: "Macedonian",

  // South Asian
  pan_Guru: "Punjabi",
  nep_Deva: "Nepali",
  sin_Sinh: "Sinhala",
};

/**
 * Format language code for display
 */
function formatLanguage(langCode: string): string {
  const name = LANGUAGES[langCode];
  return name ? `${name} (${langCode})` : langCode;
}

/**
 * Clean markdown content for translation
 */
function cleanMarkdown(content: string): string {
  return content
    .replace(/^#+\s+.+$/gm, "")           // Remove headers
    .replace(/```[\s\S]*?```/g, "")        // Remove code blocks
    .replace(/`[^`]+`/g, "")              // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")  // Convert links to text
    .replace(/^\s*[-*]\s+/gm, "")        // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, "")       // Remove numbered lists
    .replace(/^\s*>\s+/gm, "")           // Remove blockquotes
    .trim();
}

/**
 * Read input text from file or argument
 */
function readInputText(
  inputType: string,
  inputFile: string | undefined,
  textArg: string | undefined,
  workspaceRoot: string
): { success: true; text: string } | { success: false; error: string } {
  if (inputType === "file") {
    if (!inputFile) {
      return {
        success: false,
        error: "❌ Error: --inputFile is required when --inputType=file\n\n" +
               "Usage: @nllb-translation inputType=file inputFile=/path/to/input.txt source_lang=eng_Latn target_lang=amh_Ethi",
      };
    }

    const filePath = path.isAbsolute(inputFile)
      ? inputFile
      : path.resolve(workspaceRoot, inputFile);

    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: `❌ Error: Input file not found: ${filePath}`,
      };
    }

    const ext = path.extname(filePath).toLowerCase();
    if (ext !== ".txt" && ext !== ".md") {
      return {
        success: false,
        error: `❌ Error: Unsupported file extension: ${ext}\n\nSupported extensions: .txt, .md`,
      };
    }

    let content = fs.readFileSync(filePath, "utf-8");

    // Clean markdown if needed
    if (ext === ".md") {
      content = cleanMarkdown(content);
    }

    if (!content || content.trim().length === 0) {
      return {
        success: false,
        error: `❌ Error: Input file is empty: ${filePath}`,
      };
    }

    return { success: true, text: content.trim() };
  } else {
    // inputType === "text"
    if (!textArg || textArg.trim().length === 0) {
      return {
        success: false,
        error: "❌ Error: --text is required when --inputType=text\n\n" +
               "Usage: @nllb-translation text='Hello world' source_lang=eng_Latn target_lang=amh_Ethi",
      };
    }
    return { success: true, text: textArg.trim() };
  }
}

/**
 * Write output text to file
 */
function writeOutputText(
  outputType: string,
  outputFile: string | undefined,
  translation: string,
  workspaceRoot: string
): { success: true; filePath: string } | { success: false; error: string } {
  if (outputType === "file") {
    if (!outputFile) {
      return {
        success: false,
        error: "❌ Error: --outputFile is required when --outputType=file\n\n" +
               "Usage: @nllb-translation text='Hello' outputType=file outputFile=/path/to/output.txt source_lang=eng_Latn target_lang=amh_Ethi",
      };
    }

    const filePath = path.isAbsolute(outputFile)
      ? outputFile
      : path.resolve(workspaceRoot, outputFile);

    const ext = path.extname(filePath).toLowerCase();
    if (ext !== ".txt" && ext !== ".md") {
      return {
        success: false,
        error: `❌ Error: Unsupported file extension: ${ext}\n\nSupported extensions: .txt, .md`,
      };
    }

    // Create parent directories if needed
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });

    // Write translation to file
    fs.writeFileSync(filePath, translation, "utf-8");

    return { success: true, filePath };
  } else {
    // outputType === "text" - no file output needed
    return { success: true, filePath: "" };
  }
}

export default tool({
  description:
    "Translation tool using NLLB-200 model. Translates text between 100+ languages. Supports African, European, Asian, Middle Eastern, and South Asian languages. Can read from text or files (.txt, .md) and output to text or files.",

  args: {
    text: tool.schema.string().optional().describe("Text to translate (required when inputType=text)"),
    inputType: tool.schema.enum(["text", "file"]).optional().default("text")
      .describe("Input type: 'text' for direct text, 'file' for file path (default: text)"),
    outputType: tool.schema.enum(["text", "file"]).optional().default("text")
      .describe("Output type: 'text' for inline output, 'file' for file path (default: text)"),
    inputFile: tool.schema.string().optional()
      .describe("Path to input file (required when inputType=file). Supports .txt and .md files"),
    outputFile: tool.schema.string().optional()
      .describe("Path to output file (required when outputType=file). Will use .txt extension if not specified"),
    source_lang: tool.schema.string()
      .describe("Source language code (e.g., amh_Ethi for Amharic, eng_Latn for English)"),
    target_lang: tool.schema.string()
      .describe("Target language code (e.g., eng_Latn for English, fra_Latn for French)"),
  },

  execute: async (args, context): Promise<string> => {
    try {
      const workspaceRoot = context.worktree || context.directory || process.cwd();
      const inputType = args.inputType || "text";
      const outputType = args.outputType || "text";
      const inputFile = args.inputFile;
      const outputFile = args.outputFile;
      const textArg = args.text;

      // Validate source language
      if (!args.source_lang) {
        return [
          "❌ Error: --source_lang is required",
          "",
          "Example: source_lang=eng_Latn",
        ].join("\n");
      }

      // Validate target language
      if (!args.target_lang) {
        return [
          "❌ Error: --target_lang is required",
          "",
          "Example: target_lang=fra_Latn",
        ].join("\n");
      }

      const srcLang = args.source_lang;
      const tgtLang = args.target_lang;

      // Validate languages
      if (!LANGUAGES[srcLang]) {
        const suggestions = Object.keys(LANGUAGES)
          .filter((k) => k.toLowerCase().includes(srcLang.toLowerCase()))
          .slice(0, 5);

        return [
          `❌ Unknown source language: ${srcLang}`,
          "",
          "Supported languages:",
          ...Object.entries(LANGUAGES).map(
            ([code, name]) => `  ${code.padEnd(12)} - ${name}`,
          ),
          ...(suggestions.length > 0
            ? [`\nDid you mean: ${suggestions.join(", ")}`]
            : []),
        ].join("\n");
      }

      if (!LANGUAGES[tgtLang]) {
        const suggestions = Object.keys(LANGUAGES)
          .filter((k) => k.toLowerCase().includes(tgtLang.toLowerCase()))
          .slice(0, 5);

        return [
          `❌ Unknown target language: ${tgtLang}`,
          "",
          "Supported languages:",
          ...Object.entries(LANGUAGES).map(
            ([code, name]) => `  ${code.padEnd(12)} - ${name}`,
          ),
          ...(suggestions.length > 0
            ? [`\nDid you mean: ${suggestions.join(", ")}`]
            : []),
        ].join("\n");
      }

      // Read input text
      const inputResult = readInputText(inputType, inputFile, textArg, workspaceRoot);
      if (!inputResult.success) {
        return inputResult.error;
      }
      const inputText = inputResult.text;

      // Resolve paths - tool is at .opencode/tools/nllb-translation.ts
      // Python script is at .opencode/src/nllb-translation/
      const toolsDir = import.meta.dir;  // .opencode/tools
      const opencodePath = path.dirname(toolsDir);  // .opencode
      const toolDir = path.join(opencodePath, "src", "nllb-translation");
      const venvPath = path.join(toolDir, ".venv");
      const pythonBin = path.join(venvPath, "bin", "python");
      const scriptPath = path.join(toolDir, "nllb-translation.py");

      // Check if venv exists
      if (!fs.existsSync(pythonBin)) {
        return [
          `⚠️  Python virtual environment not found`,
          "",
          `Expected at: ${venvPath}`,
          "",
          `Please run:`,
          `  python3 -m venv ${venvPath}`,
          `  source ${venvPath}/bin/activate`,
          `  pip install transformers torch sentencepiece protobuf sacremoses`,
        ].join("\n");
      }

      // Prepare input JSON
      const inputJson = JSON.stringify({
        text: inputText,
        source_lang: srcLang,
        target_lang: tgtLang,
      });

      // Run Python script directly with stdin
      let stdout = "";
      let stderr = "";
      let exitCode = 0;

      try {
        const proc = spawn([pythonBin, scriptPath], {
          stdin: "pipe",
          stdout: "pipe",
          stderr: "pipe",
          cwd: toolDir,
        });

        // Send input via stdin
        proc.stdin.write(inputJson);
        proc.stdin.end();

        exitCode = await proc.exited;
        stdout = (await new Response(proc.stdout).text()).trim();
        stderr = (await new Response(proc.stderr).text()).trim();
      } catch (err) {
        return `❌ Error running translation: ${err instanceof Error ? err.message : String(err)}`;
      }

      if (exitCode !== 0) {
        // Try to parse error from Python
        try {
          const errorData = JSON.parse(stdout || stderr);
          return `❌ Translation error: ${errorData.error || stderr}`;
        } catch {
          return [
            "❌ Translation failed",
            "",
            "Error:",
            stderr || stdout || "Unknown error",
            "",
            "Make sure Python dependencies are installed:",
            `  cd ${toolDir}`,
            "  source .venv/bin/activate",
            "  pip install transformers torch sentencepiece protobuf sacremoses",
          ].join("\n");
        }
      }

      // Parse successful result
      const data = JSON.parse(stdout);

      if (!data.success) {
        return `❌ Translation error: ${data.error}`;
      }

      const translation = data.translation;

      // Write output to file if needed
      const outputResult = writeOutputText(outputType, outputFile, translation, workspaceRoot);
      if (!outputResult.success) {
        return outputResult.error;
      }

      // Build success message
      if (outputType === "file") {
        return [
          `✅ Translation complete!`,
          ``,
          `📁 Input:   ${inputType === "file" ? inputFile : "(inline text)"}`,
          `📁 Output:  ${outputResult.filePath}`,
          `📋 Source:  ${formatLanguage(data.source_lang)}`,
          `📋 Target:  ${formatLanguage(data.target_lang)}`,
          `📊 Words:   ${data.source_words.toLocaleString()} → ${data.target_words.toLocaleString()}`,
          `📦 Chunks:  ${data.chunks}`,
        ].join("\n");
      } else {
        return [
          `✅ Translation complete!`,
          ``,
          `📋 Source: ${formatLanguage(data.source_lang)}`,
          `📋 Target: ${formatLanguage(data.target_lang)}`,
          `📊 Words: ${data.source_words.toLocaleString()} → ${data.target_words.toLocaleString()}`,
          `📦 Chunks: ${data.chunks}`,
          ``,
          `---`,
          ``,
          translation,
        ].join("\n");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `❌ Error: ${message}`;
    }
  },
});
