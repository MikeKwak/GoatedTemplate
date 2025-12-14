'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';

interface Ticket {
  id: string;
  status: string;
  title: string;
  priority: string;
  assignee: string;
  dependencies: string;
  sprint: string;
  sprint_order: string;
  agent_type: string;
}

interface DashboardData {
  tickets: Ticket[];
  stats: {
    total: number;
    todo: number;
    in_progress: number;
    in_review: number;
    completed: number;
    byPriority: { high: number; medium: number; low: number };
    byAgent: { swe: number; qa: number; pm: number };
  };
  readyTickets: string[];
  queuedTickets: Array<{ id: string; title: string; status: string; agent: string }>;
  config: { maxConcurrentChats: number; pollInterval: number } | null;
  lastUpdated: string;
}

const getStatusBadgeVariant = (status: string): 'default' | 'success' | 'error' | 'warning' | 'secondary' => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'default';
    case 'in_review':
      return 'warning';
    case 'todo':
      return 'secondary';
    default:
      return 'default';
  }
};

const getPriorityBadgeVariant = (priority: string): 'default' | 'success' | 'error' | 'warning' | 'secondary' => {
  switch (priority) {
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
    default:
      return 'default';
  }
};

export default function AgentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [agentRunnerStatus, setAgentRunnerStatus] = useState<{ isRunning: boolean; processInfo: any } | null>(null);
  const [isControlling, setIsControlling] = useState(false);
  const { error: toastError, success: toastSuccess } = useToast();

  const fetchData = async () => {
    try {
      const response = await fetch('/api/agent-status');
      const json = await response.json();
      
      if (!response.ok) {
        const errorMsg = json.error || 'Failed to fetch data';
        const details = json.details || json.searchedPaths ? JSON.stringify(json, null, 2) : '';
        throw new Error(`${errorMsg}${details ? '\n\nDetails:\n' + details : ''}`);
      }
      
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Unknown error occurred');
      toastError('Failed to load dashboard', err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkAgentRunnerStatus = async () => {
    try {
      const response = await fetch('/api/agent-control');
      const json = await response.json();
      setAgentRunnerStatus(json);
    } catch (err) {
      // Ignore errors for status check
    }
  };

  const controlAgentRunner = async (action: 'start' | 'restart' | 'stop') => {
    setIsControlling(true);
    try {
      const response = await fetch('/api/agent-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await response.json();
      
      if (!response.ok) {
        toastError('Agent control failed', json.error);
      } else {
        toastSuccess('Agent runner updated', `Successfully ${action}ed the agent runner.`);
        setTimeout(() => {
          checkAgentRunnerStatus();
          fetchData();
        }, 1000);
      }
    } catch (err: any) {
      toastError('Agent control error', err.message);
    } finally {
      setIsControlling(false);
    }
  };

  useEffect(() => {
    fetchData();
    checkAgentRunnerStatus();
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchData();
        checkAgentRunnerStatus();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          <TableSkeleton rows={5} columns={7} />
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <Card className="border-error-200 bg-error-50">
          <CardHeader>
            <CardTitle className="text-error-900">Error Loading Dashboard</CardTitle>
            <CardDescription className="text-error-700">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-4 rounded text-left text-sm font-mono overflow-auto max-h-96 mb-4 border border-error-200">
              <pre className="whitespace-pre-wrap text-error-800">{error}</pre>
            </div>
            <Button onClick={fetchData} variant="primary">
              Retry
            </Button>
          </CardContent>
        </Card>
      </ProtectedRoute>
    );
  }

  if (!data) return null;

  const { tickets, stats, readyTickets, queuedTickets, config } = data;

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900">Agent Runner Dashboard</h1>
            <p className="text-secondary-600 mt-1">
              Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Toggle
              label="Auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <Button onClick={fetchData} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-secondary-600 mb-1">Total Tickets</div>
              <div className="text-3xl font-bold text-secondary-900">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-secondary-600 mb-1">To Do</div>
              <div className="text-3xl font-bold text-primary-600">{stats.todo}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-secondary-600 mb-1">In Progress</div>
              <div className="text-3xl font-bold text-warning-600">{stats.in_progress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-secondary-600 mb-1">Completed</div>
              <div className="text-3xl font-bold text-success-600">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Runner Control */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Agent Runner Control</CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${agentRunnerStatus?.isRunning ? 'bg-success-500 animate-pulse' : 'bg-secondary-400'}`}></div>
                  <span className="text-sm text-secondary-600">
                    {agentRunnerStatus?.isRunning ? 'Running' : 'Stopped'}
                  </span>
                  {agentRunnerStatus?.processInfo && (
                    <span className="text-xs text-secondary-500">
                      (PID: {agentRunnerStatus.processInfo.pid})
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {agentRunnerStatus?.isRunning ? (
                    <>
                      <Button
                        onClick={() => controlAgentRunner('restart')}
                        disabled={isControlling}
                        isLoading={isControlling}
                        variant="outline"
                        size="sm"
                      >
                        Restart
                      </Button>
                      <Button
                        onClick={() => controlAgentRunner('stop')}
                        disabled={isControlling}
                        isLoading={isControlling}
                        variant="destructive"
                        size="sm"
                      >
                        Stop
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => controlAgentRunner('start')}
                      disabled={isControlling}
                      isLoading={isControlling}
                      variant="primary"
                      size="sm"
                    >
                      Start Agent Runner
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Queue Status & Active Slots */}
        {config && (
          <Card>
            <CardHeader>
              <CardTitle>Queue Status & Active Slots</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Visual Slot Display */}
              <div>
                <div className="text-sm text-secondary-600 mb-3">
                  Active Chat Slots ({queuedTickets.length} / {config.maxConcurrentChats})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: config.maxConcurrentChats }).map((_, index) => {
                    const ticket = queuedTickets[index];
                    const isActive = ticket !== undefined;
                    return (
                      <Card
                        key={index}
                        className={isActive ? 'border-primary-500 bg-primary-50' : 'border-secondary-200'}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-secondary-600">Slot {index + 1}</span>
                            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-success-500 animate-pulse' : 'bg-secondary-300'}`}></div>
                          </div>
                          {isActive ? (
                            <div>
                              <code className="text-xs font-bold text-primary-700 mb-1 block">
                                {ticket.id}
                              </code>
                              <div className="text-xs text-secondary-700 truncate mb-1" title={ticket.title}>
                                {ticket.title}
                              </div>
                              <div className="text-xs text-secondary-500 mb-2">{ticket.agent}</div>
                              <Badge variant={getStatusBadgeVariant(ticket.status)}>
                                {ticket.status}
                              </Badge>
                            </div>
                          ) : (
                            <div className="text-xs text-secondary-400 text-center py-2">Available</div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Queue Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-secondary-200">
                <div>
                  <div className="text-sm text-secondary-600">Queue Status</div>
                  <div className="text-2xl font-bold mt-1">
                    {queuedTickets.length >= config.maxConcurrentChats ? (
                      <span className="text-warning-600">⏸️ Paused</span>
                    ) : (
                      <span className="text-success-600">✅ Processing</span>
                    )}
                  </div>
                  <div className="text-xs text-secondary-500 mt-1">
                    {queuedTickets.length} active, {config.maxConcurrentChats - queuedTickets.length} available
                  </div>
                </div>
                <div>
                  <div className="text-sm text-secondary-600">Ready to Start</div>
                  <div className="text-2xl font-bold text-success-600">{readyTickets.length}</div>
                  <div className="text-xs text-secondary-500 mt-1">Dependencies met</div>
                </div>
                <div>
                  <div className="text-sm text-secondary-600">Poll Interval</div>
                  <div className="text-2xl font-bold">{config.pollInterval / 1000}s</div>
                  <div className="text-xs text-secondary-500 mt-1">Check frequency</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tickets Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Tickets</CardTitle>
            <CardDescription>
              {tickets.length} total ticket{tickets.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <EmptyState
                title="No tickets found"
                description="There are no tickets in the system yet."
                icon={
                  <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
            ) : (
              <div className="rounded-md border border-secondary-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Sprint</TableHead>
                      <TableHead>Dependencies</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => {
                      const isReady = readyTickets.includes(ticket.id);
                      const deps = ticket.dependencies
                        ? ticket.dependencies.split(',').map(d => d.trim()).filter(Boolean)
                        : [];
                      
                      return (
                        <TableRow
                          key={ticket.id}
                          className={isReady && ticket.status === 'todo' ? 'bg-success-50' : ''}
                        >
                          <TableCell>
                            <code className="text-xs bg-secondary-100 px-2 py-1 rounded text-secondary-900">
                              {ticket.id}
                            </code>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{ticket.title}</div>
                            {isReady && ticket.status === 'todo' && (
                              <Badge variant="success" className="mt-1">Ready</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(ticket.status)}>
                              {ticket.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {ticket.priority && (
                              <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                                {ticket.priority}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-secondary-600">
                            {ticket.assignee || ticket.agent_type || '-'}
                          </TableCell>
                          <TableCell className="text-secondary-600">
                            {ticket.sprint || '-'}
                          </TableCell>
                          <TableCell>
                            {deps.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {deps.map((dep) => {
                                  const depTicket = tickets.find(t => t.id === dep);
                                  const isMet = depTicket && (depTicket.status === 'completed' || depTicket.status === 'in_review');
                                  return (
                                    <Badge
                                      key={dep}
                                      variant={isMet ? 'success' : 'error'}
                                      title={depTicket?.title || dep}
                                    >
                                      {dep.substring(0, 8)}...
                                    </Badge>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-secondary-400 text-xs">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
