# Quick Start

## Installation (One-Time Setup)

1. **Copy `.cursor` folder to your project:**
   ```bash
   cp -r /path/to/PlayGround/.cursor /path/to/your-project/
   ```

2. **Install dependencies:**
   ```bash
   cd /path/to/your-project/.cursor/agent-runner
   npm install
   ```

3. **Build:**
   ```bash
   npm run build
   ```

## Running

### Method 1: Direct Execution (Recommended - Works for all projects)

From your project root:

```bash
node .cursor/agent-runner/dist/index.js
```

This works for:
- ✅ Projects with `package.json` in root
- ✅ Monorepos without root `package.json` (Python, Go, etc.)
- ✅ Any project structure

### Method 2: Using npm Script (Optional - Only if you have root package.json)

If your project has a `package.json` in the root, you can add this script:

```json
{
  "scripts": {
    "agent:start": "node .cursor/agent-runner/dist/index.js"
  }
}
```

Then run: `npm run agent:start`

**Note**: If you don't have a root `package.json` (monorepo, Python project, etc.), use Method 1 instead.

## Requirements

- `tickets.csv` at project root (not in `.cursor/`)
- `.cursor/scripts/run_new_agent.py` exists
- `.cursor/rules/swe-agent.mdc` and `qa-agent.mdc` exist
- Python 3 installed
- Cursor IDE installed

## What It Does

- Watches `tickets.csv` at project root
- When ticket with `status='todo'` and `assignee='SWE Agent'` appears → Launches SWE agent chat
- When ticket with `status='in_review'` and `assignee='QA Agent'` appears → Launches QA agent chat
- Continues monitoring until stopped (Ctrl+C)

## Project Structure

The agent runner works with any project structure:

```
your-project/
├── tickets.csv              # ← Your tickets file here (at root)
├── package.json             # Optional - not required
├── src/                      # Your project code
└── .cursor/
    ├── agent-runner/        # ← All agent runner code here
    ├── rules/
    └── scripts/
```

**Works with:**
- Standard Node.js projects (with root `package.json`)
- Monorepos (Python, Go, Rust, etc. without root `package.json`)
- Any project structure

That's it! The agent runner is completely isolated and won't conflict with your existing files.

