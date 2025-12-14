# Installation Guide

## Quick Installation

Simply copy the `.cursor` folder to your project root:

```bash
# From the PlayGround directory
cp -r .cursor /path/to/your-project/
```

That's it! The agent runner is now in your project.

## Setup Steps

### 1. Install Dependencies

```bash
cd /path/to/your-project/.cursor/agent-runner
npm install
```

### 2. Build the Agent Runner

```bash
npm run build
```

### 3. Ensure Required Files Exist

Make sure your project has:
- `tickets.csv` at the project root (not in `.cursor/`)
- `.cursor/scripts/run_new_agent.py` (Python script for launching chats)
- `.cursor/rules/swe-agent.mdc` (SWE agent rules)
- `.cursor/rules/qa-agent.mdc` (QA agent rules)

### 4. Run the Agent Runner

From the project root, use one of these methods:

**Method 1: Direct execution (Recommended - works for all projects)**
```bash
node .cursor/agent-runner/dist/index.js
```

**Method 2: Using npm script (Only if you have root package.json)**
```bash
# First, add to your project's package.json:
{
  "scripts": {
    "agent:start": "node .cursor/agent-runner/dist/index.js"
  }
}

# Then run:
npm run agent:start
```

**Note**: If your project doesn't have a root `package.json` (monorepo, Python project, etc.), use Method 1.

### 5. Add to Your Project's package.json (Optional)

Add this script to your project's root `package.json`:

```json
{
  "scripts": {
    "agent:start": "node .cursor/agent-runner/dist/index.js"
  }
}
```

Then run: `npm run agent:start`

## Configuration

The agent runner looks for `tickets.csv` at the project root by default. You can customize this in `.cursor/agent-runner/agent-runner.config.json`:

```json
{
  "ticketsFile": "../../tickets.csv",
  "fallbackTicketsFile": "../../config/tickets.csv",
  "cursorRulesPath": "../rules",
  "scriptsPath": "../scripts",
  "maxConcurrentChats": 3,
  "chatCooldown": 3600000
}
```

Paths are relative to `.cursor/agent-runner/` directory.

## Project Structure

After installation, your project should look like:

```
your-project/
├── tickets.csv              # Your tickets file (at root)
├── package.json             # Your existing package.json
├── src/                     # Your existing src (untouched)
└── .cursor/
    ├── agent-runner/         # Agent runner code (isolated)
    │   ├── src/
    │   ├── dist/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── agent-runner.config.json
    ├── rules/
    │   ├── swe-agent.mdc
    │   └── qa-agent.mdc
    └── scripts/
        └── run_new_agent.py
```

## Troubleshooting

### "Cannot find module" Error

Make sure you've installed dependencies:
```bash
cd .cursor/agent-runner
npm install
```

### "tickets.csv not found" Error

Ensure `tickets.csv` exists at your project root:
```bash
ls -la /path/to/your-project/tickets.csv
```

### Python Script Not Found

Verify the Python script exists:
```bash
ls -la .cursor/scripts/run_new_agent.py
```

### Build Errors

If you get TypeScript errors, make sure you're in the agent-runner directory:
```bash
cd .cursor/agent-runner
npm run build
```

## Updating

To update the agent runner, simply replace the `.cursor/agent-runner/` directory:

```bash
# Backup your config if you customized it
cp .cursor/agent-runner/agent-runner.config.json /tmp/

# Replace the directory
rm -rf .cursor/agent-runner
cp -r /path/to/new/.cursor/agent-runner .cursor/

# Restore config if needed
cp /tmp/agent-runner.config.json .cursor/agent-runner/

# Reinstall and rebuild
cd .cursor/agent-runner
npm install
npm run build
```

## Project Types Supported

The agent runner works with:
- ✅ **Standard Node.js projects** (with root `package.json`)
- ✅ **Monorepos** (Python, Go, Rust, etc. without root `package.json`)
- ✅ **Any project structure** (as long as `tickets.csv` is at project root)

## Notes

- The agent runner is completely isolated in `.cursor/agent-runner/`
- It doesn't conflict with your existing `src/`, `package.json`, or `tsconfig.json`
- All paths are resolved relative to the config file location
- `tickets.csv` should be at the project root (not in `.cursor/`)
- Works regardless of whether you have a root `package.json` or not

