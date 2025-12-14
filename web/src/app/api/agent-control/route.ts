import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { resolve } from 'path';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Check if agent runner process is running
    const { stdout } = await execAsync('ps aux | grep "agent-runner/dist/index.js" | grep -v grep || echo ""');
    const isRunning = stdout.trim().length > 0;
    
    // Get process info if running
    let processInfo = null;
    if (isRunning) {
      const lines = stdout.trim().split('\n');
      if (lines.length > 0) {
        const parts = lines[0].split(/\s+/);
        processInfo = {
          pid: parts[1],
          cpu: parts[2],
          mem: parts[3],
        };
      }
    }

    return NextResponse.json({
      isRunning,
      processInfo,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to check agent runner status' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { action } = await request.json();
    
    if (action === 'start' || action === 'restart') {
      // Find project root
      const cwd = process.cwd();
      const projectRoot = resolve(cwd, '..');
      const agentRunnerPath = resolve(projectRoot, '.cursor/agent-runner/dist/index.js');
      
      if (!existsSync(agentRunnerPath)) {
        return NextResponse.json(
          { error: 'Agent runner not found. Please build it first.' },
          { status: 404 }
        );
      }

      // If restart, kill existing process first
      if (action === 'restart') {
        try {
          await execAsync('pkill -f "agent-runner/dist/index.js" || true');
          // Wait a bit for process to terminate
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (e) {
          // Ignore errors if process doesn't exist
        }
      }

      // Check if already running
      try {
        const { stdout } = await execAsync('ps aux | grep "agent-runner/dist/index.js" | grep -v grep || echo ""');
        if (stdout.trim().length > 0 && action === 'start') {
          return NextResponse.json(
            { error: 'Agent runner is already running' },
            { status: 400 }
          );
        }
      } catch (e) {
        // Continue
      }

      // Start agent runner in background
      const command = `cd "${projectRoot}" && nohup node "${agentRunnerPath}" > /dev/null 2>&1 &`;
      await execAsync(command);

      return NextResponse.json({
        success: true,
        message: `Agent runner ${action === 'restart' ? 'restarted' : 'started'} successfully`,
      });
    }

    if (action === 'stop') {
      try {
        await execAsync('pkill -f "agent-runner/dist/index.js"');
        return NextResponse.json({
          success: true,
          message: 'Agent runner stopped successfully',
        });
      } catch (e: any) {
        if (e.message.includes('No such process')) {
          return NextResponse.json(
            { error: 'Agent runner is not running' },
            { status: 400 }
          );
        }
        throw e;
      }
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "start", "restart", or "stop"' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to control agent runner' },
      { status: 500 }
    );
  }
}






