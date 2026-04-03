/**
 * OpenCode Markdown to PDF Tool
 *
 * Converts Markdown files to PDF using md-to-pdf (Puppeteer-based).
 * Supports: custom page size, margins, CSS styling, syntax highlighting.
 */

import fs from "node:fs";
import path from "node:path";
import { tool } from "@opencode-ai/plugin";
import { mdToPdf } from "md-to-pdf";

const PAGE_SIZES = ["A4", "Letter", "Legal", "A3", "A5"];

export default tool({
  description: "Convert Markdown files to PDF using Puppeteer",

  args: {
    input: tool.schema
      .string()
      .describe("Markdown file path (relative or absolute)"),
    output: tool.schema
      .string()
      .optional()
      .describe("Output PDF path (defaults to input with .pdf)"),
    pageSize: tool.schema
      .enum(PAGE_SIZES)
      .optional()
      .describe("Page size (default: A4)"),
    landscape: tool.schema
      .boolean()
      .optional()
      .describe("Landscape orientation (default: false)"),
    margin: tool.schema
      .string()
      .optional()
      .describe("Margins (e.g., '20mm', '1in')"),
    css: tool.schema.string().optional().describe("Custom CSS styles"),
    highlightStyle: tool.schema
      .string()
      .optional()
      .describe("Code highlight style (default: github)"),
  },

  execute: async (args, context): Promise<string> => {
    try {
      if (!args.input) {
        return "❌ Error: --input is required\n\nUsage: @mdtopdf input=document.md output=document.pdf";
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
        : inputPath.replace(/\.md$/i, ".pdf");

      const pdfOptions: any = {
        format: args.pageSize || "A4",
      };

      if (args.landscape) {
        pdfOptions.landscape = true;
      }

      if (args.margin) {
        pdfOptions.margin = args.margin;
      }

      if (args.pageSize || args.landscape || args.margin) {
        pdfOptions.printBackground = true;
      }

      const config: any = {
        pdf_options: pdfOptions,
        launch_options: {
          executablePath: "/usr/bin/google-chrome",
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        },
      };

      if (args.css) {
        config.css = args.css;
      }

      if (args.highlightStyle) {
        config.highlight_style = args.highlightStyle;
      }

      const pdf = await mdToPdf({ path: inputPath }, config).catch((err) => {
        throw err;
      });

      if (!pdf) {
        return "❌ Error: Failed to generate PDF";
      }

      fs.writeFileSync(outputPath, pdf.content);

      const stats = fs.statSync(outputPath);
      const sizeKB = (stats.size / 1024).toFixed(1);

      return [
        "✅ PDF created successfully!",
        "",
        `📄 Input:  ${inputPath}`,
        `📁 Output: ${outputPath}`,
        `📊 Size:   ${sizeKB} KB`,
        `📐 Page:   ${args.pageSize || "A4"}${args.landscape ? " (landscape)" : ""}`,
        "",
        "💡 Uses Puppeteer for accurate rendering",
      ].join("\n");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `❌ Error: ${message}`;
    }
  },
});
