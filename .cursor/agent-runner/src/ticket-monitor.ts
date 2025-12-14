import chokidar from 'chokidar';
import { EventEmitter } from 'events';
import { CSVParser } from './csv-parser.js';
import { AgentConfig, CSVTicket } from './types.js';
import { existsSync } from 'fs';

export class TicketMonitor extends EventEmitter {
  private config: AgentConfig;
  private watcher: chokidar.FSWatcher | null = null;
  private currentTickets: CSVTicket[] = [];
  private lastProcessedTickets: Set<string> = new Set();
  private pollInterval: NodeJS.Timeout | null = null;
  private ticketsFile: string | null = null;

  constructor(config: AgentConfig) {
    super();
    this.config = config;
  }

  /**
   * Start monitoring tickets.csv file
   */
  async start(): Promise<void> {
    const ticketsFile = this.findTicketsFile();
    if (!ticketsFile) {
      console.error('❌ Could not find tickets.csv file');
      console.error(`   Checked: ${this.config.ticketsFile}`);
      console.error(`   Checked: ${this.config.fallbackTicketsFile}`);
      return;
    }

    this.ticketsFile = ticketsFile;
    console.log(`📋 Monitoring tickets file: ${ticketsFile}`);
    console.log(`⏰ Polling interval: ${this.config.pollInterval || 5000}ms`);

    // Initial load
    await this.processTicketsFile(ticketsFile);

    // Watch for changes
    this.watcher = chokidar.watch(ticketsFile, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    this.watcher.on('change', async (path) => {
      console.log(`📝 Tickets file changed: ${path}`);
      await this.processTicketsFile(path);
    });

    this.watcher.on('error', (error) => {
      console.error('❌ File watcher error:', error);
      this.emit('error', error);
    });

    // Set up periodic polling to check for tickets even when file doesn't change
    // This catches cases where dependencies are met but file change wasn't detected
    const pollIntervalMs = this.config.pollInterval || 5000;
    this.pollInterval = setInterval(async () => {
      if (this.ticketsFile) {
        // Silently check (don't log unless something changes)
        // Only log when we find new eligible tickets or status changes
        await this.processTicketsFile(this.ticketsFile, true);
      }
    }, pollIntervalMs);
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * Find the tickets.csv file (check primary and fallback locations)
   */
  private findTicketsFile(): string | null {
    if (existsSync(this.config.ticketsFile)) {
      return this.config.ticketsFile;
    }
    if (existsSync(this.config.fallbackTicketsFile)) {
      return this.config.fallbackTicketsFile;
    }
    return null;
  }

  /**
   * Process tickets file and emit events for new tickets needing agents
   */
  private async processTicketsFile(filePath: string, silent: boolean = false): Promise<void> {
    const tickets = await CSVParser.parseTicketsFile(filePath);
    if (!silent) {
      console.log(`📊 Processing tickets file: found ${tickets.length} tickets`);
    }
    
    // Track which tickets are currently eligible (to detect status changes)
    const currentEligibleTickets = new Set<string>();
    
    // Find all "todo" tickets - determine agent type from assignee/agent_type
    const todoTickets = tickets.filter((t) => t.status === 'todo');
    if (!silent) {
      console.log(`📋 Found ${todoTickets.length} tickets with status 'todo'`);
    }
    for (const ticket of todoTickets) {
      const agentType = this.determineAgentType(ticket);
      if (!agentType) {
        if (!silent) {
          console.log(`⚠️  Ticket ${ticket.id} has no agent type (assignee: ${ticket.assignee || 'none'}, agent_type: ${ticket.agent_type || 'none'})`);
        }
        continue;
      }
      
      const key = `${agentType}-${ticket.id}`;
      const previousTicket = this.currentTickets.find((t) => t.id === ticket.id);
      const wasPreviouslyBlocked = previousTicket ? !this.shouldProcessTicket(previousTicket, this.currentTickets, true) : false;
      const isNowEligible = this.shouldProcessTicket(ticket, tickets, silent);
      
      if (isNowEligible) {
        currentEligibleTickets.add(key);
        
        // Emit if:
        // 1. New ticket (not in lastProcessedTickets)
        // 2. Status changed from non-todo to todo
        // 3. Was previously blocked by dependencies but is now eligible
        if (!this.lastProcessedTickets.has(key)) {
          this.lastProcessedTickets.add(key);
          console.log(`🎫 Found new ${agentType.toUpperCase()} ticket: ${ticket.id} - ${ticket.title}`);
          this.emit(`${agentType}-ticket`, ticket);
        } else if (previousTicket && previousTicket.status !== 'todo') {
          console.log(`🔄 Ticket ${ticket.id} status changed to 'todo', re-processing...`);
          this.emit(`${agentType}-ticket`, ticket);
        } else if (wasPreviouslyBlocked) {
          // Ticket was previously blocked by dependencies, now eligible
          console.log(`🎫 Ticket ${ticket.id} dependencies now met (was blocked, now eligible)`);
          this.emit(`${agentType}-ticket`, ticket);
        }
      }
    }

    // Find all "in_review" tickets - always use QA agent
    const inReviewTickets = tickets.filter((t) => t.status === 'in_review');
    if (!silent) {
      console.log(`📋 Found ${inReviewTickets.length} tickets with status 'in_review'`);
    }
    for (const ticket of inReviewTickets) {
      if (this.shouldProcessTicket(ticket, tickets, silent)) {
        const key = `qa-${ticket.id}`;
        currentEligibleTickets.add(key);
        
        // Check if this is a new ticket or status changed
        if (!this.lastProcessedTickets.has(key)) {
          this.lastProcessedTickets.add(key);
          console.log(`🎫 Found new QA ticket: ${ticket.id} - ${ticket.title}`);
          this.emit('qa-ticket', ticket);
        } else {
          // Check if ticket status changed (e.g., was todo, now in_review)
          const previousTicket = this.currentTickets.find((t) => t.id === ticket.id);
          if (previousTicket && previousTicket.status !== 'in_review') {
            console.log(`🔄 Ticket ${ticket.id} status changed to 'in_review', re-processing...`);
            this.emit('qa-ticket', ticket);
          }
        }
      }
    }
    
    // Detect ticket completion based on workflow:
    // - SWE agent completes: todo → in_review (SWE agent done, QA agent should start)
    // - QA agent completes: in_review → completed/done (QA agent done)
    const finalCompletedStatuses = ['done', 'completed', 'blocked', 'cancelled'];
    
    // Only detect completion if we have previous tickets to compare against
    // (skip on first run when currentTickets is empty)
    if (this.currentTickets.length > 0) {
      if (!silent) {
        console.log(`🔍 Checking for ticket completions (comparing ${this.currentTickets.length} previous tickets with ${tickets.length} current tickets)...`);
      }
      for (const previousTicket of this.currentTickets) {
        const currentTicket = tickets.find((t) => t.id === previousTicket.id);
        if (!currentTicket) {
          console.log(`   Ticket ${previousTicket.id} not found in current tickets (may have been deleted)`);
          continue;
        }
        
        // Skip if status hasn't changed
        if (previousTicket.status === currentTicket.status) {
          continue;
        }
        
        console.log(`   📊 Ticket ${previousTicket.id} status changed: ${previousTicket.status} → ${currentTicket.status}`);
        
        // Case 1: SWE agent completed - todo → in_review
        // With centralized queue management, we don't need in_progress status
        // The system ensures only one chat per ticket, so direct todo → in_review is sufficient
        if (previousTicket.status === 'todo' && currentTicket.status === 'in_review') {
          const agentType = this.determineAgentType(previousTicket);
          if (agentType) {
            console.log(`✅ SWE agent completed ticket ${previousTicket.id} (status: ${previousTicket.status} → ${currentTicket.status})`);
            console.log(`📤 Emitting ticket-completed event for ${previousTicket.id} (agent: ${agentType})`);
            this.emit('ticket-completed', { 
              ticketId: previousTicket.id, 
              agentType: agentType,
              previousStatus: previousTicket.status,
              newStatus: currentTicket.status
            });
            
            // Check if any tickets that depend on this completed ticket are now eligible
            this.checkDependentTickets(previousTicket.id, tickets);
          } else {
            console.log(`⚠️  Could not determine agent type for completed ticket ${previousTicket.id}`);
          }
        }
        
        // Case 2: QA agent completed - in_review → completed/done
        if (previousTicket.status === 'in_review' && finalCompletedStatuses.includes(currentTicket.status.toLowerCase())) {
          console.log(`✅ QA agent completed ticket ${previousTicket.id} (status: ${previousTicket.status} → ${currentTicket.status})`);
          console.log(`📤 Emitting ticket-completed event for ${previousTicket.id} (agent: qa)`);
          this.emit('ticket-completed', { 
            ticketId: previousTicket.id, 
            agentType: 'qa',
            previousStatus: previousTicket.status,
            newStatus: currentTicket.status
          });
          
          // Check if any tickets that depend on this completed ticket are now eligible
          this.checkDependentTickets(previousTicket.id, tickets);
        }
        
        // Case 3: Ticket sent back to todo (needs rework) - any status → todo
        // This handles: in_review → todo, completed → todo, done → todo, etc.
        if (previousTicket.status !== 'todo' && currentTicket.status === 'todo') {
          console.log(`🔄 Ticket ${previousTicket.id} sent back for rework (status: ${previousTicket.status} → ${currentTicket.status})`);
          console.log(`📤 Emitting ticket-sent-back event for ${previousTicket.id}`);
          this.emit('ticket-sent-back', { 
            ticketId: previousTicket.id, 
            previousStatus: previousTicket.status,
            newStatus: currentTicket.status
          });
        }
        
        // Case 4: Ticket completed (todo → completed/done, or any → completed/done)
        // Check if any tickets that depend on this completed ticket are now eligible
        if (previousTicket.status !== 'completed' && finalCompletedStatuses.includes(currentTicket.status.toLowerCase())) {
          this.checkDependentTickets(previousTicket.id, tickets);
        }
      }
    } else {
      if (!silent) {
        console.log(`ℹ️  Skipping completion detection (first run, no previous tickets to compare)`);
      }
    }
    
    // Clean up processed tickets that are no longer eligible (completed, etc.)
    // This allows them to be re-processed if they change back to todo/in_review
    for (const key of this.lastProcessedTickets) {
      if (!currentEligibleTickets.has(key)) {
        // Ticket is no longer in todo/in_review status, remove from processed set
        // This allows it to be processed again if status changes back
        this.lastProcessedTickets.delete(key);
      }
    }
    
    // Update current tickets for next comparison
    this.currentTickets = tickets;
  }

  /**
   * Determine agent type from ticket assignee or agent_type field
   */
  private determineAgentType(ticket: CSVTicket): string | null {
    // Check agent_type field first (lowercase)
    if (ticket.agent_type) {
      const agentType = ticket.agent_type.toLowerCase();
      if (['swe', 'qa', 'pm', 'docs'].includes(agentType)) {
        return agentType;
      }
    }

    // Check assignee field
    if (ticket.assignee) {
      const assignee = ticket.assignee.toLowerCase();
      if (assignee.includes('swe') || assignee.includes('software')) {
        return 'swe';
      }
      if (assignee.includes('qa') || assignee.includes('quality')) {
        return 'qa';
      }
      if (assignee.includes('pm') || assignee.includes('product')) {
        return 'pm';
      }
      if (assignee.includes('docs') || assignee.includes('documentation')) {
        return 'docs';
      }
    }

    // Default to SWE for todo tickets
    return 'swe';
  }

  /**
   * Check if a ticket should be processed (dependencies met, not blocked)
   */
  private shouldProcessTicket(ticket: CSVTicket, allTickets: CSVTicket[], silent: boolean = false): boolean {
    // Check dependencies
    if (!CSVParser.areDependenciesMet(ticket, allTickets)) {
      if (!silent) {
        console.log(`⏸️  Ticket ${ticket.id} waiting for dependencies`);
      }
      return false;
    }

    // Check if dependencies are met (if not, ticket is blocked)
    if (!CSVParser.areDependenciesMet(ticket, allTickets)) {
      if (!silent) {
        console.log(`⏸️  Ticket ${ticket.id} waiting for dependencies`);
      }
      return false;
    }

    return true;
  }

  /**
   * Check tickets that depend on a completed ticket and emit events for newly eligible ones
   */
  private checkDependentTickets(completedTicketId: string, allTickets: CSVTicket[]): void {
    // Find all tickets that depend on the completed ticket
    // Use comma-splitting to match the updated parsing logic
    const dependentTickets = allTickets.filter((ticket) => {
      if (!ticket.dependencies || ticket.dependencies.trim() === '') {
        return false;
      }
      // Split on commas first (CSV format), then handle whitespace-separated values
      const dependencyIds = ticket.dependencies
        .split(',')
        .flatMap((part) => part.split(/\s+/))
        .map((id) => id.trim())
        .filter((id) => id !== '');
      return dependencyIds.includes(completedTicketId);
    });

    if (dependentTickets.length === 0) {
      return;
    }

    console.log(`🔍 Checking ${dependentTickets.length} ticket(s) that depend on ${completedTicketId}...`);

    for (const ticket of dependentTickets) {
      // Only check tickets that are in todo or in_review status
      if (ticket.status !== 'todo' && ticket.status !== 'in_review') {
        continue;
      }

      // Check if ALL dependencies are now met (not just the one that completed)
      if (this.shouldProcessTicket(ticket, allTickets, true)) {
        const agentType = ticket.status === 'in_review' ? 'qa' : this.determineAgentType(ticket);
        if (agentType) {
          const key = `${agentType}-${ticket.id}`;
          
          // Check if this ticket was previously blocked by dependencies
          const previousTicket = this.currentTickets.find((t) => t.id === ticket.id);
          const wasPreviouslyBlocked = previousTicket ? !this.shouldProcessTicket(previousTicket, this.currentTickets, true) : false;
          
          // Always emit if ticket is now eligible (dependencies met)
          // The orchestrator will handle duplicates in the queue
          if (!this.lastProcessedTickets.has(key)) {
            this.lastProcessedTickets.add(key);
          }
          
          if (wasPreviouslyBlocked) {
            console.log(`🔄 Ticket ${ticket.id} dependencies now met (was blocked, now eligible), re-queuing...`);
          } else {
            console.log(`🎫 Dependency met! Found eligible ${agentType.toUpperCase()} ticket: ${ticket.id} - ${ticket.title}`);
          }
          this.emit(`${agentType}-ticket`, ticket);
        }
      } else {
        // Dependencies still not met - log for debugging
        const deps = ticket.dependencies 
          ? ticket.dependencies.split(',').flatMap(part => part.split(/\s+/)).map(d => d.trim()).filter(d => d)
          : [];
        console.log(`⏸️  Ticket ${ticket.id} still waiting for dependencies: ${deps.join(', ')}`);
      }
    }
  }

  /**
   * Get all current tickets
   */
  getCurrentTickets(): CSVTicket[] {
    return [...this.currentTickets];
  }
}

