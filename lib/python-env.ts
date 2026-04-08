/**
 * Python Environment Checker Helper
 *
 * Checks if Python environment is properly configured for tools.
 * Supports per-tool virtual environments for maximum isolation.
 * Returns installation instructions if anything is missing.
 */

import fs from "node:fs";
import path from "node:path";
import { spawn } from "bun";

export interface PythonEnvResult {
  ok: boolean;
  message: string;
  installInstructions: string[];
  action: "none" | "install" | "restart-required";
  venvPath?: string;
}

/**
 * Check if Python 3 is installed
 */
async function checkPythonInstalled(): Promise<{ installed: boolean; version?: string }> {
  try {
    const proc = spawn(["python3", "--version"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    const version = output.trim();
    return { installed: true, version };
  } catch {
    return { installed: false };
  }
}

/**
 * Check if pip is installed
 */
async function checkPipInstalled(): Promise<boolean> {
  try {
    const proc = spawn(["python3", "-m", "pip", "--version"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    await proc.exited;
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the venv path for a specific tool
 * Each tool gets its own isolated venv: src/[tool-name]/.venv
 */
function getToolVenvPath(srcPath: string, toolName: string): string {
  return path.join(srcPath, toolName, ".venv");
}

/**
 * Check if virtual environment exists for a tool
 */
async function checkToolVenvExists(srcPath: string, toolName: string): Promise<{ exists: boolean; venvPath: string }> {
  const venvPath = getToolVenvPath(srcPath, toolName);
  const pythonPath = path.join(venvPath, "bin", "python");
  
  if (fs.existsSync(pythonPath)) {
    return { exists: true, venvPath };
  }
  
  return { exists: false, venvPath };
}

/**
 * Check if required packages are installed in tool's venv
 */
async function checkRequirementsInstalled(
  venvPath: string,
  requirementsPath: string
): Promise<{ installed: boolean; missing?: string[] }> {
  if (!fs.existsSync(requirementsPath)) {
    return { installed: true }; // No requirements to check
  }
  
  const pythonBin = path.join(venvPath, "bin", "python");
  
  try {
    // Read requirements
    const requirements = fs.readFileSync(requirementsPath, "utf-8")
      .split("\n")
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("#"))
      .map(line => line.split("[")[0].split("=")[0].split(">")[0].split("<")[0].trim());
    
    // Check each package
    const missing: string[] = [];
    
    for (const pkg of requirements) {
      try {
        const proc = spawn([pythonBin, "-c", `import ${pkg.replace(/-/g, "_")}`], {
          stdout: "pipe",
          stderr: "pipe",
        });
        const exitCode = await proc.exited;
        if (exitCode !== 0) {
          missing.push(pkg);
        }
      } catch {
        missing.push(pkg);
      }
    }
    
    return { installed: missing.length === 0, missing };
  } catch {
    return { installed: false, missing: ["unknown"] };
  }
}

/**
 * Main function to check Python environment for a specific tool
 * Each tool gets its own isolated virtual environment
 * 
 * @param opencodePath - .opencode directory path
 * @param toolName - Name of the tool (e.g., "nllb-translation")
 * @returns PythonEnvResult with status and instructions
 */
export async function checkPythonEnvironment(
  opencodePath: string,
  toolName: string
): Promise<PythonEnvResult> {
  // 1. Check Python
  const pythonCheck = await checkPythonInstalled();
  
  if (!pythonCheck.installed) {
    return {
      ok: false,
      message: "Python 3 is not installed on your system",
      installInstructions: [
        "📦 Install Python 3:",
        "",
        "  Ubuntu/Debian:  sudo apt update && sudo apt install python3 python3-pip python3-venv",
        "  macOS:          brew install python",
        "  Windows:        winget install Python.Python.3",
        "                  or download from python.org",
        "",
        "💡 After installing Python, you may need to restart OpenCode",
        "",
        "Would you like me to run the installation commands?"
      ],
      action: "install",
    };
  }
  
  // 2. Check pip
  const pipInstalled = await checkPipInstalled();
  
  if (!pipInstalled) {
    return {
      ok: false,
      message: "pip is not installed",
      installInstructions: [
        "📦 Install pip:",
        "",
        "  python3 -m ensurepip --upgrade",
        "  python3 -m pip install --upgrade pip",
        "",
        "Would you like me to run these commands?"
      ],
      action: "install",
    };
  }
  
  // 3. Check tool-specific virtual environment
  const srcPath = path.join(opencodePath, "src");
  const venvCheck = await checkToolVenvExists(srcPath, toolName);
  
  if (!venvCheck.exists) {
    const toolSrcPath = path.join(srcPath, toolName);
    return {
      ok: false,
      message: `Python virtual environment for ${toolName} not found`,
      installInstructions: [
        "📦 Create virtual environment:",
        "",
        `  mkdir -p ${toolSrcPath}`,
        `  python3 -m venv ${venvCheck.venvPath}`,
        "",
        "💡 Each tool has its own isolated environment (no conflicts!)",
        "",
        "Would you like me to create it automatically?"
      ],
      action: "install",
      venvPath: venvCheck.venvPath,
    };
  }
  
  // 4. Check requirements
  const requirementsPath = path.join(srcPath, toolName, "requirements.txt");
  const reqCheck = await checkRequirementsInstalled(
    venvCheck.venvPath,
    requirementsPath
  );
  
  if (!reqCheck.installed) {
    const missingPkgs = reqCheck.missing?.join(", ") || "required packages";
    return {
      ok: false,
      message: `Missing Python packages for ${toolName}: ${missingPkgs}`,
      installInstructions: [
        "📦 Install required packages:",
        "",
        `  source ${venvCheck.venvPath}/bin/activate`,
        `  pip install -r ${requirementsPath}`,
        "",
        "💡 This is a one-time setup for this tool",
        "",
        "Would you like me to install the packages?"
      ],
      action: "install",
      venvPath: venvCheck.venvPath,
    };
  }
  
  // All good!
  return {
    ok: true,
    message: "Python environment ready",
    installInstructions: [],
    action: "none",
    venvPath: venvCheck.venvPath,
  };
}

/**
 * Get the Python executable path for a specific tool
 */
export function getPythonPath(opencodePath: string, toolName: string): string {
  const srcPath = path.join(opencodePath, "src");
  const venvPython = path.join(getToolVenvPath(srcPath, toolName), "bin", "python");
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }
  return "python3";
}

/**
 * Get the requirements.txt path for a specific tool
 */
export function getRequirementsPath(opencodePath: string, toolName: string): string {
  return path.join(opencodePath, "src", toolName, "requirements.txt");
}

/**
 * Get the Python script path for a specific tool
 */
export function getPythonScriptPath(opencodePath: string, toolName: string): string {
  return path.join(opencodePath, "src", toolName, `${toolName}.py`);
}
