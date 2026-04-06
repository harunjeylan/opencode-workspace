/**
 * OpenCode Kokoro TTS Tool
 *
 * Text-to-speech tool using Kokoro-82M TTS model.
 * Generates speech audio from text or text files (.md, .txt).
 *
 * Storage:
 *   .opencode/speech/[topic]/           - Output directory
 *     ├── full-speech.mp3               - Merged audio
 *     └── chunks/                       - Individual chunks
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { KokoroTTS } from "kokoro-js";
import { tool } from "@opencode-ai/plugin";
import { spawn } from "bun";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const MAX_CHARS = 400;

const AVAILABLE_VOICES = [
  { id: "am_adam", desc: "Male, default" },
  { id: "af_heart", desc: "Female ❤️ (highest quality)" },
  { id: "af_bella", desc: "Female 🔥 (highest quality)" },
  { id: "am_fenrir", desc: "Male, good quality" },
  { id: "am_michael", desc: "Male, good quality" },
  { id: "am_puck", desc: "Male, good quality" },
  { id: "af_alloy", desc: "Female, medium" },
  { id: "af_aoede", desc: "Female, medium" },
  { id: "af_kore", desc: "Female, medium" },
  { id: "af_nicole", desc: "Female, medium" },
  { id: "af_nova", desc: "Female, medium" },
  { id: "af_sarah", desc: "Female, medium" },
  { id: "af_sky", desc: "Female, medium" },
];

let ttsInstance: KokoroTTS | null = null;

async function getTTS(): Promise<KokoroTTS> {
  if (!ttsInstance) {
    ttsInstance = await KokoroTTS.from_pretrained(MODEL_ID, {
      dtype: "q8",
      device: "cpu",
    });
  }
  return ttsInstance;
}

function splitTextIntoChunks(text: string, maxChars: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChars && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

async function getDuration(filePath: string): Promise<string> {
  try {
    const proc = spawn(
      [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      {
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const output = await new Response(proc.stdout).text();
    const durationSec = parseFloat(output.trim());
    if (!isNaN(durationSec)) {
      const mins = Math.floor(durationSec / 60);
      const secs = Math.floor(durationSec % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
  } catch {}
  return "unknown";
}

export default tool({
  description:
    "Text-to-speech tool using Kokoro-82M TTS model. Converts text or text files to audio. Supports mp3 and wav formats with multiple voice options.",

  args: {
    text: tool.schema
      .string()
      .optional()
      .describe("Text to convert to speech (alternative to --file)"),
    file: tool.schema
      .string()
      .optional()
      .describe("Path to .txt or .md file with text content"),
    topic: tool.schema
      .string()
      .optional()
      .describe(
        "Topic/folder name for output (auto-generated if not provided)",
      ),
    voice: tool.schema
      .string()
      .optional()
      .describe(
        "Voice ID (default: am_adam). Use --voice=am_adam or ask to see all options.",
      ),
    format: tool.schema
      .enum(["mp3", "wav"])
      .optional()
      .describe("Audio format (default: mp3)"),
  },

  execute: async (args, context): Promise<string> => {
    try {
      const workspaceRoot = context.worktree || context.directory;

      if (!args.text && !args.file) {
        return (
          "❌ Error: Either --text or --file is required\n\n" +
          "Usage:\n" +
          "  @kokoro-tts text='Hello world' topic=my-topic\n" +
          "  @kokoro-tts file=script.md topic=my-topic\n" +
          "  @kokoro-tts text='Hello' voice=af_bella format=wav"
        );
      }

      let inputText = args.text;
      let fileName = args.file;

      if (args.file) {
        const filePath = path.isAbsolute(args.file)
          ? args.file
          : path.resolve(workspaceRoot, args.file);

        if (!fs.existsSync(filePath)) {
          return `❌ Error: File not found: ${filePath}`;
        }

        const content = fs.readFileSync(filePath, "utf-8");
        const ext = path.extname(args.file).toLowerCase();

        if (ext === ".md") {
          const titleMatch = content.match(/^#\s+(.+)$/m);
          if (titleMatch) {
            fileName = titleMatch[1].trim();
          }
          const cleanContent = content
            .replace(/^#\s+.+$/gm, "")
            .replace(/```[\s\S]*?```/g, "")
            .replace(/`[^`]+`/g, "")
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            .replace(/^\s*[-*]\s+/gm, "")
            .replace(/^\s*\d+\.\s+/gm, "")
            .trim();
          inputText = cleanContent;
        } else {
          inputText = content.trim();
        }
      }

      if (!inputText || inputText.length === 0) {
        return "❌ Error: No text content found";
      }

      const wordCount = inputText.split(/\s+/).filter(Boolean).length;

      let topic = args.topic;
      if (!topic) {
        if (fileName) {
          topic = fileName
            .replace(/\.[^.]+$/, "")
            .toLowerCase()
            .replace(/\s+/g, "-");
        } else {
          const firstWords = inputText.split(/\s+/).slice(0, 5).join(" ");
          const suggested = firstWords
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, "")
            .replace(/\s+/g, "-")
            .slice(0, 30);
          return (
            `❌ Topic not provided. Please provide a --topic name for the output folder.\n\n` +
            `Suggested: ${suggested}\n\n` +
            `Usage: @kokoro-tts text='...' topic=${suggested}`
          );
        }
      }

      topic = topic
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, "-")
        .replace(/-+/g, "-");

      let voice = args.voice;
      const format = args.format || "mp3";

      if (!voice) {
        const allVoices = AVAILABLE_VOICES.map(
          (v) => `  ${v.id.padEnd(12)} - ${v.desc}`,
        ).join("\n");

        return (
          `🎤 Voice not specified. Default: am_adam\n\n` +
          `Available voices:\n${allVoices}\n\n` +
          `To use default (am_adam):\n` +
          `  @kokoro-tts text='Hello world' topic=my-topic\n\n` +
          `To use a different voice:\n` +
          `  @kokoro-tts text='Hello world' topic=my-topic voice=af_bella\n\n` +
          `To use wav format:\n` +
          `  @kokoro-tts text='Hello world' topic=my-topic format=wav`
        );
      }

      const validVoices = AVAILABLE_VOICES.map((v) => v.id);

      if (!validVoices.includes(voice)) {
        return (
          `❌ Invalid voice: ${voice}\n\n` +
          `Valid voices:\n` +
          `${validVoices.join(", ")}`
        );
      }

      const speechDir = path.join(workspaceRoot, ".opencode", "speech", topic);
      const chunksDir = path.join(speechDir, "chunks");

      fs.mkdirSync(chunksDir, { recursive: true });

      const textChunks = splitTextIntoChunks(inputText, MAX_CHARS);

      const tts = await getTTS();

      const audioFiles: string[] = [];
      for (let i = 0; i < textChunks.length; i++) {
        const chunkAudio = await tts.generate(textChunks[i], {
          voice: voice as "af_heart" | "af_alloy" | "af_aoede" | "af_bella",
        });
        const ext = format === "wav" ? "wav" : "mp3";
        const filePath = path.join(
          chunksDir,
          `chunk-${i.toString().padStart(2, "0")}.${ext}`,
        );
        chunkAudio.save(filePath);
        audioFiles.push(filePath);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      const outputFile = path.join(
        speechDir,
        `full-speech.${format === "wav" ? "wav" : "mp3"}`,
      );

      if (audioFiles.length > 1) {
        const concatListPath = path.join(chunksDir, "concat-list.txt");
        const concatList = audioFiles.map((f) => `file '${f}'`).join("\n");
        fs.writeFileSync(concatListPath, concatList);

        if (format === "wav") {
          execSync(
            `ffmpeg -f concat -safe 0 -i "${concatListPath}" -vn -acodec pcm_s16le "${outputFile}" -y`,
            { stdio: "ignore" },
          );
        } else {
          execSync(
            `ffmpeg -f concat -safe 0 -i "${concatListPath}" -vn -acodec libmp3lame -ab 192k "${outputFile}" -y`,
            { stdio: "ignore" },
          );
        }

        fs.unlinkSync(concatListPath);
      } else {
        fs.renameSync(audioFiles[0], outputFile);
      }

      for (const file of audioFiles) {
        try {
          fs.unlinkSync(file);
        } catch {}
      }

      if (!fs.existsSync(outputFile)) {
        return `❌ Error: Output file not generated`;
      }

      const stats = fs.statSync(outputFile);
      const fileSizeKB = (stats.size / 1024).toFixed(1);
      const duration = await getDuration(outputFile);

      return [
        `✅ Speech generated successfully!`,
        ``,
        `📁 Output:   ${outputFile}`,
        `🎤 Voice:    ${voice}`,
        `🎵 Format:   ${format.toUpperCase()}`,
        `📊 Duration: ${duration}`,
        `📝 Words:    ${wordCount}`,
        `📦 Chunks:   ${textChunks.length}`,
        `💾 Size:     ${fileSizeKB} KB`,
        ``,
        `Topic: ${topic}`,
      ].join("\n");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `❌ Error: ${message}`;
    }
  },
});
