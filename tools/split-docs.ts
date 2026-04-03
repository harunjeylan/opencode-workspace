/**
 * @split-docs tool - Simple document splitting for text/markdown files
 *
 * This is a lightweight tool. For AI-driven document organization, use @document-organizer agent instead.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { tool } from "@opencode-ai/plugin";

interface Section {
  title: string;
  level: number;
  startLine: number;
  endLine?: number;
}

function detectSections(content: string): Section[] {
  const lines = content.split("\n");
  const sections: Section[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const level = detectLevel(line);
    if (level !== null) {
      if (sections.length > 0) sections[sections.length - 1].endLine = i - 1;
      sections.push({ title: extractTitle(line), level, startLine: i });
    }
  }

  if (sections.length > 0)
    sections[sections.length - 1].endLine = lines.length - 1;
  return sections;
}

function detectLevel(line: string): number | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const markdownMatch = trimmed.match(/^(#{1,6})\s+/);
  if (markdownMatch) return Math.min(markdownMatch[1].length, 4);

  if (/^\d+(\.\d+)?(\.\d+)?\s+/.test(trimmed))
    return Math.min((trimmed.match(/\./g) || []).length + 1, 4);
  if (/^(chapter|ch\.?)\s+\d+/i.test(trimmed)) return 1;
  if (/^(section|sec\.?)\s+\d+\.\d+/i.test(trimmed)) return 2;
  if (/^[A-Z]{4,}\s+[A-Z]/.test(trimmed) && trimmed.length < 80) return 1;

  const commonHeaders = [
    "Introduction",
    "Background",
    "Methodology",
    "Results",
    "Discussion",
    "Conclusion",
    "References",
    "Appendix",
  ];
  if (commonHeaders.some((h) => trimmed.startsWith(h))) return 1;

  return null;
}

function extractTitle(line: string): string {
  let title = line.trim().replace(/^#{1,6}\s+/, "");
  title = title.replace(/^\d+(\.\d+)?\s+/, "");
  title = title.replace(/^(chapter|section|sec|ch\.?)\s+[\d.]+\s*:?\s*/i, "");
  return title.trim();
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function getHierarchy(sections: Section[], index: number): string[] {
  const path: string[] = [];
  const targetLevel = sections[index]?.level ?? 4;
  for (let i = 0; i <= index; i++) {
    if (sections[i].level < targetLevel) path.push(sections[i].title);
    else if (sections[i].level === targetLevel && i === index)
      path.push(sections[i].title);
  }
  return path.length > 0 ? path : [sections[index]?.title || "Content"];
}

interface Chunk {
  title: string;
  content: string;
  tokens: number;
  hierarchy: string[];
  level: number;
  markdown: string;
  fileName: string;
}

function createChunks(
  content: string,
  sections: Section[],
  maxTokens: number,
  fileName: string,
): Chunk[] {
  const lines = content.split("\n");
  const chunks: Chunk[] = [];
  let currentContent = "";
  let currentTokens = 0;
  let currentTitle = "";
  let currentLevel = 1;
  let currentHierarchy: string[] = [];
  let currentStartLine = 0;
  let chunkIndex = 0;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sectionContent = lines
      .slice(section.startLine, (section.endLine ?? section.startLine) + 1)
      .join("\n");
    const sectionTokens = estimateTokens(sectionContent);

    if (section.level === 1 && currentContent) {
      const chunk = finalizeChunk(
        currentContent,
        currentTokens,
        currentTitle,
        currentHierarchy,
        currentLevel,
        chunkIndex++,
        fileName,
        currentStartLine,
        section.startLine,
      );
      chunks.push(chunk);
      currentContent = "";
      currentTokens = 0;
    }

    if (!currentTitle) {
      currentTitle = section.title;
      currentLevel = section.level;
      currentStartLine = section.startLine;
      currentHierarchy = getHierarchy(sections, i);
    }

    currentContent += (currentContent ? "\n\n" : "") + sectionContent;
    currentTokens += sectionTokens;

    if (currentTokens > maxTokens * 1.2) {
      const chunk = finalizeChunk(
        currentContent,
        currentTokens,
        currentTitle,
        currentHierarchy,
        currentLevel,
        chunkIndex++,
        fileName,
        currentStartLine,
        section.endLine ?? section.startLine,
      );
      chunks.push(chunk);
      currentContent = "";
      currentTokens = 0;
      currentTitle = "";
    }
  }

  if (currentContent) {
    const lastSection = sections[sections.length - 1];
    const chunk = finalizeChunk(
      currentContent,
      currentTokens,
      currentTitle,
      currentHierarchy,
      currentLevel,
      chunkIndex++,
      fileName,
      currentStartLine,
      lastSection?.endLine ?? 0,
    );
    chunks.push(chunk);
  }

  return chunks;
}

