import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join } from 'path';

interface Ticket {
  id: string;
  status: string;
  title: string;
  description: string;
  priority: string;
  type: string;
  assignee: string;
  labels: string;
  blocking: string;
  blocked_by: string;
  dependencies: string;
  complexity: string;
  acceptance_criteria: string;
  sprint: string;
  sprint_order: string;
  created_at: string;
  updated_at: string;
  agent_type: string;
}

function parseCSV(content: string): Ticket[] {
  // Handle multi-line CSV properly
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if (char === '\n' && !inQuotes) {
      lines.push(currentLine);
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const tickets: Ticket[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const ticket: any = {};
    headers.forEach((header, index) => {
      // Remove quotes from values
      let value = (values[index] || '').trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      ticket[header] = value;
    });
    tickets.push(ticket as Ticket);
  }

  return tickets;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export async function GET() {
  try {
    // Try to find tickets.csv in project root
    // Next.js API routes run from the web/.next/server directory in production
    // or web directory in development
    const cwd = process.cwd();
    
    // Try multiple possible paths - go up from web directory to project root
    const ticketsPaths = [
      resolve(cwd, '..', 'tickets.csv'),           // From web/ -> ../tickets.csv
      resolve(cwd, '../../tickets.csv'),           // From web/.next/server -> ../../tickets.csv
      resolve(cwd, '../../../tickets.csv'),         // From web/.next/server/app -> ../../../tickets.csv
      join(cwd, '..', 'tickets.csv'),               // Alternative path resolution
      join(cwd, '../../tickets.csv'),
      resolve(cwd, 'tickets.csv'),                  // Fallback: maybe it's in current dir
    ];

    let ticketsContent = '';
    let ticketsPath = '';

    for (const path of ticketsPaths) {
      try {
        if (existsSync(path)) {
          ticketsContent = await readFile(path, 'utf-8');
          ticketsPath = path;
          break;
        }
      } catch (e) {
        // Continue to next path
        continue;
      }
    }

    if (!ticketsContent) {
      return NextResponse.json(
        { 
          error: 'tickets.csv not found',
          searchedPaths: ticketsPaths,
          currentDir: process.cwd(),
        },
        { status: 404 }
      );
    }

    let tickets: Ticket[] = [];
    try {
      tickets = parseCSV(ticketsContent);
    } catch (parseError: any) {
      console.error('CSV parsing error:', parseError);
      return NextResponse.json(
        { 
          error: 'Failed to parse tickets.csv',
          details: parseError.message,
          path: ticketsPath,
        },
        { status: 500 }
      );
    }

    // Load agent runner config if available
    // Determine project root from the tickets.csv path we found
    const projectRoot = ticketsPath ? resolve(ticketsPath, '..') : resolve(cwd, '..');
    const configPaths = [
      resolve(projectRoot, '.cursor/agent-runner/agent-runner.config.json'),
      resolve(cwd, '..', '.cursor/agent-runner/agent-runner.config.json'),
      resolve(cwd, '../../.cursor/agent-runner/agent-runner.config.json'),
    ];
    let configPath = configPaths.find(p => {
      try {
        return existsSync(p);
      } catch {
        return false;
      }
    });
    let config = null;
    if (configPath) {
      try {
        const configContent = await readFile(configPath, 'utf-8');
        config = JSON.parse(configContent);
      } catch (e: any) {
        console.warn('Config load error:', e.message);
        // Ignore config errors
      }
    }

    // Calculate statistics
    const stats = {
      total: tickets.length,
      todo: tickets.filter(t => t.status === 'todo').length,
      in_progress: tickets.filter(t => t.status === 'in_progress').length,
      in_review: tickets.filter(t => t.status === 'in_review').length,
      completed: tickets.filter(t => t.status === 'completed').length,
      byPriority: {
        high: tickets.filter(t => t.priority === 'high').length,
        medium: tickets.filter(t => t.priority === 'medium').length,
        low: tickets.filter(t => t.priority === 'low').length,
      },
      byAgent: {
        swe: tickets.filter(t => t.assignee === 'SWE Agent' || t.agent_type === 'swe').length,
        qa: tickets.filter(t => t.assignee === 'QA Agent' || t.agent_type === 'qa').length,
        pm: tickets.filter(t => t.assignee === 'PM Agent' || t.agent_type === 'pm').length,
      },
    };

    // Get ready tickets (no dependencies or dependencies met)
    const readyTickets = tickets.filter(ticket => {
      if (ticket.status !== 'todo') return false;
      if (!ticket.dependencies) return true;
      
      const deps = ticket.dependencies.split(',').map(d => d.trim()).filter(Boolean);
      if (deps.length === 0) return true;
      
      return deps.every(depId => {
        const depTicket = tickets.find(t => t.id === depId);
        return depTicket && (depTicket.status === 'completed' || depTicket.status === 'in_review');
      });
    });

    // Get queued tickets (in_progress or in_review)
    const queuedTickets = tickets.filter(t => 
      t.status === 'in_progress' || t.status === 'in_review'
    );

    return NextResponse.json({
      tickets,
      stats,
      readyTickets: readyTickets.map(t => t.id),
      queuedTickets: queuedTickets.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        agent: t.assignee || t.agent_type,
      })),
      config: config ? {
        maxConcurrentChats: config.maxConcurrentChats || 3,
        pollInterval: config.pollInterval || 5000,
      } : null,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error reading tickets:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to read tickets',
        details: error.stack,
        currentDir: process.cwd(),
      },
      { status: 500 }
    );
  }
}

