import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import type { CSVTicket } from './types.js';

export class CSVParser {
  /**
   * Parse tickets.csv file and return structured ticket data
   */
  static async parseTicketsFile(filePath: string): Promise<CSVTicket[]> {
    if (!existsSync(filePath)) {
      return [];
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      return this.parseCSV(content);
    } catch (error) {
      console.error(`Error reading tickets file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Parse CSV content into structured ticket objects
   */
  static parseCSV(content: string): CSVTicket[] {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      return [];
    }

    // Parse header
    const headers = this.parseCSVLine(lines[0]);
    const tickets: CSVTicket[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const ticket: Partial<CSVTicket> = {};
      headers.forEach((header, index) => {
        const value = values[index] || '';
        (ticket as any)[header] = value;
      });

      tickets.push(ticket as CSVTicket);
    }

    return tickets;
  }

  /**
   * Parse a single CSV line, handling quoted fields
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    result.push(current.trim());

    return result;
  }

  /**
   * Filter tickets by status and assignee
   */
  static filterTicketsForAgent(
    tickets: CSVTicket[],
    status: string,
    assignee: string
  ): CSVTicket[] {
    return tickets.filter(
      (ticket) =>
        ticket.status === status &&
        (ticket.assignee === assignee || ticket.agent_type === assignee.toLowerCase())
    );
  }

  /**
   * Check if ticket dependencies are met
   */
  static areDependenciesMet(ticket: CSVTicket, allTickets: CSVTicket[]): boolean {
    if (!ticket.dependencies || ticket.dependencies.trim() === '') {
      return true;
    }

    // Split on commas first (CSV format), then handle whitespace-separated values
    const dependencyIds = ticket.dependencies
      .split(',')
      .flatMap((part) => part.split(/\s+/))
      .map((id) => id.trim())
      .filter((id) => id !== '');

    if (dependencyIds.length === 0) {
      return true;
    }

    // Check if all dependencies are completed
    for (const depId of dependencyIds) {
      const depTicket = allTickets.find((t) => t.id === depId);
      if (!depTicket || depTicket.status !== 'completed') {
        return false;
      }
    }

    return true;
  }

}

