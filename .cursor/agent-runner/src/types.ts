export interface CSVTicket {
  id: string;
  status: string;
  title: string;
  assignee: string;
  dependencies: string;
  agent_type: string;
  // Optional fields (not used by agent runner, but kept for compatibility)
  description?: string;
  priority?: string;
  type?: string;
  labels?: string;
  blocking?: string;
  complexity?: string;
  acceptance_criteria?: string;
  risk_notes?: string;
  scope_boundaries?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  parent_ticket?: string;
  sprint?: string;
  sprint_order?: string;
}

export interface AgentConfig {
  ticketsFile: string;
  fallbackTicketsFile: string;
  cursorRulesPath: string;
  scriptsPath: string;
  pollInterval: number;
  maxConcurrentChats: number;
  chatCooldown: number;
  workspace: string;
  chatCloseDelay?: number; // Delay in ms before closing chat tab after completion (default: 15000)
}

export interface ActiveChat {
  ticketId: string;
  agentType: 'swe' | 'qa' | 'pm' | 'docs';
  startedAt: Date;
  prompt: string; // Track the prompt to identify the tab
  tabIndex: number; // Track the tab index when opened (for navigation)
}
