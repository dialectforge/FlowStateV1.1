/**
 * TreeView - Hierarchical component view for FlowState
 * Shows project structure: Components → Changes/Problems/Solutions/Learnings
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FolderOpen,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  FileEdit,
  Plus,
  ArrowLeft
} from 'lucide-react';
import { useAppStore, Component, Problem, Learning, Change } from '../stores/appStore';
import { useDatabase } from '../hooks/useDatabase';

// ============================================================
// TYPES
// ============================================================

interface TreeNode {
  id: string;
  type: 'component' | 'problem' | 'solution' | 'learning' | 'change' | 'folder';
  label: string;
  data?: Component | Problem | Learning | Change;
  children?: TreeNode[];
  status?: string;
  icon?: React.ReactNode;
}

interface TreeItemProps {
  node: TreeNode;
  level: number;
  onSelect: (node: TreeNode) => void;
  selectedId: string | null;
}

// ============================================================
// TREE ITEM COMPONENT
// ============================================================

function TreeItem({ node, level, onSelect, selectedId }: TreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'open': return 'text-red-500';
      case 'investigating': return 'text-yellow-500';
      case 'solved': return 'text-green-500';
      case 'complete': return 'text-green-500';
      case 'in_progress': return 'text-blue-500';
      case 'planning': return 'text-purple-500';
      default: return 'text-gray-400';
    }
  };

  const getIcon = () => {
    if (node.icon) return node.icon;
    
    switch (node.type) {
      case 'component':
        return isExpanded ? 
          <FolderOpen className="w-4 h-4 text-blue-400" /> : 
          <Folder className="w-4 h-4 text-blue-400" />;
      case 'problem':
        return node.status === 'solved' ? 
          <CheckCircle className="w-4 h-4 text-green-500" /> :
          <AlertCircle className={`w-4 h-4 ${getStatusColor(node.status)}`} />;
      case 'learning':
        return <Lightbulb className="w-4 h-4 text-yellow-400" />;
      case 'change':
        return <FileEdit className="w-4 h-4 text-purple-400" />;
      case 'folder':
        return isExpanded ? 
          <FolderOpen className="w-4 h-4 text-gray-400" /> : 
          <Folder className="w-4 h-4 text-gray-400" />;
      default:
        return <Folder className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div>
      <div
        className={`
          flex items-center gap-1 py-1.5 px-2 rounded cursor-pointer
          hover:bg-gray-700/50 transition-colors
          ${isSelected ? 'bg-blue-600/30 border-l-2 border-blue-500' : ''}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => {
          if (hasChildren) setIsExpanded(!isExpanded);
          onSelect(node);
        }}
      >
        {/* Expand/collapse chevron */}
        <span className="w-4 flex-shrink-0">
          {hasChildren && (
            isExpanded ? 
              <ChevronDown className="w-4 h-4 text-gray-500" /> : 
              <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </span>

        {/* Icon */}
        <span className="flex-shrink-0">{getIcon()}</span>

        {/* Label */}
        <span className={`
          flex-1 truncate text-sm
          ${node.type === 'component' ? 'font-medium' : ''}
          ${node.status === 'solved' ? 'line-through text-gray-500' : ''}
        `}>
          {node.label}
        </span>

        {/* Status badge */}
        {node.status && node.type !== 'folder' && (
          <span className={`
            text-xs px-1.5 py-0.5 rounded-full
            ${node.status === 'open' ? 'bg-red-500/20 text-red-400' : ''}
            ${node.status === 'investigating' ? 'bg-yellow-500/20 text-yellow-400' : ''}
            ${node.status === 'solved' ? 'bg-green-500/20 text-green-400' : ''}
            ${node.status === 'complete' ? 'bg-green-500/20 text-green-400' : ''}
            ${node.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' : ''}
          `}>
            {node.status.replace('_', ' ')}
          </span>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children!.map(child => (
            <TreeItem 
              key={child.id} 
              node={child} 
              level={level + 1}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// DETAIL PANEL
// ============================================================

function DetailPanel({ node }: { node: TreeNode | null }) {
  if (!node) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Select an item to view details</p>
      </div>
    );
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="border-b border-gray-700 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`
            text-xs px-2 py-1 rounded uppercase font-medium
            ${node.type === 'component' ? 'bg-blue-500/20 text-blue-400' : ''}
            ${node.type === 'problem' ? 'bg-red-500/20 text-red-400' : ''}
            ${node.type === 'learning' ? 'bg-yellow-500/20 text-yellow-400' : ''}
            ${node.type === 'change' ? 'bg-purple-500/20 text-purple-400' : ''}
          `}>
            {node.type}
          </span>
          {node.status && (
            <span className={`
              text-xs px-2 py-1 rounded
              ${node.status === 'open' ? 'bg-red-500/20 text-red-400' : ''}
              ${node.status === 'solved' ? 'bg-green-500/20 text-green-400' : ''}
              ${node.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' : ''}
            `}>
              {node.status.replace('_', ' ')}
            </span>
          )}
        </div>
        <h2 className="text-xl font-semibold">{node.label}</h2>
      </div>

      {/* Content based on type */}
      {node.type === 'component' && node.data && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 uppercase">Description</label>
            <p className="text-gray-300">{(node.data as Component).description || 'No description'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 uppercase">Created</label>
              <p className="text-sm">{formatDate((node.data as Component).created_at)}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">Updated</label>
              <p className="text-sm">{formatDate((node.data as Component).updated_at)}</p>
            </div>
          </div>
        </div>
      )}

      {node.type === 'problem' && node.data && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 uppercase">Description</label>
            <p className="text-gray-300">{(node.data as Problem).description || 'No description'}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase">Severity</label>
            <span className={`
              ml-2 text-sm px-2 py-0.5 rounded
              ${(node.data as Problem).severity === 'critical' ? 'bg-red-600 text-white' : ''}
              ${(node.data as Problem).severity === 'high' ? 'bg-orange-500/20 text-orange-400' : ''}
              ${(node.data as Problem).severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : ''}
              ${(node.data as Problem).severity === 'low' ? 'bg-gray-500/20 text-gray-400' : ''}
            `}>
              {(node.data as Problem).severity}
            </span>
          </div>
          {(node.data as Problem).root_cause && (
            <div>
              <label className="text-xs text-gray-500 uppercase">Root Cause</label>
              <p className="text-gray-300">{(node.data as Problem).root_cause}</p>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 uppercase">Created</label>
            <p className="text-sm">{formatDate((node.data as Problem).created_at)}</p>
          </div>
        </div>
      )}

      {node.type === 'learning' && node.data && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 uppercase">Insight</label>
            <p className="text-gray-300">{(node.data as Learning).insight}</p>
          </div>
          {(node.data as Learning).context && (
            <div>
              <label className="text-xs text-gray-500 uppercase">Context</label>
              <p className="text-gray-300">{(node.data as Learning).context}</p>
            </div>
          )}
          <div className="flex gap-4">
            <div>
              <label className="text-xs text-gray-500 uppercase">Category</label>
              <p className="text-sm">{(node.data as Learning).category || 'General'}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">Source</label>
              <p className="text-sm">{(node.data as Learning).source}</p>
            </div>
          </div>
        </div>
      )}

      {node.type === 'change' && node.data && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 uppercase">Field</label>
            <p className="font-mono text-sm">{(node.data as Change).field_name}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 uppercase">Old Value</label>
              <p className="text-sm text-red-400 font-mono bg-red-500/10 p-2 rounded">
                {(node.data as Change).old_value || '(empty)'}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">New Value</label>
              <p className="text-sm text-green-400 font-mono bg-green-500/10 p-2 rounded">
                {(node.data as Change).new_value || '(empty)'}
              </p>
            </div>
          </div>
          {(node.data as Change).reason && (
            <div>
              <label className="text-xs text-gray-500 uppercase">Reason</label>
              <p className="text-gray-300">{(node.data as Change).reason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN TREE VIEW
// ============================================================

export function TreeView() {
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
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  const currentProject = projects.find(p => p.id === selectedProjectId);

  // Load data when project is selected
  useEffect(() => {
    if (selectedProjectId) {
      loadComponents(selectedProjectId);
      loadProblems(selectedProjectId);
      loadLearnings(selectedProjectId);
      loadChanges(selectedProjectId);
    }
  }, [selectedProjectId]);

  // Build tree structure
  const treeData = useMemo(() => {
    if (!selectedProjectId) return [];

    // Group problems by component
    const problemsByComponent = problems.reduce((acc, p) => {
      if (!acc[p.component_id]) acc[p.component_id] = [];
      acc[p.component_id].push(p);
      return acc;
    }, {} as Record<number, Problem[]>);

    // Group learnings by component
    const learningsByComponent = learnings.reduce((acc, l) => {
      const key = l.component_id || 0;
      if (!acc[key]) acc[key] = [];
      acc[key].push(l);
      return acc;
    }, {} as Record<number, Learning[]>);

    // Group changes by component
    const changesByComponent = changes.reduce((acc, c) => {
      if (!acc[c.component_id]) acc[c.component_id] = [];
      acc[c.component_id].push(c);
      return acc;
    }, {} as Record<number, Change[]>);

    // Build component tree with nested items
    const buildComponentNode = (comp: Component): TreeNode => {
      const compProblems = problemsByComponent[comp.id] || [];
      const compLearnings = learningsByComponent[comp.id] || [];
      const compChanges = changesByComponent[comp.id] || [];

      const children: TreeNode[] = [];

      // Add problems folder if any
      if (compProblems.length > 0) {
        children.push({
          id: `problems-${comp.id}`,
          type: 'folder',
          label: `Problems (${compProblems.length})`,
          icon: <AlertCircle className="w-4 h-4 text-red-400" />,
          children: compProblems.map(p => ({
            id: `problem-${p.id}`,
            type: 'problem' as const,
            label: p.title,
            data: p,
            status: p.status
          }))
        });
      }

      // Add learnings folder if any
      if (compLearnings.length > 0) {
        children.push({
          id: `learnings-${comp.id}`,
          type: 'folder',
          label: `Learnings (${compLearnings.length})`,
          icon: <Lightbulb className="w-4 h-4 text-yellow-400" />,
          children: compLearnings.map(l => ({
            id: `learning-${l.id}`,
            type: 'learning' as const,
            label: l.insight.substring(0, 50) + (l.insight.length > 50 ? '...' : ''),
            data: l
          }))
        });
      }

      // Add changes folder if any
      if (compChanges.length > 0) {
        children.push({
          id: `changes-${comp.id}`,
          type: 'folder',
          label: `Changes (${compChanges.length})`,
          icon: <FileEdit className="w-4 h-4 text-purple-400" />,
          children: compChanges.map(c => ({
            id: `change-${c.id}`,
            type: 'change' as const,
            label: `${c.field_name}: ${c.old_value || '∅'} → ${c.new_value || '∅'}`,
            data: c
          }))
        });
      }

      // Add child components
      const childComponents = components.filter(c => c.parent_component_id === comp.id);
      childComponents.forEach(child => {
        children.push(buildComponentNode(child));
      });

      return {
        id: `component-${comp.id}`,
        type: 'component',
        label: comp.name,
        data: comp,
        status: comp.status,
        children: children.length > 0 ? children : undefined
      };
    };

    // Get root components (no parent)
    const rootComponents = components.filter(c => 
      c.project_id === selectedProjectId && !c.parent_component_id
    );

    return rootComponents.map(buildComponentNode);
  }, [selectedProjectId, components, problems, learnings, changes]);

  // Handle no project selected
  if (!selectedProjectId || !currentProject) {
    return (
      <div className="h-screen flex flex-col">
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
              <p className="text-sm text-gray-400">Component Tree</p>
            </div>
          </div>
          
          {/* View switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('tree')}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg"
              title="Tree View"
            >
              🌳 Tree
            </button>
            <button
              onClick={() => setCurrentView('kanban')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
              title="Problem Board"
            >
              📋 Board
            </button>
            <button
              onClick={() => setCurrentView('timeline')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
              title="Timeline"
            >
              📅 Timeline
            </button>
            <button
              onClick={() => setCurrentView('story')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
              title="Project Story"
            >
              📖 Story
            </button>
            <button
              onClick={() => setCurrentView('architecture')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
              title="Architecture Diagram"
            >
              🏗️ Arch
            </button>
          </div>
          
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            Add Component
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tree panel */}
        <div className="w-1/2 border-r border-gray-700 overflow-y-auto">
          <div className="p-2">
            {treeData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No components yet</p>
                <p className="text-sm">Add your first component to get started</p>
              </div>
            ) : (
              treeData.map(node => (
                <TreeItem 
                  key={node.id} 
                  node={node} 
                  level={0}
                  onSelect={setSelectedNode}
                  selectedId={selectedNode?.id || null}
                />
              ))
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="w-1/2 overflow-y-auto bg-gray-800/50">
          <DetailPanel node={selectedNode} />
        </div>
      </div>
    </div>
  );
}
