import { tool } from "@opencode-ai/plugin"
import { spawn } from "bun"
import path from "path"

export default tool({
  description: "Run a TypeScript or JavaScript file using Bun",
  args: {
    filePath: tool.schema.string().describe("The path to the script file to run (relative to workspace root or absolute)"),
  },
  async execute(args, context) {
    const workspaceRoot = context.worktree || context.directory
    const resolvedPath = path.resolve(workspaceRoot, args.filePath)
    
    const proc = spawn(["bun", "run", resolvedPath], {
      stdout: "pipe",
      stderr: "pipe",
    })
    
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ])
    
    const exitCode = await proc.exited
    
    let result = ""
    if (stdout) result += `STDOUT:\n${stdout}\n`
    if (stderr) result += `STDERR:\n${stderr}\n`
    result += `Exit code: ${exitCode}`
    
    if (exitCode !== 0) {
      return result
    }
    
    return result
  },
})