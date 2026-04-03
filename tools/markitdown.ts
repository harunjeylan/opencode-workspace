/**
 * @markitdown - Universal Document Converter
 *
 * Converts various file formats to Markdown using Python markitdown CLI.
 *
 * Requirements:
 *   pip install markitdown
 *
 * Supported formats:
 *   PDF, DOCX, PPTX, XLSX, HTML, Images, Audio, Video,
 *   Text files, CSV, XML, Jupyter Notebooks, ZIP,
 *   URLs, YouTube, RSS, and more
 *
 * Usage:
 *   @markitdown input=document.pdf output=document.md
 *   @markitdown input=file.pptx
 *   @markitdown input=https://example.com
 */

import fs from "node:fs";
import path from "node:path";

import { tool } from "@opencode-ai/plugin";

export default tool({
  description:
    "Universal document converter - converts PDF, DOCX, PPTX, XLSX, HTML, images, text, URLs to Markdown using Python markitdown CLI",

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
        "Requirements:",
        "  pip install markitdown",
        "",
        "Supported formats:",
        "  - PDF, DOCX, PPTX, XLSX, HTML",
        "  - Images, Audio, Video",
        "  - Text files, CSV, XML",
        "  - Jupyter Notebooks, ZIP",
        "  - URLs, YouTube, RSS",
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
      return `❌ Error: File not found: ${inputPath}`;
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

    // Try Python CLI
    const result = await tryPythonMarkitdown(inputPath, outputPath);

    // If Python fails, return error with installation instructions
    if (!result.success) {
      return [
        `❌ Error: ${result.error}`,
        "",
        "Make sure Python markitdown is installed:",
        "  pip install markitdown",
        "",
        "Or try: python3 -m markitdown",
      ].join("\n");
    }

    // Get file stats
    const stats = fs.statSync(outputPath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    const content = fs.readFileSync(outputPath, "utf-8");
    const lines = content.split("\n").length;

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
 * Try to convert using Python markitdown CLI (using Bun spawn)
 */
async function tryPythonMarkitdown(
  inputPath: string,
  outputPath: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use Bun.spawn for better compatibility
    const process = Bun.spawn(["sh", "-c", `markitdown "${inputPath}"`]);

    // Wait for process to exit
    const exitCode = await process.exited;

    const stdout = await new Response(process.stdout).text();
    const stderr = await new Response(process.stderr).text();

    if (exitCode === 0 && stdout.trim()) {
      fs.writeFileSync(outputPath, stdout, "utf-8");
      return { success: true };
    }

    if (stderr.includes("markitdown") || stderr.includes("not found")) {
      return {
        success: false,
        error: "markitdown not found. Install: pip install markitdown",
      };
    }

    return { success: false, error: stderr || "Conversion failed" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("ENOENT") || message.includes("not found")) {
      return {
        success: false,
        error: "markitdown not found. Install: pip install markitdown",
      };
    }
    return { success: false, error: message };
  }
}
