import { EventEmitter } from 'events';
import { TicketMonitor } from './ticket-monitor.js';
import { ChatLauncher } from './chat-launcher.js';
import { AgentConfig, ActiveChat, CSVTicket } from './types.js';
import { CSVParser } from './csv-parser.js';
import { resolve } from 'path';

interface QueuedTicket {
  ticket: CSVTicket;
  agentType: 'swe' | 'qa' | 'pm' | 'docs';
}

export class AgentOrchestrator extends EventEmitter {
  private config: AgentConfig;
  private monitor: TicketMonitor;
  private chatLauncher: ChatLauncher;
  private activeChats: Map<string, ActiveChat> = new Map();
  private chatCooldown: Map<string, Date> = new Map();
  private ticketQueue: QueuedTicket[] = [];
  private isProcessingQueue: boolean = false;
  private shouldRestartQueue: boolean = false; // Flag to signal that queue should restart

  constructor(config: AgentConfig) {
    super();
    this.config = config;

    const scriptsPath = resolve(config.workspace, config.scriptsPath);
    this.monitor = new TicketMonitor(config);
    this.chatLauncher = new ChatLauncher(scriptsPath, config.workspace);

    this.setupEventHandlers();
  }

  /**
   * Start the orchestrator
   */
  async start(): Promise<void> {
    console.log('🚀 Starting Agent Orchestrator...');
    console.log(`   Workspace: ${this.config.workspace}`);
    console.log(`   Max concurrent chats: ${this.config.maxConcurrentChats}`);
    console.log(`   Chat cooldown: ${this.config.chatCooldown / 1000}s`);

    await this.monitor.start();
    this.emit('started');
  }

  /**
   * Stop the orchestrator
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping Agent Orchestrator...');
    await this.monitor.stop();
    this.activeChats.clear();
    this.chatCooldown.clear();
    this.emit('stopped');
  }

  /**
   * Setup event handlers for ticket monitoring
   */
  private setupEventHandlers(): void {
    // Handle SWE tickets - add to queue
    this.monitor.on('swe-ticket', (ticket: CSVTicket) => {
      this.enqueueTicket(ticket, 'swe');
    });

    // Handle QA tickets - add to queue
    this.monitor.on('qa-ticket', (ticket: CSVTicket) => {
      this.enqueueTicket(ticket, 'qa');
    });

    // Handle PM tickets - add to queue
    this.monitor.on('pm-ticket', (ticket: CSVTicket) => {
      this.enqueueTicket(ticket, 'pm');
    });

    // Handle Docs tickets - add to queue
    this.monitor.on('docs-ticket', (ticket: CSVTicket) => {
      this.enqueueTicket(ticket, 'docs');
    });

    // Handle ticket completion - remove from active chats and trigger queue processing
    this.monitor.on('ticket-completed', (data: { ticketId: string; agentType: string; previousStatus: string; newStatus: string }) => {
      console.log(`📥 Received ticket-completed event: ${data.ticketId} (agent: ${data.agentType}, ${data.previousStatus} → ${data.newStatus})`);
      this.handleTicketCompletion(data.ticketId, data.agentType as 'swe' | 'qa' | 'pm' | 'docs', data.previousStatus, data.newStatus);
    });

    // Handle ticket sent back from QA - clear cooldown so it can be reprocessed immediately
    this.monitor.on('ticket-sent-back', (data: { ticketId: string; previousStatus: string; newStatus: string }) => {
      console.log(`📥 Received ticket-sent-back event: ${data.ticketId} (${data.previousStatus} → ${data.newStatus})`);
      this.handleTicketSentBack(data.ticketId);
    });

    this.monitor.on('error', (error: Error) => {
      this.emit('error', error);
    });
  }

