import { spawn } from 'child_process';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import { CSVTicket } from './types.js';

export class ChatLauncher {
  private scriptsPath: string;
  private workspace: string;
  private openedTabs: Map<string, number> = new Map(); // Track tab order: prompt -> tab index
  private tabCounter: number = 0; // Counter to track tab opening order
  private activeTabIndex: number | null = null; // Track which tab is currently active (most recently opened)

  constructor(scriptsPath: string, workspace: string) {
    this.scriptsPath = resolve(scriptsPath);
    this.workspace = resolve(workspace);
  }

  /**
   * Launch a Cursor chat with the specified agent for a ticket
   * Returns the prompt and tab index (for tab tracking)
   */
  async launchAgent(ticket: CSVTicket, agentType: 'swe' | 'qa' | 'pm' | 'docs'): Promise<{ success: boolean; prompt: string; tabIndex: number }> {
    const prompt = this.buildAgentPrompt(ticket, agentType);
    // Pre-assign tab index before launching (to avoid race condition)
    this.tabCounter++;
    const tabIndex = this.tabCounter;
    this.openedTabs.set(prompt, tabIndex);
    
    const success = await this.launchChat(agentType, prompt);
    
    // If launch failed, remove from tracking
    if (!success) {
      this.openedTabs.delete(prompt);
      this.tabCounter--; // Rollback counter
    } else {
      // New tab is opened at rightmost position and becomes active
      this.activeTabIndex = tabIndex;
    }
    
    return { success, prompt, tabIndex };
  }

  /**
   * Launch a Cursor chat with SWE agent for a ticket (backward compatibility)
   */
  async launchSWEAgent(ticket: CSVTicket): Promise<{ success: boolean; prompt: string; tabIndex: number }> {
    return this.launchAgent(ticket, 'swe');
  }

  /**
   * Launch a Cursor chat with QA agent for a ticket (backward compatibility)
   */
  async launchQAAgent(ticket: CSVTicket): Promise<{ success: boolean; prompt: string; tabIndex: number }> {
    return this.launchAgent(ticket, 'qa');
  }

  /**
   * Close a Cursor chat tab by finding it using the prompt text
   * Uses AppleScript to navigate to the tab and close it
   */
  async closeChat(prompt: string): Promise<boolean> {
    // On macOS, use AppleScript to close the chat tab
    if (process.platform === 'darwin') {
      return this.closeChatWithAppleScript(prompt);
    }
    
    // On other platforms, we can't easily close tabs programmatically
    console.log(`⚠️  Chat tab closing not supported on ${process.platform}`);
    return false;
  }

