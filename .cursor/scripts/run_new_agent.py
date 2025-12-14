#!/usr/bin/env python3
"""
Run a new agent in Cursor programmatically.

This script attempts multiple methods to open a new Cursor chat with an agent prompt:
1. cursor-agent CLI (if available and prompt provided)
2. AppleScript keyboard simulation (macOS)
3. Basic cursor CLI (fallback)

Usage:
    python3 .cursor/scripts/run_new_agent.py -a swe                    # Run SWE agent
    python3 .cursor/scripts/run_new_agent.py -a qa                      # Run QA agent
    python3 .cursor/scripts/run_new_agent.py -a swe -m claude-3.5-sonnet  # Run SWE agent with specific model
    python3 .cursor/scripts/run_new_agent.py -p "Your prompt"            # Open chat with custom prompt
    python3 .cursor/scripts/run_new_agent.py -w /path/to/workspace       # Open in specific workspace
"""
import subprocess
import sys
from pathlib import Path


def escape_applescript_string(text: str) -> str:
    """Escape special characters for AppleScript strings."""
    # Escape backslashes first, then quotes
    return text.replace('\\', '\\\\').replace('"', '\\"')


def open_cursor_chat_hybrid(prompt: str = None, workspace: Path = None, model: str = None):
    """
    Try to open Cursor chat using best available method.
    
    Priority:
    1. cursor-agent CLI (if available)
    2. AppleScript keyboard simulation (macOS)
    3. Basic cursor CLI
    
    Args:
        prompt: Optional initial chat prompt/message
        workspace: Optional workspace path to open
        model: Optional model type to specify
    
    Returns:
        bool: True if successful, False otherwise
    """
    # Construct full prompt with model specification if provided
    full_prompt = prompt
    if model and prompt:
        full_prompt = f"{prompt} (model: {model})"
    elif model:
        full_prompt = f"(model: {model})"
    
    if full_prompt:
        # Try cursor-agent first (most reliable if available)
        try:
            cmd = ['cursor-agent', '-p', full_prompt]
            if model:
                cmd.extend(['-m', model])
            result = subprocess.run(
                cmd,
                capture_output=True,
                timeout=5,
                check=False
            )
            if result.returncode == 0:
                print("✅ Opened chat with cursor-agent CLI")
                return True
        except FileNotFoundError:
            pass  # cursor-agent not installed, try next method
        except subprocess.TimeoutExpired:
            pass  # Command hung, try next method
        except Exception as e:
            pass  # Other error, try next method
    
    # Fallback to AppleScript on macOS (simulates Cmd+T)
    if sys.platform == 'darwin':
        try:
            # First, ensure Cursor is running/activated
            activate_script = 'tell application "Cursor" to activate'
            result = subprocess.run(
                ['osascript', '-e', activate_script],
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode != 0:
                print("⚠️  Could not activate Cursor. Is it installed?")
                return False
            
            # Wait a moment for Cursor to activate
            import time
            time.sleep(0.5)
            
            # Open new chat tab (Cmd+T)
            if full_prompt:
                # Escape prompt for AppleScript
                escaped_prompt = escape_applescript_string(full_prompt)
                # Open NEW chat tab (Cmd+T) and type prompt, then submit
                # Add longer delays to ensure new chat is ready
                chat_script = f'''
                tell application "System Events"
                    tell process "Cursor"
                        -- Open new chat tab
                        keystroke "t" using command down
                        delay 1.0
                        -- Type the prompt
                        keystroke "{escaped_prompt}"
                        delay 0.5
                        -- Submit (Enter)
                        key code 36
                    end tell
                end tell
                '''
            else:
                # Just open new chat
                chat_script = '''
                tell application "System Events"
                    tell process "Cursor"
                        keystroke "t" using command down
                    end tell
                end tell
                '''
            
            result = subprocess.run(
                ['osascript', '-e', chat_script],
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode == 0:
                print("✅ Opened new chat in Cursor (using AppleScript)")
                if full_prompt:
                    print(f"   Prompt: {full_prompt}")
                return True
            else:
                # Check for permission error
                if "not allowed to send keystrokes" in result.stderr or "1002" in result.stderr:
                    print("⚠️  macOS Accessibility Permission Required")
                    print("   To enable keystroke automation:")
                    print("   1. Open System Settings → Privacy & Security → Accessibility")
                    print("   2. Enable 'Terminal' or 'Python' (whichever you're using)")
                    print("   3. Or run this script from Terminal.app (it may already have permissions)")
                    print("\n   Alternatively, Cursor is now activated - press Cmd+T manually")
                    if full_prompt:
                        print(f"   Then paste this prompt: {full_prompt}")
                    return True  # Still activated Cursor, so partial success
                else:
                    print(f"⚠️  AppleScript method failed: {result.stderr}")
        except Exception as e:
            print(f"⚠️  AppleScript method failed: {e}")
    
    # Last resort: just open Cursor (user will need to manually open chat)
    workspace_path = workspace or Path.cwd()
    try:
        subprocess.run(['cursor', str(workspace_path)], check=False)
        print("✅ Opened Cursor")
        if not full_prompt:
            print("   💡 Press Cmd+T to open a new chat")
        else:
            print(f"   💡 Press Cmd+T and paste: {full_prompt}")
        return True
    except FileNotFoundError:
        print("❌ Cursor CLI not found.")
        print("   Install it with: curl https://cursor.com/install -fsS | bash")
        print("   Or use AppleScript method (macOS only)")
        return False


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Run a new agent in Cursor programmatically',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s -a swe                    # Run SWE agent
  %(prog)s -a qa                      # Run QA agent
  %(prog)s -a pm                      # Run PM agent
  %(prog)s -a docs                    # Run Docs agent
  %(prog)s -a swe -m claude-3.5-sonnet  # Run SWE agent with specific model
  %(prog)s -p "Refactor this code"    # Open chat with custom prompt
  %(prog)s -w /path/to/project         # Open in specific workspace
        """
    )
    parser.add_argument(
        '-a', '--agent',
        type=str,
        choices=['swe', 'qa', 'pm', 'docs'],
        help='Agent type to run (swe, qa, pm, or docs)'
    )
    parser.add_argument(
        '-m', '--model',
        type=str,
        help='Model type to use (e.g., claude-3.5-sonnet, gpt-4, etc.)'
    )
    parser.add_argument(
        '-p', '--prompt',
        type=str,
        help='Custom initial chat prompt/message (overrides agent prompt)'
    )
    parser.add_argument(
        '-w', '--workspace',
        type=Path,
        help='Workspace path to open'
    )
    
    args = parser.parse_args()
    
    # Construct prompt based on agent type if specified
    prompt = args.prompt
    if not prompt and args.agent:
        if args.agent == 'swe':
            prompt = "run swe agent"
        elif args.agent == 'qa':
            prompt = "Use @.cursor/rules/qa-agent.mdc"
        elif args.agent == 'pm':
            prompt = "Use @.cursor/rules/pm-agent.mdc"
        elif args.agent == 'docs':
            prompt = "run docs agent"
    
    success = open_cursor_chat_hybrid(prompt, args.workspace, args.model)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()

