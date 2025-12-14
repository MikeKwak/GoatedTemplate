#!/usr/bin/env python3
"""
Open and run a new chat in Cursor programmatically.

This script attempts multiple methods to open a new Cursor chat:
1. cursor-agent CLI (if available and prompt provided)
2. AppleScript keyboard simulation (macOS)
3. Basic cursor CLI (fallback)

Usage:
    python3 tools/scripts/open_cursor_chat.py                    # Open empty chat
    python3 tools/scripts/open_cursor_chat.py -p "Your prompt"    # Open chat with prompt
    python3 tools/scripts/open_cursor_chat.py -w /path/to/workspace
"""
import subprocess
import sys
from pathlib import Path


def escape_applescript_string(text: str) -> str:
    """Escape special characters for AppleScript strings."""
    # Escape backslashes first, then quotes
    return text.replace('\\', '\\\\').replace('"', '\\"')


def open_cursor_chat_hybrid(prompt: str = None, workspace: Path = None):
    """
    Try to open Cursor chat using best available method.
    
    Priority:
    1. cursor-agent CLI (if available)
    2. AppleScript keyboard simulation (macOS)
    3. Basic cursor CLI
    
    Args:
        prompt: Optional initial chat prompt/message
        workspace: Optional workspace path to open
    
    Returns:
        bool: True if successful, False otherwise
    """
    if prompt:
        # Try cursor-agent first (most reliable if available)
        try:
            result = subprocess.run(
                ['cursor-agent', '-p', prompt],
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
            if prompt:
                # Escape prompt for AppleScript
                escaped_prompt = escape_applescript_string(prompt)
                # Open chat and type prompt, then submit
                chat_script = f'''
                tell application "System Events"
                    tell process "Cursor"
                        keystroke "t" using command down
                        delay 0.5
                        keystroke "{escaped_prompt}"
                        delay 0.2
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
                if prompt:
                    print(f"   Prompt: {prompt}")
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
                    if prompt:
                        print(f"   Then paste this prompt: {prompt}")
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
        if not prompt:
            print("   💡 Press Cmd+T to open a new chat")
        else:
            print(f"   💡 Press Cmd+T and paste: {prompt}")
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
        description='Open a new chat in Cursor programmatically',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                          # Open empty chat
  %(prog)s -p "Refactor this code"  # Open chat with prompt
  %(prog)s -w /path/to/project       # Open in specific workspace
        """
    )
    parser.add_argument(
        '-p', '--prompt',
        type=str,
        help='Initial chat prompt/message'
    )
    parser.add_argument(
        '-w', '--workspace',
        type=Path,
        help='Workspace path to open'
    )
    
    args = parser.parse_args()
    
    success = open_cursor_chat_hybrid(args.prompt, args.workspace)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()

