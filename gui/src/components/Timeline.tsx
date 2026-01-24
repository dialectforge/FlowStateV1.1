/**
 * Timeline - Chronological activity stream for FlowState
 * Shows all changes, problems, solutions, learnings over time
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft,
  FileEdit,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  MessageSquare,
  Calendar,
  ChevronDown,
  Clock
} from 'lucide-react';
import { useAppStore, Change, Problem, Learning } from '../stores/appStore';
import { useDatabase } from '../hooks/useDatabase';

// ============================================================
// TYPES
// ============================================================

interface TimelineEvent {
  id: string;
  type: 'change' | 'problem' | 'problem_solved' | 'learning' | 'conversation';
  title: string;
  description?: string;
  timestamp: string;
  data: Change | Problem | Learning;
  componentName?: string;
}

type FilterType = 'all' | 'change' | 'problem' | 'learning';

// ============================================================
// TIMELINE EVENT CARD
// ============================================================

interface TimelineEventCardProps {
  event: TimelineEvent;
  isFirst: boolean;
  isLast: boolean;
}

function TimelineEventCard({ event, isFirst, isLast }: TimelineEventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getIcon = () => {
    switch (event.type) {
      case 'change':
        return <FileEdit className="w-4 h-4 text-purple-400" />;
      case 'problem':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'problem_solved':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'learning':
        return <Lightbulb className="w-4 h-4 text-yellow-400" />;
      case 'conversation':
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeLabel = () => {
    switch (event.type) {
      case 'change': return 'CHANGE';
      case 'problem': return 'PROBLEM';
      case 'problem_solved': return 'SOLVED';
      case 'learning': return 'LEARNING';
      case 'conversation': return 'CONVERSATION';
      default: return 'EVENT';
    }
  };

  const getTypeBgColor = () => {
    switch (event.type) {
      case 'change': return 'bg-purple-500/20 text-purple-400';
      case 'problem': return 'bg-red-500/20 text-red-400';
      case 'problem_solved': return 'bg-green-500/20 text-green-400';
      case 'learning': return 'bg-yellow-500/20 text-yellow-400';
      case 'conversation': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        {/* Top line */}
        {!isFirst && (
          <div className="w-0.5 h-4 bg-gray-700" />
        )}
        {isFirst && <div className="h-4" />}
        
        {/* Dot */}
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
          ${getTypeBgColor()}
        `}>
          {getIcon()}
        </div>
        
        {/* Bottom line */}
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gray-700 min-h-[40px]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div 
          className={`
            bg-gray-800 rounded-lg border border-gray-700 
            hover:border-gray-600 transition-colors cursor-pointer
            ${isExpanded ? 'ring-1 ring-blue-500/50' : ''}
          `}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded ${getTypeBgColor()}`}>
                  {getTypeLabel()}
                </span>
                {event.componentName && (
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                    {event.componentName}
                  </span>
                )}
              </div>
              <h4 className="font-medium">{event.title}</h4>
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span>{formatTime(event.timestamp)}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          </div>

          {/* Expanded content */}
          {isExpanded && event.description && (
            <div className="px-4 pb-3 border-t border-gray-700 pt-3">
              <p className="text-gray-300 text-sm">{event.description}</p>
              
              {/* Type-specific details */}
              {event.type === 'change' && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="bg-red-500/10 p-2 rounded">
                    <span className="text-xs text-gray-500 block mb-1">Old Value</span>
                    <code className="text-red-400 text-sm">
                      {(event.data as Change).old_value || '(empty)'}
                    </code>
                  </div>
                  <div className="bg-green-500/10 p-2 rounded">
                    <span className="text-xs text-gray-500 block mb-1">New Value</span>
                    <code className="text-green-400 text-sm">
                      {(event.data as Change).new_value || '(empty)'}
                    </code>
                  </div>
                </div>
              )}

              {event.type === 'problem' && (
                <div className="mt-3">
                  <span className={`
                    text-xs px-2 py-1 rounded
                    ${(event.data as Problem).severity === 'critical' ? 'bg-red-600 text-white' : ''}
                    ${(event.data as Problem).severity === 'high' ? 'bg-orange-500/20 text-orange-400' : ''}
                    ${(event.data as Problem).severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                    ${(event.data as Problem).severity === 'low' ? 'bg-gray-500/20 text-gray-400' : ''}
                  `}>
                    Severity: {(event.data as Problem).severity}
                  </span>
                </div>
              )}

              {event.type === 'learning' && (event.data as Learning).context && (
                <div className="mt-3 bg-gray-700/50 p-2 rounded">
                  <span className="text-xs text-gray-500 block mb-1">Context</span>
                  <p className="text-sm text-gray-300">{(event.data as Learning).context}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DATE SEPARATOR
// ============================================================

function DateSeparator({ date }: { date: string }) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return d.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="flex items-center gap-4 py-4">
      <div className="h-px flex-1 bg-gray-700" />
      <span className="text-sm font-medium text-gray-400 flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        {formatDate(date)}
      </span>
      <div className="h-px flex-1 bg-gray-700" />
    </div>
  );
}

// ============================================================
// MAIN TIMELINE
// ============================================================

export function Timeline() {
  const { 
    setCurrentView, 
    selectedProjectId, 
    projects,
    components,
    problems, 
    learnings, 
    changes 
  } = useAppStore();
  const { loadComponents, loadProblems, loadLearnings, loadChanges } = useDatabase();
  
  const [filter, setFilter] = useState<FilterType>('all');
  const [dateRange, setDateRange] = useState<number>(7); // days

  const currentProject = projects.find(p => p.id === selectedProjectId);

  // Load data
  useEffect(() => {
    if (selectedProjectId) {
      loadComponents(selectedProjectId);
      loadProblems(selectedProjectId);
      loadLearnings(selectedProjectId);
      loadChanges(selectedProjectId, dateRange * 24);
    }
  }, [selectedProjectId, dateRange]);

  // Build timeline events
  const events = useMemo(() => {
    const allEvents: TimelineEvent[] = [];

    // Add changes
    if (filter === 'all' || filter === 'change') {
      changes.forEach(c => {
        const comp = components.find(comp => comp.id === c.component_id);
        allEvents.push({
          id: `change-${c.id}`,
          type: 'change',
          title: `${c.field_name}: ${c.old_value || '∅'} → ${c.new_value || '∅'}`,
          description: c.reason,
          timestamp: c.created_at,
          data: c,
          componentName: comp?.name
        });
      });
    }

    // Add problems
    if (filter === 'all' || filter === 'problem') {
      problems.forEach(p => {
        const comp = components.find(comp => comp.id === p.component_id);
        allEvents.push({
          id: `problem-${p.id}`,
          type: p.status === 'solved' ? 'problem_solved' : 'problem',
          title: p.title,
          description: p.description,
          timestamp: p.status === 'solved' && p.solved_at ? p.solved_at : p.created_at,
          data: p,
          componentName: comp?.name
        });
      });
    }

    // Add learnings
    if (filter === 'all' || filter === 'learning') {
      learnings.forEach(l => {
        const comp = l.component_id ? components.find(comp => comp.id === l.component_id) : null;
        allEvents.push({
          id: `learning-${l.id}`,
          type: 'learning',
          title: l.insight.substring(0, 80) + (l.insight.length > 80 ? '...' : ''),
          description: l.insight,
          timestamp: l.created_at,
          data: l,
          componentName: comp?.name
        });
      });
    }

    // Sort by timestamp (newest first)
    allEvents.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return allEvents;
  }, [changes, problems, learnings, components, filter]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const groups: { date: string; events: TimelineEvent[] }[] = [];
    let currentDate = '';

    events.forEach(event => {
      const eventDate = new Date(event.timestamp).toDateString();
      if (eventDate !== currentDate) {
        currentDate = eventDate;
        groups.push({ date: event.timestamp, events: [event] });
      } else {
        groups[groups.length - 1].events.push(event);
      }
    });

    return groups;
  }, [events]);

  // Handle no project selected
  if (!selectedProjectId || !currentProject) {
    return (
      <div className="h-screen flex flex-col bg-gray-900">
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <p>Select a project from the dashboard first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div>
              <h1 className="text-xl font-semibold">{currentProject.name}</h1>
              <p className="text-sm text-gray-400">Activity Timeline</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            {/* Type filter */}
            <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
              {(['all', 'change', 'problem', 'learning'] as FilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`
                    px-3 py-1 rounded text-sm capitalize transition-colors
                    ${filter === f ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}
                  `}
                >
                  {f === 'all' ? 'All' : f + 's'}
                </button>
              ))}
            </div>

            {/* Date range */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value))}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>
      </header>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-4">
          {eventsByDate.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No activity yet</p>
              <p className="text-sm">Start tracking changes, problems, and learnings</p>
            </div>
          ) : (
            eventsByDate.map((group, groupIndex) => (
              <div key={group.date}>
                <DateSeparator date={group.date} />
                {group.events.map((event, eventIndex) => (
                  <TimelineEventCard
                    key={event.id}
                    event={event}
                    isFirst={groupIndex === 0 && eventIndex === 0}
                    isLast={groupIndex === eventsByDate.length - 1 && eventIndex === group.events.length - 1}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