  /**
   * Close chat tab using AppleScript
   * Strategy: 
   * - We track tabs by order of opening (tabIndex)
   * - When closing, navigate to the tab using Cmd+[ (previous) or Cmd+] (next)
   * - Calculate how many tabs to navigate based on tab order
   * - Then close the tab with Cmd+W
   */
  private async closeChatWithAppleScript(prompt: string): Promise<boolean> {
    // Extract ticket number from prompt for logging
    const ticketMatch = prompt.match(/ticket #(\d+)/i);
    const ticketNumber = ticketMatch ? ticketMatch[1] : 'unknown';
    
    // Get the tab index for this prompt (if we tracked it)
    const tabIndex = this.openedTabs.get(prompt);
    if (tabIndex === undefined) {
      console.log(`⚠️  Tab for ticket #${ticketNumber} not found in tracking, trying to close active tab`);
      // Fallback: just try to close active tab
      return this.closeActiveTab();
    }
    
    // Calculate navigation: we need to find this tab among all tracked tabs
    // Strategy based on user suggestion:
    // - If tab #1 (first) completes and we have 3 tabs, use Cmd+[ twice to get to it
    // - We'll navigate backward based on the tab's position
    // - Since we don't know current position, we'll navigate enough to cycle through
    
    // Get all tracked tabs, excluding the one we're about to close
    const allTabIndices = Array.from(this.openedTabs.values())
      .filter(idx => idx !== tabIndex) // Exclude the tab we're closing
      .sort((a, b) => a - b);
    const remainingTabs = allTabIndices.length;
    
    // Find the position of our target tab among ALL tabs (including the one we're closing)
    const allTabsIncludingTarget = Array.from(this.openedTabs.values()).sort((a, b) => a - b);
    const targetPosition = allTabsIncludingTarget.indexOf(tabIndex); // 0-based position
    const totalTabs = allTabsIncludingTarget.length;
    
    console.log(`🔍 Closing chat tab for ticket #${ticketNumber}`);
    console.log(`   Tab index: #${tabIndex} (position ${targetPosition + 1} of ${totalTabs} total tabs)`);
    console.log(`   Remaining tabs after close: [${allTabIndices.join(', ') || 'none'}] (${remainingTabs} tabs)`);
    
    // If there's only 1 tab, we're already on it - just close directly
    if (totalTabs === 1) {
      console.log(`   Only 1 tab open - closing directly (no navigation needed)`);
      this.openedTabs.delete(prompt);
      this.activeTabIndex = null;
      return this.closeActiveTab();
    }
    
    // Calculate exact navigation needed based on current active tab and target tab
    // New tabs open at rightmost position and become active
    // Tabs are ordered left to right: [1, 2, 3] where 3 is rightmost (most recent)
    const currentActiveTab = this.activeTabIndex;
    
    if (currentActiveTab === null) {
      // Don't know which tab is active - fallback to cycling through all tabs
      console.log(`   ⚠️  Active tab unknown - using fallback navigation (cycling through all tabs)`);
      const navigateBackward = totalTabs;
      console.log(`   Will navigate backward ${navigateBackward} times (Cmd+[) to cycle to target tab`);
      return this.navigateAndClose(tabIndex, ticketNumber, prompt, navigateBackward, 'backward');
    }
    
    // Find positions of current active tab and target tab
    const currentPosition = allTabsIncludingTarget.indexOf(currentActiveTab);
    const targetPos = allTabsIncludingTarget.indexOf(tabIndex);
    
    console.log(`   Current active tab: #${currentActiveTab} (position ${currentPosition + 1})`);
    console.log(`   Target tab: #${tabIndex} (position ${targetPos + 1})`);
    
    // Calculate navigation distance
    let navigateCount: number;
    let direction: 'forward' | 'backward';
    
    if (currentPosition === targetPos) {
      // Already on the target tab - no navigation needed
      console.log(`   Already on target tab - closing directly (no navigation needed)`);
      this.openedTabs.delete(prompt);
      if (this.activeTabIndex === tabIndex) {
        this.activeTabIndex = null; // No tabs left active
      }
      return this.closeActiveTab();
    } else if (currentPosition < targetPos) {
      // Target is to the right - navigate forward (Cmd+])
      navigateCount = targetPos - currentPosition;
      direction = 'forward';
      console.log(`   Will navigate forward ${navigateCount} times (Cmd+]) to reach target tab`);
    } else {
      // Target is to the left - navigate backward (Cmd+[)
      navigateCount = currentPosition - targetPos;
      direction = 'backward';
      console.log(`   Will navigate backward ${navigateCount} times (Cmd+[) to reach target tab`);
    }
    
    return this.navigateAndClose(tabIndex, ticketNumber, prompt, navigateCount, direction);
  }

  /**
   * Navigate to target tab and close it
   */
  private navigateAndClose(
    tabIndex: number,
    ticketNumber: string,
    prompt: string,
    navigateCount: number,
    direction: 'forward' | 'backward'
  ): Promise<boolean> {
    return new Promise((resolve) => {
      // AppleScript to navigate to and close the chat tab
      // Use exact navigation based on current active tab position
      const key = direction === 'forward' ? ']' : '[';
      const directionName = direction === 'forward' ? 'forward' : 'backward';
      
      const script = `
        tell application "Cursor"
          activate
        end tell
        delay 0.5
        
        tell application "System Events"
          tell process "Cursor"
            -- Navigate ${directionName} to reach target tab
            repeat ${navigateCount} times
              keystroke "${key}" using command down
              delay 0.2
            end repeat
            
            -- Small delay to ensure tab switch completed
            delay 0.3
            
            -- Now close the tab
            keystroke "w" using command down
            delay 0.3
          end tell
        end tell
      `;

      const child = spawn('osascript', ['-e', script], {
        cwd: this.workspace,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          // Remove from tracking and update active tab
          this.openedTabs.delete(prompt);
          if (this.activeTabIndex === tabIndex) {
            // If we closed the active tab, find the new active tab (rightmost remaining tab)
            const remainingTabs = Array.from(this.openedTabs.values()).sort((a, b) => b - a);
            this.activeTabIndex = remainingTabs.length > 0 ? remainingTabs[0] : null;
          }
          console.log(`✅ Closed chat tab for ticket #${ticketNumber} (tab #${tabIndex})`);
          resolve(true);
        } else {
          console.log(`⚠️  Could not close chat tab for ticket #${ticketNumber} (exit code: ${code})`);
          if (stderr.trim() && !stderr.includes('not allowed')) {
            console.log(`   Error: ${stderr.trim()}`);
          }
          // Don't remove from tracking on failure - tab might still be open
          resolve(false);
        }
      });

      child.on('error', (error) => {
        console.log(`⚠️  Error closing chat tab:`, error.message);
        resolve(false);
      });
    });
  }

