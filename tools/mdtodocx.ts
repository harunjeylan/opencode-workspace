/**
 * OpenCode Markdown to DOCX Tool
 *
 * Converts Markdown files to Word documents using @mohtasham/md-to-docx.
 * Supports: headings, lists, tables, code blocks, images, TOC, page breaks.
 */

import fs from "node:fs";
import path from "node:path";
import { tool } from "@opencode-ai/plugin";
import { convertMarkdownToDocx } from "@mohtasham/md-to-docx";

export default tool({
  description: "Convert Markdown files to DOCX using @mohtasham/md-to-docx",

  args: {
    input: tool.schema
      .string()
      .describe("Markdown file path (relative or absolute)"),
    output: tool.schema
      .string()
      .optional()
      .describe("Output DOCX path (defaults to input with .docx)"),
    documentType: tool.schema
      .enum(["document", "report"])
      .optional()
      .describe("Document type (default: document)"),
    fontFamily: tool.schema
      .string()
      .optional()
      .describe("Font family (default: Calibri)"),
    fontSize: tool.schema
      .number()
      .optional()
      .describe("Base font size in half-points (default: 22 = 11pt)"),
    alignment: tool.schema
      .enum(["LEFT", "CENTER", "RIGHT", "JUSTIFIED"])
      .optional()
      .describe("Paragraph alignment (default: LEFT)"),
    direction: tool.schema
      .enum(["LTR", "RTL"])
      .optional()
      .describe("Text direction (default: LTR)"),
  },

  execute: async (args, context): Promise<string> => {
    try {
      if (!args.input) {
        return "❌ Error: --input is required\n\nUsage: @mdtodocx input=document.md output=document.docx";
      }

      const inputPath = path.isAbsolute(args.input)
        ? args.input
        : path.join(context.directory, args.input);

      if (!fs.existsSync(inputPath)) {
        return `❌ Error: Markdown file not found: ${inputPath}`;
      }

      const outputPath = args.output
        ? path.isAbsolute(args.output)
          ? args.output
          : path.join(context.directory, args.output)
        : inputPath.replace(/\.md$/i, ".docx");

      const markdownContent = fs.readFileSync(inputPath, "utf-8");

      const options: any = {};

      if (
        args.documentType ||
        args.fontFamily ||
        args.fontSize ||
        args.alignment ||
        args.direction
      ) {
        options.documentType = args.documentType || "document";
        options.style = {};

        if (args.fontFamily) {
          options.style.fontFamily = args.fontFamily;
        }
        if (args.fontSize) {
          options.style.paragraphSize = args.fontSize;
        }
        if (args.alignment) {
          options.style.paragraphAlignment = args.alignment;
        }
        if (args.direction) {
          options.style.direction = args.direction;
        }
      }

      const blob = await convertMarkdownToDocx(markdownContent, options);

      const buffer = Buffer.from(await blob.arrayBuffer());
      fs.writeFileSync(outputPath, buffer);

      const stats = fs.statSync(outputPath);
      const sizeKB = (stats.size / 1024).toFixed(1);

      return [
        "✅ DOCX created successfully!",
        "",
        `📄 Input:  ${inputPath}`,
        `📁 Output: ${outputPath}`,
        `📊 Size:   ${sizeKB} KB`,
        "",
        "Features: headings, lists, tables, code blocks, images, TOC, page breaks",
      ].join("\n");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `❌ Error: ${message}`;
    }
  },
});
