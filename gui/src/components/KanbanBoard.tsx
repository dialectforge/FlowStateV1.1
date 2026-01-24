/**
 * KanbanBoard - Drag-and-drop problem management for FlowState
 * Columns: Open, Investigating, Blocked, Solved
 */

import { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  AlertCircle,
  Search as SearchIcon,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  PauseCircle
} from 'lucide-react';
import { useAppStore, Problem, Component } from '../stores/appStore';
import { useDatabase } from '../hooks/useDatabase';

// ============================================================
// TYPES
// ============================================================

type ProblemStatus = 'open' | 'investigating' | 'blocked' | 'solved' | 'wont_fix';

interface Column {
  id: ProblemStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const COLUMNS: Column[] = [
  { 
    id: 'open', 
    title: 'Open', 
    icon: <AlertCircle className="w-4 h-4" />, 
    color: 'text-red-400',
    bgColor: 'bg-red-500/10'
  },
  { 
    id: 'investigating', 
    title: 'Investigating', 
    icon: <SearchIcon className="w-4 h-4" />, 
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10'
  },
  { 
    id: 'blocked', 
    title: 'Blocked', 
    icon: <PauseCircle className="w-4 h-4" />, 
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10'
  },
  { 
    id: 'solved', 
    title: 'Solved', 
    icon: <CheckCircle className="w-4 h-4" />, 
    color: 'text-green-400',
    bgColor: 'bg-green-500/10'
  },
];

// ============================================================
// PROBLEM CARD
// ============================================================

interface ProblemCardProps {
  problem: Problem;
  component?: Component;
  onDragStart: (e: React.DragEvent, problem: Problem) => void;
  onClick: (problem: Problem) => void;
}

function ProblemCard({ problem, component, onDragStart, onClick }: ProblemCardProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'low': return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, problem)}
      onClick={() => onClick(problem)}
      className={`
        p-3 rounded-lg cursor-pointer
        bg-gray-800 hover:bg-gray-750 
        border border-gray-700 hover:border-gray-600
        transition-all duration-200
        hover:shadow-lg hover:shadow-black/20
        active:scale-[0.98]
      `}
    >
      {/* Title */}
      <h4 className="font-medium text-sm mb-2 line-clamp-2">{problem.title}</h4>

      {/* Component tag */}
      {component && (
        <div className="mb-2">
          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
            {component.name}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <span className={`px-1.5 py-0.5 rounded ${getSeverityColor(problem.severity)}`}>
          {problem.severity}
        </span>
        <span className="text-gray-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDate(problem.created_at)}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// KANBAN COLUMN
// ============================================================

interface KanbanColumnProps {
  column: Column;
  problems: Problem[];
  components: Component[];
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: ProblemStatus) => void;
  onDragStart: (e: React.DragEvent, problem: Problem) => void;
  onCardClick: (problem: Problem) => void;
}

function KanbanColumn({ 
  column, 
  problems, 
  components,
  onDragOver, 
  onDrop, 
  onDragStart,
  onCardClick 
}: KanbanColumnProps) {
  const getComponent = (componentId: number) => 
    components.find(c => c.id === componentId);

  return (
    <div 
      className="flex-1 min-w-[280px] max-w-[350px]"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, column.id)}
    >
      {/* Column header */}
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-t-lg
        ${column.bgColor} border-b border-gray-700
      `}>
        <span className={column.color}>{column.icon}</span>
        <h3 className={`font-medium ${column.color}`}>{column.title}</h3>
        <span className={`
          ml-auto text-xs px-2 py-0.5 rounded-full
          ${column.bgColor} ${column.color}
        `}>
          {problems.length}
        </span>
      </div>

      {/* Cards container */}
      <div className={`
        min-h-[400px] p-2 space-y-2 rounded-b-lg
        bg-gray-800/30 border border-t-0 border-gray-700
      `}>
        {problems.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No problems
          </div>
        ) : (
          problems.map(problem => (
            <ProblemCard
              key={problem.id}
              problem={problem}
              component={getComponent(problem.component_id)}
              onDragStart={onDragStart}
              onClick={onCardClick}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// PROBLEM DETAIL MODAL
// ============================================================

interface ProblemDetailModalProps {
  problem: Problem;
  component?: Component;
  onClose: () => void;
  onStatusChange: (status: ProblemStatus) => void;
}

function ProblemDetailModal({ problem, component, onClose, onStatusChange }: ProblemDetailModalProps) {
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {component && (
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                  {component.name}
                </span>
              )}
              <span className={`
                text-xs px-2 py-0.5 rounded
                ${problem.status === 'open' ? 'bg-red-500/20 text-red-400' : ''}
                ${problem.status === 'investigating' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                ${problem.status === 'blocked' ? 'bg-orange-500/20 text-orange-400' : ''}
                ${problem.status === 'solved' ? 'bg-green-500/20 text-green-400' : ''}
              `}>
                {problem.status}
              </span>
            </div>
            <h2 className="text-xl font-semibold">{problem.title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <XCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto max-h-[50vh]">
          {/* Description */}
          <div>
            <label className="text-xs text-gray-500 uppercase block mb-1">Description</label>
            <p className="text-gray-300">{problem.description || 'No description provided'}</p>
          </div>

          {/* Severity */}
          <div>
            <label className="text-xs text-gray-500 uppercase block mb-1">Severity</label>
            <span className={`
              inline-block px-2 py-1 rounded text-sm
              ${problem.severity === 'critical' ? 'bg-red-600 text-white' : ''}
              ${problem.severity === 'high' ? 'bg-orange-500/20 text-orange-400' : ''}
              ${problem.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : ''}
              ${problem.severity === 'low' ? 'bg-gray-500/20 text-gray-400' : ''}
            `}>
              {problem.severity}
            </span>
          </div>

          {/* Root cause if solved */}
          {problem.root_cause && (
            <div>
              <label className="text-xs text-gray-500 uppercase block mb-1">Root Cause</label>
              <p className="text-gray-300 bg-gray-700/50 p-3 rounded">{problem.root_cause}</p>
            </div>
          )}

          {/* Dates */}
          <div className="flex gap-8">
            <div>
              <label className="text-xs text-gray-500 uppercase block mb-1">Created</label>
              <p className="text-sm">{new Date(problem.created_at).toLocaleString()}</p>
            </div>
            {problem.solved_at && (
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-1">Solved</label>
                <p className="text-sm">{new Date(problem.solved_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Move to:</span>
            {COLUMNS.filter(c => c.id !== problem.status).map(col => (
              <button
                key={col.id}
                onClick={() => onStatusChange(col.id)}
                className={`
                  flex items-center gap-1 px-3 py-1.5 rounded text-sm
                  ${col.bgColor} ${col.color} hover:opacity-80 transition-opacity
                `}
              >
                {col.icon}
                {col.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN KANBAN BOARD
// ============================================================

export function KanbanBoard() {
  const { 
    setCurrentView, 
    selectedProjectId, 
    projects,
    components, 
    problems,
    setProblems 
  } = useAppStore();
  const { loadComponents, loadProblems } = useDatabase();
  
  const [filterComponent, setFilterComponent] = useState<number | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [draggedProblem, setDraggedProblem] = useState<Problem | null>(null);

  const currentProject = projects.find(p => p.id === selectedProjectId);

  // Load data
  useEffect(() => {
    if (selectedProjectId) {
      loadComponents(selectedProjectId);
      loadProblems(selectedProjectId);
    }
  }, [selectedProjectId]);

  // Filter problems
  const filteredProblems = problems.filter(p => {
    if (filterComponent && p.component_id !== filterComponent) return false;
    if (filterSeverity && p.severity !== filterSeverity) return false;
    return true;
  });

  // Group by status
  const problemsByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = filteredProblems.filter(p => p.status === col.id);
    return acc;
  }, {} as Record<ProblemStatus, Problem[]>);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, problem: Problem) => {
    setDraggedProblem(problem);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: ProblemStatus) => {
    e.preventDefault();
    if (!draggedProblem || draggedProblem.status === newStatus) return;

    // Optimistic update
    const updatedProblems = problems.map(p => 
      p.id === draggedProblem.id ? { ...p, status: newStatus } : p
    );
    setProblems(updatedProblems);

    // TODO: Call API to persist change
    // await updateProblemStatus(draggedProblem.id, newStatus);

    setDraggedProblem(null);
  };

  const handleStatusChange = (newStatus: ProblemStatus) => {
    if (!selectedProblem) return;

    const updatedProblems = problems.map(p => 
      p.id === selectedProblem.id ? { ...p, status: newStatus } : p
    );
    setProblems(updatedProblems);
    setSelectedProblem({ ...selectedProblem, status: newStatus });
  };

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
              <p className="text-sm text-gray-400">Problem Board</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            {/* Component filter */}
            <select
              value={filterComponent || ''}
              onChange={(e) => setFilterComponent(e.target.value ? Number(e.target.value) : null)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">All Components</option>
              {components.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Severity filter */}
            <select
              value={filterSeverity || ''}
              onChange={(e) => setFilterSeverity(e.target.value || null)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Add problem button */}
            <button className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-sm">
              <Plus className="w-4 h-4" />
              New Problem
            </button>
          </div>
        </div>
      </header>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 min-w-max">
          {COLUMNS.map(column => (
            <KanbanColumn
              key={column.id}
              column={column}
              problems={problemsByStatus[column.id] || []}
              components={components}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragStart={handleDragStart}
              onCardClick={setSelectedProblem}
            />
          ))}
        </div>
      </div>

      {/* Problem detail modal */}
      {selectedProblem && (
        <ProblemDetailModal
          problem={selectedProblem}
          component={components.find(c => c.id === selectedProblem.component_id)}
          onClose={() => setSelectedProblem(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
