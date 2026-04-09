/**
 * @markitdown - Universal Document Converter
 *
 * Converts various file formats to Markdown.
 * Uses specialized converters for optimal results:
 *   - DOCX: @aidalinfo/office-to-markdown (advanced: math, tables, styles)
 *   - Others: markitdown-ts (PDF, XLSX, HTML, URLs, etc.)
 *
 * Supported formats:
 *   PDF, DOCX, XLSX, HTML, Images, Audio, Text files,
 *   CSV, XML, RSS, Atom, Jupyter Notebooks (.ipynb),
 *   ZIP files, URLs, YouTube (transcripts)
 *
 * Note: PowerPoint (.pptx) is not yet supported.
 *
 * Usage:
 *   @markitdown input=document.pdf output=document.md
 *   @markitdown input=file.docx
 *   @markitdown input=https://example.com
 */

import fs from "node:fs";
import path from "node:path";

import { MarkItDown } from "markitdown-ts";
import { OfficeToMarkdown } from "@aidalinfo/office-to-markdown";
import { tool } from "@opencode-ai/plugin";

/** Result type for conversion operations */
type ConversionResult =
  | { success: true; markdown: string }
  | { success: false; error: string };

/** Check if file is a DOCX based on extension */
function isDocx(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".docx";
}

export default tool({
  description:
    "Universal document converter - converts PDF, DOCX, XLSX, HTML, images, text, URLs to Markdown. Note: PPTX not yet supported.",

  args: {
    input: tool.schema
      .string()
      .describe(
        "Input file path or URL (relative to working directory or absolute)",
      ),
    output: tool.schema
      .string()
      .optional()
      .describe(
        "Output markdown file path (defaults to input filename with .md extension)",
      ),
  },

  execute: async (args, context): Promise<string> => {
    // Validate input
    if (!args.input) {
      return [
        "❌ Error: --input is required",
        "",
        "Usage: @markitdown input=document.pdf output=document.md",
        "",
        "Supported formats:",
        "  - PDF, DOCX, XLSX, HTML",
        "  - Images, Audio",
        "  - Text files, CSV, XML",
        "  - Jupyter Notebooks (.ipynb)",
        "  - URLs, YouTube (transcripts)",
        "  - ZIP files",
        "",
        "Note: PPTX (.pptx) is not yet supported.",
      ].join("\n");
    }

    // Handle input path
    let inputPath = args.input;
    const isUrl =
      inputPath.startsWith("http://") || inputPath.startsWith("https://");

    if (!isUrl && !path.isAbsolute(inputPath)) {
      inputPath = path.join(context.directory, inputPath);
    }

    // Validate file exists
    if (!isUrl && !fs.existsSync(inputPath)) {
      return [
        "❌ Error: File not found",
        "",
        `Path: ${inputPath}`,
      ].join("\n");
    }

    // Generate output path
    let outputPath = args.output;
    if (!outputPath) {
      if (isUrl) {
        const urlObj = new URL(inputPath);
        const hostname = urlObj.hostname.replace(/\./g, "_");
        outputPath = path.join(context.directory, `${hostname}_content.md`);
      } else {
        outputPath = inputPath.replace(/\.[^.]+$/, ".md");
      }
    } else if (!path.isAbsolute(outputPath)) {
      outputPath = path.join(context.directory, outputPath);
    }

    // Convert based on file type
    let result: ConversionResult;

    if (isDocx(inputPath)) {
      // Use specialized DOCX converter for better results
      result = await convertDocx(inputPath);
    } else {
      // Use markitdown-ts for all other formats
      result = await convertWithMarkitdownTs(inputPath);
    }

    // Handle conversion result
    if (!result.success) {
      return [
        "❌ Conversion failed",
        "",
        `Error: ${result.error}`,
        "",
        `Input: ${isUrl ? inputPath : path.relative(context.directory, inputPath)}`,
        "",
        "Make sure the file format is supported.",
        "Note: PPTX (.pptx) is not yet supported.",
      ].join("\n");
    }

    // Write markdown to output file
    fs.writeFileSync(outputPath, result.markdown, "utf-8");

    // Get file stats
    const stats = fs.statSync(outputPath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    const lines = result.markdown.split("\n").length;

    return [
      "✅ Conversion completed!",
      "",
      `📄 Input:  ${isUrl ? inputPath : path.relative(context.directory, inputPath)}`,
      `📁 Output: ${path.relative(context.directory, outputPath)}`,
      `📊 Size:   ${sizeKB} KB`,
      `📝 Lines:  ${lines}`,
      "",
      "Open the markdown file to review.",
    ].join("\n");
  },
});

/**
 * Convert DOCX using specialized converter (better math, tables, styles)
 */
async function convertDocx(filePath: string): Promise<ConversionResult> {
  try {
    const converter = new OfficeToMarkdown({
      headingStyle: "atx",
      preserveTables: true,
      convertMath: true,
    });

    const result = await converter.convert(filePath);

    if (!result.markdown || result.markdown.trim() === "") {
      return { success: false, error: "DOCX conversion returned empty content" };
    }

    return { success: true, markdown: result.markdown };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Convert other formats using markitdown-ts
 */
async function convertWithMarkitdownTs(
  filePath: string,
): Promise<ConversionResult> {
  try {
    const markitdown = new MarkItDown();
    const result = await markitdown.convert(filePath);

    if (!result || !result.markdown) {
      return { success: false, error: "Conversion returned empty result" };
    }

    return { success: true, markdown: result.markdown };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