  /**
   * Add ticket to processing queue
   */
  private enqueueTicket(ticket: CSVTicket, agentType: 'swe' | 'qa' | 'pm' | 'docs'): void {
    const chatKey = `${agentType}-${ticket.id}`;
    
    // Check if already in queue
    if (this.ticketQueue.some((q) => `${q.agentType}-${q.ticket.id}` === chatKey)) {
      console.log(`⏭️  Ticket ${ticket.id} already in queue`);
      return;
    }

    this.ticketQueue.push({ ticket, agentType });
    console.log(`📥 Queued ${agentType.toUpperCase()} ticket: ${ticket.id} (queue size: ${this.ticketQueue.length})`);
    
    // Start processing queue if not already processing
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  /**
   * Process tickets from queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      // If already processing, set flag to restart when current process finishes
      this.shouldRestartQueue = true;
      console.log(`🔄 Queue processing in progress, will restart when current batch completes`);
      return;
    }

    this.isProcessingQueue = true;
    this.shouldRestartQueue = false;
    console.log(`🔄 Starting queue processing (${this.ticketQueue.length} tickets in queue, ${this.activeChats.size}/${this.config.maxConcurrentChats} active chats)`);

    while (this.ticketQueue.length > 0) {
      // Check if we have available slots
      if (this.activeChats.size >= this.config.maxConcurrentChats) {
        console.log(`⏸️  Max concurrent chats reached (${this.activeChats.size}/${this.config.maxConcurrentChats}), pausing queue processing`);
        break; // Exit loop, will be called again when slot opens
      }

      // Peek at the front of the queue without removing it
      const queued = this.ticketQueue[0];
      if (!queued) {
        break;
      }

      // Re-check dependencies before processing (they might have been met since queuing)
      // We need ALL tickets (including completed ones) to check dependencies
      // So we'll parse the tickets file directly to get the full list
      const ticketsFile = this.config.ticketsFile;
      const allTickets = await CSVParser.parseTicketsFile(ticketsFile);
      
      // Check if ticket dependencies are now met
      if (!CSVParser.areDependenciesMet(queued.ticket, allTickets)) {
        // Debug: show which dependencies are missing
        const deps = queued.ticket.dependencies 
          ? queued.ticket.dependencies.split(',').flatMap(part => part.split(/\s+/)).map(d => d.trim()).filter(d => d)
          : [];
        const missingDeps: string[] = [];
        for (const depId of deps) {
          const depTicket = allTickets.find((t) => t.id === depId);
          if (!depTicket) {
            missingDeps.push(`${depId} (not found)`);
          } else if (depTicket.status !== 'completed') {
            missingDeps.push(`${depId} (status: ${depTicket.status})`);
          }
        }
        console.log(`⏭️  Skipping ${queued.ticket.id} - dependencies not yet met: ${missingDeps.join(', ')}`);
        this.ticketQueue.shift(); // Remove from queue
        continue; // Try next ticket
      }

      // Check if ticket dependencies are met (if not, ticket is blocked)
      if (!CSVParser.areDependenciesMet(queued.ticket, allTickets)) {
        console.log(`⏭️  Skipping ${queued.ticket.id} - dependencies not met, removing from queue`);
        this.ticketQueue.shift(); // Remove from queue
        continue; // Try next ticket
      }

      const result = await this.handleAgentTicket(queued.ticket, queued.agentType);
      
      // Handle max concurrent chats - keep in queue and exit loop
      if (result === 'max_reached') {
        // Keep in queue, will be processed when slot opens
        console.log(`⏸️  Max concurrent chats reached, keeping ticket in queue`);
        break; // Exit loop, will be called again when slot opens
      }
      
      // Remove from queue for all other results (launched, skipped, failed)
      this.ticketQueue.shift();

      // Wait between processing tickets to prevent interference
      if (this.ticketQueue.length > 0 && this.activeChats.size < this.config.maxConcurrentChats) {
        const delayMs = 3000; // 3 second delay between launches
        console.log(`⏳ Waiting ${delayMs}ms before next ticket...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    this.isProcessingQueue = false;
    const remainingInQueue = this.ticketQueue.length;
    const hasAvailableSlots = this.activeChats.size < this.config.maxConcurrentChats;
    
    // Check if we should restart - either because:
    // 1. There are tickets in queue and we have slots
    // 2. There are tickets in queue and shouldRestartQueue flag is set
    // 3. shouldRestartQueue flag is set (even if queue appears empty, new tickets might have been added)
    if (remainingInQueue > 0 && (hasAvailableSlots || this.shouldRestartQueue)) {
      console.log(`🔄 Restarting queue processing (${remainingInQueue} tickets remaining, ${this.activeChats.size}/${this.config.maxConcurrentChats} active chats)`);
      this.shouldRestartQueue = false;
      // Small delay to ensure state is updated
      setTimeout(() => {
        this.processQueue();
      }, 500);
    } else if (this.shouldRestartQueue && remainingInQueue === 0) {
      // Flag was set but queue is empty - reset flag (new tickets will trigger queue processing)
      console.log(`🔄 Queue restart flag was set but queue is empty - resetting flag`);
      this.shouldRestartQueue = false;
    } else if (remainingInQueue > 0) {
      console.log(`⏸️  Queue processing paused (${remainingInQueue} tickets remaining, waiting for slot)`);
    } else {
      console.log(`✅ Queue processing complete (no tickets remaining)`);
      this.shouldRestartQueue = false;
    }
  }

  /**
   * Handle ticket completion - remove chat from active chats and trigger queue processing
   */
  private handleTicketCompletion(ticketId: string, agentType: 'swe' | 'qa' | 'pm' | 'docs', previousStatus?: string, newStatus?: string): void {
    const chatKey = `${agentType}-${ticketId}`;
    
    if (this.activeChats.has(chatKey)) {
      const chat = this.activeChats.get(chatKey)!;
      const duration = Date.now() - chat.startedAt.getTime();
      console.log(`✅ Chat completed for ${ticketId} (duration: ${Math.round(duration / 1000)}s)`);
      
      // Remove from active chats immediately (so slot is available)
      this.activeChats.delete(chatKey);
      
      // Keep cooldown to prevent immediate re-processing
      this.chatCooldown.set(chatKey, new Date());
      
      // Clean up cooldown after cooldown period
      setTimeout(() => {
        this.chatCooldown.delete(chatKey);
      }, this.config.chatCooldown);
      
      // TEMPORARILY DISABLED: Close the chat tab after a delay to allow the agent to finish
      // This prevents Cursor from showing a confirmation popup about closing a running chat
      // const closeDelay = this.config.chatCloseDelay || 15000; // Default 15 seconds
      // if (chat.prompt) {
      //   console.log(`🔒 Will close chat tab for ${ticketId} in ${closeDelay / 1000}s (allowing agent to finish)...`);
      //   console.log(`   Prompt: "${chat.prompt}", Tab index: ${chat.tabIndex}`);
      //   setTimeout(() => {
      //     console.log(`🔒 Attempting to close chat tab for ${ticketId}...`);
      //     this.chatLauncher.closeChat(chat.prompt).then((success) => {
      //       if (success) {
      //         console.log(`✅ Successfully closed chat tab for ${ticketId}`);
      //       } else {
      //         console.log(`⚠️  Failed to close chat tab for ${ticketId} (tab may have been manually closed)`);
      //       }
      //     }).catch((error) => {
      //       console.log(`⚠️  Error closing chat tab for ${ticketId}: ${error.message}`);
      //     });
      //   }, closeDelay);
      // } else {
      //   console.log(`⚠️  No prompt stored for ${ticketId}, cannot close chat tab`);
      // }
      
      // Emit event
      this.emit('chat-completed', { ticketId, agentType });
      
      // Special handling: When SWE agent completes (todo → in_review), ensure QA ticket is queued
      // This handles the case where the QA ticket event might not have been processed yet
      if (agentType === 'swe' && previousStatus === 'todo' && newStatus === 'in_review') {
        console.log(`🔍 SWE agent completed ticket ${ticketId} (todo → in_review), checking for QA ticket...`);
        // Re-parse tickets file to get current state and ensure QA ticket is queued
        // Use async IIFE to handle the async call properly with error handling
        (async () => {
          try {
            await this.ensureQATicketQueued(ticketId);
            // After ensuring QA ticket is queued, trigger queue processing
            this.triggerQueueProcessing();
          } catch (error) {
            console.error(`❌ Error ensuring QA ticket is queued for ${ticketId}:`, error);
            // Still trigger queue processing even if there was an error
            this.triggerQueueProcessing();
          }
        })();
      } else {
        // For other completion types, trigger queue processing normally
        this.triggerQueueProcessing();
      }
    } else {
      console.log(`⚠️  Ticket ${ticketId} completion detected but chat not found in active chats`);
    }
  }

  /**
   * Trigger queue processing after ticket completion
   */
  private triggerQueueProcessing(): void {
    // Trigger queue processing if there are queued tickets
    // Use a small delay to ensure state is updated, then restart queue processing
    console.log(`🔍 Checking if queue should restart: queue=${this.ticketQueue.length}, active=${this.activeChats.size}, max=${this.config.maxConcurrentChats}`);
    if (this.ticketQueue.length > 0) {
      console.log(`🔄 Slot available, processing queue (${this.ticketQueue.length} tickets waiting, ${this.activeChats.size}/${this.config.maxConcurrentChats} active)...`);
      // Small delay to ensure state is fully updated
      setTimeout(() => {
        this.restartQueueProcessing();
      }, 500);
    } else {
      console.log(`ℹ️  No tickets in queue to process`);
      // Even if queue is empty, completion might have made new tickets eligible
      // The ticket monitor will emit new ticket events if status changed
      // But we should also check if there are any eligible tickets that weren't queued
      console.log(`🔍 Completion may have made new tickets eligible - ticket monitor will detect and queue them`);
    }
  }

  /**
   * Ensure QA ticket is queued for a ticket that just moved to in_review
   * This handles race conditions where the QA ticket event might not have been processed
   */
  private async ensureQATicketQueued(ticketId: string): Promise<void> {
    try {
      const allTickets = await CSVParser.parseTicketsFile(this.config.ticketsFile);
      const ticket = allTickets.find((t) => t.id === ticketId);
      
      if (!ticket) {
        console.log(`⚠️  Ticket ${ticketId} not found in tickets file`);
        return;
      }
      
      if (ticket.status !== 'in_review') {
        console.log(`ℹ️  Ticket ${ticketId} is not in 'in_review' status (current: ${ticket.status}), skipping QA ticket queue`);
        return;
      }
      
      const qaChatKey = `qa-${ticketId}`;
      
      // Check if already in queue
      if (this.ticketQueue.some((q) => `${q.agentType}-${q.ticket.id}` === qaChatKey)) {
        console.log(`ℹ️  QA ticket for ${ticketId} already in queue`);
        return;
      }
      
      // Check if already active
      if (this.activeChats.has(qaChatKey)) {
        console.log(`ℹ️  QA ticket for ${ticketId} already has active chat`);
        return;
      }
      
      // Check dependencies
      if (!CSVParser.areDependenciesMet(ticket, allTickets)) {
        console.log(`⏸️  QA ticket for ${ticketId} waiting for dependencies`);
        return;
      }
      
      // Check if dependencies are met
      if (!CSVParser.areDependenciesMet(ticket, allTickets)) {
        console.log(`⏸️  QA ticket for ${ticketId} waiting for dependencies`);
        return;
      }
      
      // Queue the QA ticket
      console.log(`📥 Ensuring QA ticket is queued for ${ticketId}`);
      this.enqueueTicket(ticket, 'qa');
    } catch (error) {
      console.error(`❌ Error ensuring QA ticket is queued for ${ticketId}:`, error);
    }
  }

  /**
   * Restart queue processing - handles the case where queue processing might already be running
   */
  private restartQueueProcessing(): void {
    console.log(`🔄 restartQueueProcessing called (queue: ${this.ticketQueue.length} tickets, active: ${this.activeChats.size}/${this.config.maxConcurrentChats}, processing: ${this.isProcessingQueue})`);
    // Call processQueue - it will either:
    // 1. Start processing if not already running
    // 2. Set shouldRestartQueue flag if already running (will restart when current batch completes)
    this.processQueue();
  }

  /**
   * Handle a ticket for any agent type (unified handler)
   * Returns: 'launched' | 'skipped' | 'max_reached' | 'failed'
   */
  private async handleAgentTicket(ticket: CSVTicket, agentType: 'swe' | 'qa' | 'pm' | 'docs'): Promise<'launched' | 'skipped' | 'max_reached' | 'failed'> {
    const chatKey = `${agentType}-${ticket.id}`;

    // Check if chat already active
    if (this.activeChats.has(chatKey)) {
      const chat = this.activeChats.get(chatKey)!;
      const age = Date.now() - chat.startedAt.getTime();
      if (age < this.config.chatCooldown) {
        console.log(`⏭️  Skipping ${ticket.id} - chat already active (${Math.round(age / 1000)}s ago)`);
        return 'skipped';
      }
    }

    // Check cooldown - but first check if ticket was recently sent back
    // If ticket status is 'todo' and it was in cooldown, it might have been sent back
    // In that case, we should clear the cooldown and allow processing
    if (this.isInCooldown(chatKey)) {
      // Check if this ticket was sent back (status is todo but was previously completed/in_review)
      // We'll allow it through if it's in todo status (meaning it needs rework)
      if (ticket.status === 'todo') {
        console.log(`🔄 Ticket ${ticket.id} is in todo status but was in cooldown - clearing cooldown (likely sent back for rework)`);
        this.chatCooldown.delete(chatKey);
        // Continue processing instead of skipping
      } else {
        console.log(`⏭️  Skipping ${ticket.id} - in cooldown period`);
        return 'skipped';
      }
    }

    // Check max concurrent chats
    if (this.activeChats.size >= this.config.maxConcurrentChats) {
      console.log(`⏭️  Skipping ${ticket.id} - max concurrent chats reached (${this.activeChats.size}/${this.config.maxConcurrentChats})`);
      return 'max_reached';
    }

    // Launch chat
    console.log(`🤖 Launching ${agentType.toUpperCase()} agent for ticket: ${ticket.id}`);
    const result = await this.chatLauncher.launchAgent(ticket, agentType);

    if (result.success) {
      this.activeChats.set(chatKey, {
        ticketId: ticket.id,
        agentType: agentType,
        startedAt: new Date(),
        prompt: result.prompt,
        tabIndex: result.tabIndex,
      });

      // Set cooldown
      this.chatCooldown.set(chatKey, new Date());

      // Clean up after cooldown period (fallback if ticket completion not detected)
      setTimeout(() => {
        if (this.activeChats.has(chatKey)) {
          console.log(`⏰ Cooldown expired for ${ticket.id}, removing from active chats`);
          this.activeChats.delete(chatKey);
          this.chatCooldown.delete(chatKey);
          
          // Trigger queue processing if there are queued tickets
          if (this.ticketQueue.length > 0) {
            console.log(`🔄 Slot available, processing queue (${this.ticketQueue.length} tickets waiting)...`);
            this.processQueue();
          }
        }
      }, this.config.chatCooldown);

      this.emit('chat-launched', { ticketId: ticket.id, agentType: agentType });
      return 'launched';
    } else {
      console.error(`❌ Failed to launch chat for ${ticket.id}`);
      return 'failed';
    }
  }

  /**
   * Handle ticket sent back to todo - clear cooldown so SWE can reprocess immediately
   */
  private handleTicketSentBack(ticketId: string): void {
    const sweChatKey = `swe-${ticketId}`;
    const qaChatKey = `qa-${ticketId}`;
    
    // Clear cooldown for SWE agent so it can reprocess immediately
    if (this.chatCooldown.has(sweChatKey)) {
      console.log(`🔄 Clearing cooldown for ${ticketId} (ticket sent back for rework)`);
      this.chatCooldown.delete(sweChatKey);
    }
    
    // Also clear QA cooldown if it exists
    if (this.chatCooldown.has(qaChatKey)) {
      console.log(`🔄 Clearing QA cooldown for ${ticketId}`);
      this.chatCooldown.delete(qaChatKey);
    }
    
    // Remove from active chats if present (shouldn't be, but just in case)
    if (this.activeChats.has(sweChatKey)) {
      console.log(`🔄 Removing ${ticketId} from active chats (sent back for rework)`);
      this.activeChats.delete(sweChatKey);
    }
    if (this.activeChats.has(qaChatKey)) {
      this.activeChats.delete(qaChatKey);
    }
    
    // Remove from lastProcessedTickets in monitor so it can be re-detected
    // This ensures the ticket will be picked up again when it changes to todo
    // Note: We can't directly access monitor's lastProcessedTickets, but the monitor
    // will handle this automatically when it detects the status change
    
    // Trigger queue processing in case the ticket is already queued but was blocked by cooldown
    if (this.ticketQueue.length > 0) {
      console.log(`🔄 Ticket sent back, triggering queue reprocessing (${this.ticketQueue.length} tickets in queue)`);
      setTimeout(() => {
        this.restartQueueProcessing();
      }, 500);
    }
  }

  /**
   * Check if a chat is in cooldown period
   */
  private isInCooldown(chatKey: string): boolean {
    const cooldownTime = this.chatCooldown.get(chatKey);
    if (!cooldownTime) {
      return false;
    }

    const elapsed = Date.now() - cooldownTime.getTime();
    return elapsed < this.config.chatCooldown;
  }

  /**
   * Get active chats
   */
  getActiveChats(): ActiveChat[] {
    return Array.from(this.activeChats.values());
  }
}


