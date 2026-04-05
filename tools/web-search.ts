/**
 * OpenCode Web Search Tool
 *
 * Native wrapper for open-websearch providing multi-engine web search
 * and article fetching capabilities without API keys.
 *
 * Features:
 * - Multi-engine search (bing, duckduckgo, exa, brave, baidu, csdn, juejin, startpage)
 * - Article fetching (GitHub README, CSDN, Juejin, Linux.do)
 * - Generic web/Markdown content fetching
 * - Auto-start daemon on first use
 * - Fallback to CLI mode if daemon unavailable
 */

import { tool } from "@opencode-ai/plugin";

const DAEMON_PORT = Bun.env.WEBSEARCH_PORT || "3000";
const DAEMON_URL = `http://127.0.0.1:${DAEMON_PORT}`;
const DAEMON_START_TIMEOUT = 15000;

interface SearchResult {
  title: string;
  url: string;
  description: string;
  source: string;
  engine: string;
}

interface FetchResult {
  content: string;
}

interface WebFetchResult {
  url: string;
  finalUrl: string;
  contentType: string;
  title: string;
  truncated: boolean;
  content: string;
}

let daemonStarted = false;

async function isDaemonRunning(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${DAEMON_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

async function startDaemon(): Promise<boolean> {
  if (daemonStarted) return true;

  try {
    const env = Bun.env;
    Bun.spawn(["npx", "-y", "open-websearch@latest", "serve", "--port", DAEMON_PORT], {
      env: {
        ...env,
        MODE: "both",
        ENABLE_CORS: "true",
        CORS_ORIGIN: "*",
        DEFAULT_SEARCH_ENGINE: "duckduckgo",
        USE_PROXY: "false",
      },
    });

    const startTime = Date.now();
    while (Date.now() - startTime < DAEMON_START_TIMEOUT) {
      if (await isDaemonRunning()) {
        daemonStarted = true;
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return false;
  } catch {
    return false;
  }
}

async function ensureDaemon(): Promise<boolean> {
  if (await isDaemonRunning()) return true;
  return await startDaemon();
}

async function callDaemonApi<T>(endpoint: string, body: object): Promise<T> {
  if (!(await ensureDaemon())) {
    throw new Error("Daemon not available");
  }

  try {
    const response = await fetch(`${DAEMON_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    interface ApiResponse<T> {
      status: string;
      data?: T;
      error?: { message?: string };
    }

    const data = await response.json() as ApiResponse<T>;

    if (data.status === "error") {
      throw new Error(data.error?.message || "Unknown error");
    }

    if (!data.data) {
      throw new Error("No data in response");
    }

    return data.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(String(error));
  }
}

async function runCliCommand(args: string[]): Promise<string> {
  try {
    const proc = Bun.spawn(["npx", "-y", "open-websearch@latest", ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    if (exitCode === 0) {
      return stdout.trim();
    } else {
      throw new Error(stderr || `CLI exited with code ${exitCode}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(String(error));
  }
}

async function cliSearch(
  query: string,
  limit: number,
  engines?: string[],
): Promise<SearchResult[]> {
  const args = ["search", query, "--limit", limit.toString(), "--json"];
  if (engines && engines.length > 0) {
    args.push("--engines", engines.join(","));
  } else {
    args.push("--engine", "duckduckgo");
  }

  const output = await runCliCommand(args);
  try {
    interface SearchResponse {
      status?: string;
      data?: {
        results?: SearchResult[];
        totalResults?: number;
      };
      results?: SearchResult[];
    }
    const parsed = JSON.parse(output) as SearchResponse;
    return parsed.data?.results || parsed.results || [];
  } catch {
    const lines = output.split("\n");
    const jsonLine = lines.find(line => line.startsWith("{"));
    if (jsonLine) {
      interface SearchResponse {
        status?: string;
        data?: {
          results?: SearchResult[];
          totalResults?: number;
        };
        results?: SearchResult[];
      }
      const parsed = JSON.parse(jsonLine) as SearchResponse;
      return parsed.data?.results || parsed.results || [];
    }
    return [];
  }
}

async function cliFetch(
  fetchType: string,
  url: string,
): Promise<FetchResult> {
  const args = [`fetch-${fetchType}`, url, "--json"];
  const output = await runCliCommand(args);
  try {
    interface FetchResponse {
      data?: { content?: string };
      content?: string;
    }
    const parsed = JSON.parse(output) as FetchResponse;
    return { content: parsed.data?.content || parsed.content || "" };
  } catch {
    const lines = output.split("\n");
    const jsonLine = lines.find(line => line.startsWith("{"));
    if (jsonLine) {
      interface FetchResponse {
        data?: { content?: string };
        content?: string;
      }
      const parsed = JSON.parse(jsonLine) as FetchResponse;
      return { content: parsed.data?.content || parsed.content || "" };
    }
    return { content: "" };
  }
}

async function cliFetchWeb(
  url: string,
  maxChars: number,
): Promise<WebFetchResult> {
  const args = [
    "fetch-web",
    url,
    "--max-chars",
    maxChars.toString(),
    "--json",
  ];
  const output = await runCliCommand(args);
  try {
    interface WebResponse {
      data?: WebFetchResult;
      url?: string;
      finalUrl?: string;
      contentType?: string;
      title?: string;
      truncated?: boolean;
      content?: string;
    }
    const parsed = JSON.parse(output) as WebResponse;
    if (parsed.data) {
      return parsed.data;
    }
    return {
      url: parsed.url || url,
      finalUrl: parsed.finalUrl || url,
      contentType: parsed.contentType || "",
      title: parsed.title || "",
      truncated: parsed.truncated || false,
      content: parsed.content || "",
    };
  } catch {
    const lines = output.split("\n");
    const jsonLine = lines.find(line => line.startsWith("{"));
    if (jsonLine) {
      interface WebResponse {
        data?: WebFetchResult;
        url?: string;
        finalUrl?: string;
        contentType?: string;
        title?: string;
        truncated?: boolean;
        content?: string;
      }
      const parsed = JSON.parse(jsonLine) as WebResponse;
      if (parsed.data) {
        return parsed.data;
      }
      return {
        url: parsed.url || url,
        finalUrl: parsed.finalUrl || url,
        contentType: parsed.contentType || "",
        title: parsed.title || "",
        truncated: parsed.truncated || false,
        content: parsed.content || "",
      };
    }
    return { url, finalUrl: url, contentType: "", title: "", truncated: false, content: "" };
  }
}

export default tool({
  description:
    "Multi-engine web search and article fetching tool. Supports bing, duckduckgo, exa, brave, baidu, csdn, juejin, startpage. Can fetch GitHub READMEs, CSDN articles, Juejin articles, Linux.do posts, and generic web content.",

  args: {
    operation: tool.schema
      .enum([
        "search",
        "fetchWeb",
        "fetchGithubReadme",
        "fetchCsdnArticle",
        "fetchJuejinArticle",
        "fetchLinuxDoArticle",
      ])
      .describe("Operation to perform"),
    query: tool.schema
      .string()
      .optional()
      .describe("Search query (required for search operation)"),
    limit: tool.schema
      .number()
      .optional()
      .describe("Number of results (default: 10, max: 50)"),
    engines: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe("Search engines to use"),
    url: tool.schema
      .string()
      .optional()
      .describe("URL to fetch (required for fetch operations)"),
    maxChars: tool.schema
      .number()
      .optional()
      .describe(
        "Max characters for web fetch (default: 30000, range: 1000-200000)",
      ),
    searchMode: tool.schema
      .enum(["request", "auto", "playwright"])
      .optional()
      .describe(
        "Search mode: request only, auto fallback, or playwright forced",
      ),
  },

  execute: async (args): Promise<string> => {
    try {
      switch (args.operation) {
        case "search": {
          if (!args.query) {
            return '❌ Error: --query is required for search operation\n\nUsage: @web-search operation=search query="your search" limit=10 engines=["duckduckgo"]';
          }

          const limit = Math.min(Math.max(args.limit || 10, 1), 50);
          const query = args.query;
          const engines = args.engines;
          const searchMode = args.searchMode || "request";

          try {
            const results = await callDaemonApi<SearchResult[]>("/search", {
              query,
              limit,
              engines,
              searchMode,
            });

            return formatSearchResults(results, query, limit);
          } catch {
            const results = await cliSearch(query, limit, engines);
            return formatSearchResults(results, query, limit);
          }
        }

        case "fetchWeb": {
          if (!args.url) {
            return '❌ Error: --url is required for fetchWeb operation\n\nUsage: @web-search operation=fetchWeb url="https://example.com" maxChars=30000';
          }

          const maxChars = Math.min(
            Math.max(args.maxChars || 30000, 1000),
            200000,
          );

          try {
            const result = await callDaemonApi<WebFetchResult>("/fetch-web", {
              url: args.url,
              maxChars,
            });
            return formatWebFetch(result);
          } catch {
            const result = await cliFetchWeb(args.url, maxChars);
            return formatWebFetch(result);
          }
        }

        case "fetchGithubReadme": {
          if (!args.url) {
            return '❌ Error: --url is required for fetchGithubReadme operation\n\nUsage: @web-search operation=fetchGithubReadme url="https://github.com/owner/repo"';
          }

          try {
            const result = await callDaemonApi<FetchResult>(
              `/fetch-github-readme`,
              { url: args.url },
            );
            return formatContent(result.content, args.url);
          } catch {
            const result = await cliFetch("github-readme", args.url);
            return formatContent(result.content || "", args.url);
          }
        }

        case "fetchCsdnArticle": {
          if (!args.url) {
            return '❌ Error: --url is required for fetchCsdnArticle operation\n\nUsage: @web-search operation=fetchCsdnArticle url="https://blog.csdn.net/..."';
          }

          try {
            const result = await callDaemonApi<FetchResult>(`/fetch-csdn`, {
              url: args.url,
            });
            return formatContent(result.content, args.url);
          } catch {
            const result = await cliFetch("csdn", args.url);
            return formatContent(result.content || "", args.url);
          }
        }

        case "fetchJuejinArticle": {
          if (!args.url) {
            return '❌ Error: --url is required for fetchJuejinArticle operation\n\nUsage: @web-search operation=fetchJuejinArticle url="https://juejin.cn/post/..."';
          }

          try {
            const result = await callDaemonApi<FetchResult>(`/fetch-juejin`, {
              url: args.url,
            });
            return formatContent(result.content, args.url);
          } catch {
            const result = await cliFetch("juejin", args.url);
            return formatContent(result.content || "", args.url);
          }
        }

        case "fetchLinuxDoArticle": {
          if (!args.url) {
            return '❌ Error: --url is required for fetchLinuxDoArticle operation\n\nUsage: @web-search operation=fetchLinuxDoArticle url="https://linux.do/t/topic/123.json"';
          }

          try {
            const result = await callDaemonApi<FetchResult>(`/fetch-linuxdo`, {
              url: args.url,
            });
            return formatContent(result.content, args.url);
          } catch {
            const result = await cliFetch("linuxdo", args.url);
            return formatContent(result.content || "", args.url);
          }
        }

        default:
          return `❌ Error: Unknown operation "${args.operation}"\n\nSupported operations: search, fetchWeb, fetchGithubReadme, fetchCsdnArticle, fetchJuejinArticle, fetchLinuxDoArticle`;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `❌ Error: ${message}`;
    }
  },
});

function formatSearchResults(
  results: SearchResult[],
  query: string,
  limit: number,
): string {
  if (!results || results.length === 0) {
    return `🔍 Search results for "${query}"\n\nNo results found.`;
  }

  const lines = [`🔍 Search results for "${query}"`, ""];

  results.forEach((result, index) => {
    lines.push(`${index + 1}. ${result.title}`);
    lines.push(`   ${result.url}`);
    if (result.description) {
      const desc =
        result.description.length > 200
          ? result.description.slice(0, 200) + "..."
          : result.description;
      lines.push(`   ${desc}`);
    }
    lines.push("");
  });

  lines.push(`Found ${results.length} results (limit: ${limit})`);

  return lines.join("\n");
}

function formatWebFetch(result: WebFetchResult): string {
  const lines = ["🌐 Web Content Fetched", "", `URL: ${result.url}`];

  if (result.title) {
    lines.push(`Title: ${result.title}`);
  }

  if (result.contentType) {
    lines.push(`Type: ${result.contentType}`);
  }

  lines.push("");

  if (result.truncated) {
    lines.push(`⚠️ Content truncated`);
    lines.push("");
  }

  lines.push("--- Content ---");
  lines.push(result.content || "(No content)");
  lines.push("--- End ---");

  return lines.join("\n");
}

function formatContent(content: string, url: string): string {
  const lines = ["📄 Content Fetched", "", `Source: ${url}`, ""];

  if (!content) {
    return lines.join("\n") + "(No content available)";
  }

  lines.push("--- Content ---");
  lines.push(content);
  lines.push("--- End ---");

  return lines.join("\n");
}