function finalizeChunk(
  content: string,
  tokens: number,
  title: string,
  hierarchy: string[],
  level: number,
  index: number,
  fileName: string,
  startLine: number,
  endLine: number,
): Chunk {
  const sanitized = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const chunkId = `ch-${String(index).padStart(3, "0")}`;
  const keywords = extractKeywords(content);

  const markdown = `---
source: "${fileName}"
format: "organized"
chunk_id: "${chunkId}"
hierarchy:
${hierarchy.map((h) => `  - "${h}"`).join("\n")}
level: ${level}
tokens: ${tokens}
topic: "${title.slice(0, 50)}"
keywords:
${keywords.map((k) => `  - "${k}"`).join("\n")}
content_type: "text"
context_summary:
  previous: "Previous section"
  next: "Next section"
location: "lines ${startLine}-${endLine}"
---

# ${title}

${content}
`;

  return {
    title,
    content,
    tokens,
    hierarchy,
    level,
    markdown,
    fileName: `${String(index).padStart(3, "0")}-${sanitized}.md`,
  };
}

function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  const words = [
    "introduction",
    "background",
    "methodology",
    "results",
    "analysis",
    "conclusion",
    "discussion",
    "overview",
    "framework",
    "approach",
    "system",
    "process",
  ];
  const lowerText = text.toLowerCase();
  for (const word of words) {
    if (lowerText.includes(word)) keywords.push(word);
  }
  return keywords.slice(0, 5);
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function generateIndex(chunks: Chunk[], fileName: string): string {
  const lines = [
    `# Document: ${fileName}`,
    "",
    `**Total Chapters:** ${chunks.length}`,
    `**Total Tokens:** ~${chunks.reduce((s, c) => s + c.tokens, 0)}`,
    "",
    "## Chapter Map",
    "",
  ];

  for (const chunk of chunks) {
    const hierarchy = chunk.hierarchy.join(" > ");
    const indent = "  ".repeat(Math.max(0, chunk.level - 1));
    lines.push(
      `${indent}- [${chunk.fileName}](./notes/${chunk.fileName}) - ${hierarchy} (${chunk.tokens} tokens)`,
    );
  }

  return lines.join("\n");
}

export default tool({
  description:
    "Split text and markdown files into chapters with metadata (lightweight tool)",

  args: {
    input: tool.schema
      .string()
      .describe("Path to text or markdown file (.txt, .md)"),
    maxTokens: tool.schema
      .number()
      .optional()
      .describe("Maximum tokens per chunk (default: 1000, max: 1200)"),
    output: tool.schema
      .string()
      .optional()
      .describe("Output directory (default: ./organized)"),
  },

  execute: async (args, context): Promise<string> => {
    try {
      if (!args.input) {
        return "❌ Error: input is required.\n\nUsage: @split-docs input=document.md";
      }

      const inputPath = args.input.startsWith("/")
        ? args.input
        : `${context.directory}/${args.input}`;

      if (!fs.existsSync(inputPath)) {
        return `❌ Error: File not found: ${inputPath}`;
      }

      const ext = path.extname(inputPath).toLowerCase();
      if (![".txt", ".md"].includes(ext)) {
        return `❌ Error: Only .txt and .md files are supported.\n\n**Supported Formats:** TXT, MD`;
      }

      const content = fs.readFileSync(inputPath, "utf-8");
      const fileName = path.basename(inputPath);
      const format = ext === ".md" ? "markdown" : "text";
      const maxTokens = Math.min(args.maxTokens || 1000, 1200);
      const outputDir = args.output || "./organized";

      const sections = detectSections(content);
      const chunks = createChunks(content, sections, maxTokens, fileName);

      const outputFolder = path.join(outputDir, sanitizeFileName(fileName));
      const notesFolder = path.join(outputFolder, "notes");

      if (!fs.existsSync(outputFolder))
        fs.mkdirSync(outputFolder, { recursive: true });
      if (!fs.existsSync(notesFolder))
        fs.mkdirSync(notesFolder, { recursive: true });

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const filePath = path.join(notesFolder, chunk.fileName);
        fs.writeFileSync(filePath, chunk.markdown, "utf-8");
      }

      const indexContent = generateIndex(chunks, fileName);
      fs.writeFileSync(
        path.join(outputFolder, "index.md"),
        indexContent,
        "utf-8",
      );

      const metadataContent = JSON.stringify(
        {
          source: fileName,
          format,
          createdAt: new Date().toISOString(),
          totalChunks: chunks.length,
          totalTokens: chunks.reduce((s, c) => s + c.tokens, 0),
        },
        null,
        2,
      );
      fs.writeFileSync(
        path.join(outputFolder, "metadata.json"),
        metadataContent,
        "utf-8",
      );

      return `✅ Document split successfully!

📄 **File:** ${fileName}
📦 **Format:** ${format}
🧩 **Notes Created:** ${chunks.length}
📝 **Total Tokens:** ~${chunks.reduce((s, c) => s + c.tokens, 0)}
📁 **Output:** ${outputFolder}

**Next Steps:**
• For AI-driven organization: @document-organizer Process ${outputFolder}
• View structure: cat ${outputFolder}/index.md`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `❌ Error: ${message}`;
    }
  },
});
