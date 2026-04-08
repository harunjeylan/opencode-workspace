/**
 * Process Runner Helper
 *
 * Utilities for running Python scripts and other external processes.
 */

import path from "node:path";
import { spawn } from "bun";
import { getPythonPath, getPythonScriptPath } from "./python-env";

export interface RunResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run a Python script with arguments
 * 
 * @param opencodePath - .opencode directory path
 * @param toolName - Name of the tool (e.g., "nllb-translation")
 * @param args - Arguments to pass to the script
 * @returns RunResult with output and status
 */
export async function runPythonScript(
  opencodePath: string,
  toolName: string,
  args: Record<string, any>
): Promise<RunResult> {
  const pythonPath = getPythonPath(opencodePath, toolName);
  const fullScriptPath = getPythonScriptPath(opencodePath, toolName);
  
  // Convert args object to JSON for stdin
  const inputJson = JSON.stringify(args);
  
  try {
    const proc = spawn(
      [pythonPath, fullScriptPath],
      {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
        cwd: opencodePath,
      }
    );
    
    // Send args via stdin
    proc.stdin.write(inputJson);
    proc.stdin.end();
    
    // Wait for completion
    const exitCode = await proc.exited;
    
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    
    return {
      success: exitCode === 0,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      stdout: "",
      stderr: message,
      exitCode: -1,
    };
  }
}

/**
 * Run a shell command
 * 
 * @param command - Command array
 * @param cwd - Working directory
 * @returns RunResult with output and status
 */
export async function runCommand(
  command: string[],
  cwd?: string
): Promise<RunResult> {
  try {
    const proc = spawn(command, {
      stdout: "pipe",
      stderr: "pipe",
      cwd,
    });
    
    const exitCode = await proc.exited;
    
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    
    return {
      success: exitCode === 0,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      stdout: "",
      stderr: message,
      exitCode: -1,
    };
  }
}

/**
 * Install Python packages from requirements.txt for a specific tool
 * 
 * @param opencodePath - .opencode directory path
 * @param toolName - Name of the tool
 * @returns RunResult
 */
export async function installRequirements(
  opencodePath: string,
  toolName: string
): Promise<RunResult> {
  const pythonPath = getPythonPath(opencodePath, toolName);
  const requirementsPath = path.join(opencodePath, "src", toolName, "requirements.txt");
  const venvPath = path.join(opencodePath, "src", toolName, ".venv");
  
  return runCommand(
    [pythonPath, "-m", "pip", "install", "-r", requirementsPath],
    venvPath
  );
}

/**
 * Create Python virtual environment
 * 
 * @param opencodePath - .opencode directory path
 * @param toolName - Name of the tool
 * @returns RunResult
 */
export async function createVirtualEnv(opencodePath: string, toolName: string): Promise<RunResult> {
  const venvPath = path.join(opencodePath, "src", toolName, ".venv");
  const toolDir = path.join(opencodePath, "src", toolName);
  
  return runCommand(
    ["python3", "-m", "venv", venvPath],
    toolDir
  );
}
