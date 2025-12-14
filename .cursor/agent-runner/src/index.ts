import { AgentOrchestrator } from './agent-orchestrator.js';
import { AgentConfig } from './types.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  let config: AgentConfig;

  // Find project root (go up from .cursor/agent-runner/dist/)
  const agentRunnerDir = resolve(__dirname, '..');
  const projectRoot = resolve(agentRunnerDir, '../..');

  // Load config from agent-runner directory or project root
  const configPaths = [
    join(agentRunnerDir, 'agent-runner.config.json'),
    join(projectRoot, 'agent-runner.config.json'),
  ];

  let configPath: string | null = null;
  let configDir: string = agentRunnerDir; // Default to agent-runner dir for resolving relative paths
  
  for (const path of configPaths) {
    if (existsSync(path)) {
      configPath = path;
      configDir = dirname(path); // Use config file's directory for resolving relative paths
      break;
    }
  }

  if (configPath) {
    try {
      const configData = await readFile(configPath, 'utf-8');
      config = JSON.parse(configData);
      console.log(`✓ Loaded configuration from ${configPath}`);
      
      // Resolve all relative paths relative to the config file's directory
      if (config.workspace) {
        config.workspace = resolve(configDir, config.workspace);
      } else {
        config.workspace = projectRoot;
      }
      
      if (config.ticketsFile) {
        config.ticketsFile = resolve(configDir, config.ticketsFile);
      }
      
      if (config.fallbackTicketsFile) {
        config.fallbackTicketsFile = resolve(configDir, config.fallbackTicketsFile);
      }
      
      if (config.cursorRulesPath) {
        config.cursorRulesPath = resolve(configDir, config.cursorRulesPath);
      }
      
      if (config.scriptsPath) {
        config.scriptsPath = resolve(configDir, config.scriptsPath);
      }
    } catch (error) {
      console.error('Error loading config file:', error);
      config = getDefaultConfig(projectRoot);
    }
  } else {
    config = getDefaultConfig(projectRoot);
  }

  // Ensure workspace is set (fallback to project root)
  if (!config.workspace) {
    config.workspace = projectRoot;
  }

  const orchestrator = new AgentOrchestrator(config);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down agent runner...');
    await orchestrator.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n\n🛑 Shutting down agent runner...');
    await orchestrator.stop();
    process.exit(0);
  });

  // Handle errors
  orchestrator.on('error', (error: Error) => {
    console.error('❌ Orchestrator error:', error);
  });

  orchestrator.on('chat-launched', (data: { ticketId: string; agentType: string }) => {
    console.log(`✅ Chat launched: ${data.agentType.toUpperCase()} agent for ${data.ticketId}`);
  });

  await orchestrator.start();
  console.log('✅ Agent runner started. Monitoring tickets...');
}

function getDefaultConfig(projectRoot: string): AgentConfig {
  return {
    ticketsFile: join(projectRoot, 'tickets.csv'), // At project root
    fallbackTicketsFile: join(projectRoot, 'config', 'tickets.csv'),
    cursorRulesPath: join(projectRoot, '.cursor', 'rules'),
    scriptsPath: join(projectRoot, '.cursor', 'scripts'),
    pollInterval: 5000,
    maxConcurrentChats: 3,
    chatCooldown: 3600000, // 1 hour
    chatCloseDelay: 15000, // 15 seconds delay before closing chat tab
    workspace: projectRoot,
  };
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