  /**
   * Close the active tab (used when there's only 1 tab or tab tracking is unavailable)
   */
  private async closeActiveTab(): Promise<boolean> {
    return new Promise((resolve) => {
      const script = `
        tell application "Cursor"
          activate
        end tell
        delay 0.5
        
        tell application "System Events"
          tell process "Cursor"
            keystroke "w" using command down
            delay 0.3
          end tell
        end tell
      `;

      const child = spawn('osascript', ['-e', script], {
        cwd: this.workspace,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Closed active tab`);
          resolve(true);
        } else {
          console.log(`⚠️  Failed to close active tab (exit code: ${code})`);
          resolve(false);
        }
      });

      child.on('error', (error) => {
        console.log(`⚠️  Error closing active tab: ${error.message}`);
        resolve(false);
      });
    });
  }

  /**
   * Build the initial prompt for the agent
   * Format: "Run SWE agent on ticket #xxx"
   * Keep it simple - agent rules will handle the rest
   */
  private buildAgentPrompt(ticket: CSVTicket, agentType: 'swe' | 'qa' | 'pm' | 'docs'): string {
    // Extract ticket number from ID (e.g., "TICKET-007" -> "007")
    const ticketNumber = ticket.id.replace(/^TICKET-/, '');
    
    // Use explicit rule file references for PM and QA agents
    if (agentType === 'pm') {
      return `Use @.cursor/rules/pm-agent.mdc on ticket #${ticketNumber}`;
    } else if (agentType === 'qa') {
      return `Use @.cursor/rules/qa-agent.mdc on ticket #${ticketNumber}`;
    }
    
    // Simple, clean prompt for other agents
    // The agent rules will read the ticket details from tickets.csv
    return `Run ${agentType.toUpperCase()} agent on ticket #${ticketNumber}`;
  }

  /**
   * Launch a Cursor chat using the Python script
   */
  private async launchChat(agentType: 'swe' | 'qa' | 'pm' | 'docs', prompt: string): Promise<boolean> {
    const scriptPath = join(this.scriptsPath, 'run_new_agent.py');

    if (!existsSync(scriptPath)) {
      console.error(`❌ Script not found: ${scriptPath}`);
      return false;
    }

    return new Promise((resolve) => {
      // Use proper argument passing - spawn handles escaping automatically
      const args = ['-a', agentType, '-p', prompt];
      if (this.workspace && this.workspace !== '.') {
        args.push('-w', this.workspace);
      }

      const child = spawn('python3', [scriptPath, ...args], {
        cwd: this.workspace,
        stdio: ['ignore', 'pipe', 'pipe'], // Capture output instead of inheriting
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          // Tab tracking is now handled in launchAgent before launchChat
          // Just log success here
          const tabIndex = this.openedTabs.get(prompt) || 0;
          console.log(`✅ Launched ${agentType.toUpperCase()} agent chat (tab #${tabIndex})`);
          if (stdout.trim()) {
            console.log(`   ${stdout.trim()}`);
          }
          resolve(true);
        } else {
          // Tab tracking cleanup is handled in launchAgent
          console.error(`⚠️  Failed to launch chat (exit code: ${code})`);
          if (stderr.trim()) {
            console.error(`   Error: ${stderr.trim()}`);
          }
          resolve(false);
        }
      });

      child.on('error', (error) => {
        console.error(`❌ Error launching chat:`, error.message);
        resolve(false);
      });
    });
  }
}

