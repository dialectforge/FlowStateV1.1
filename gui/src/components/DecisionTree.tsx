/**
 * DecisionTree - Visual problem-solving journey
 * Shows the tree of solution attempts with success/failure branches
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { getProblemTree, ProblemTree, SolutionAttempt } from '../hooks/useDatabase';

// ============================================================
// TYPES
// ============================================================

interface TreeNode {
  id: number;
  type: 'problem' | 'attempt';
  title: string;
  description?: string;
  outcome?: 'success' | 'failure' | 'partial' | 'abandoned' | 'pending';
  notes?: string;
  created_at: string;
  children: TreeNode[];
  x?: number;
  y?: number;
}

// Use ProblemTree from useDatabase directly

// ============================================================
// TREE LAYOUT CALCULATION
// ============================================================

const NODE_WIDTH = 280;
const NODE_HEIGHT = 120;
const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 80;

function calculateTreeLayout(node: TreeNode, x: number = 0, y: number = 0, depth: number = 0): TreeNode {
  node.x = x;
  node.y = y;
  
  if (node.children.length === 0) {
    return node;
  }
  
  const totalChildWidth = node.children.length * NODE_WIDTH + (node.children.length - 1) * HORIZONTAL_GAP;
  let childX = x - totalChildWidth / 2 + NODE_WIDTH / 2;
  const childY = y + NODE_HEIGHT + VERTICAL_GAP;
  
  node.children = node.children.map((child) => {
    const layoutChild = calculateTreeLayout(child, childX, childY, depth + 1);
    childX += NODE_WIDTH + HORIZONTAL_GAP;
    return layoutChild;
  });
  
  return node;
}

function getTreeBounds(node: TreeNode): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = node.x || 0;
  let maxX = (node.x || 0) + NODE_WIDTH;
  let minY = node.y || 0;
  let maxY = (node.y || 0) + NODE_HEIGHT;
  
  for (const child of node.children) {
    const childBounds = getTreeBounds(child);
    minX = Math.min(minX, childBounds.minX);
    maxX = Math.max(maxX, childBounds.maxX);
    minY = Math.min(minY, childBounds.minY);
    maxY = Math.max(maxY, childBounds.maxY);
  }
  
  return { minX, maxX, minY, maxY };
}

// ============================================================
// TREE NODE COMPONENT
// ============================================================

interface TreeNodeProps {
  node: TreeNode;
  onSelect: (node: TreeNode) => void;
  isSelected: boolean;
}

function TreeNodeComponent({ node, onSelect, isSelected }: TreeNodeProps) {
  const getOutcomeStyles = () => {
    switch (node.outcome) {
      case 'success':
        return 'border-green-500 bg-green-500/10';
      case 'failure':
        return 'border-red-500 bg-red-500/10';
      case 'partial':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'abandoned':
        return 'border-gray-500 bg-gray-500/10';
      case 'pending':
        return 'border-blue-500 bg-blue-500/10';
      default:
        return node.type === 'problem' 
          ? 'border-purple-500 bg-purple-500/10' 
          : 'border-gray-600 bg-gray-700';
    }
  };

  const getOutcomeIcon = () => {
    switch (node.outcome) {
      case 'success':
        return '✅';
      case 'failure':
        return '❌';
      case 'partial':
        return '⚠️';
      case 'abandoned':
        return '🚫';
      case 'pending':
        return '⏳';
      default:
        return node.type === 'problem' ? '🔴' : '💡';
    }
  };

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      {/* Connection lines to children */}
      {node.children.map((child) => (
        <line
          key={`line-${child.id}`}
          x1={NODE_WIDTH / 2}
          y1={NODE_HEIGHT}
          x2={(child.x || 0) - (node.x || 0) + NODE_WIDTH / 2}
          y2={(child.y || 0) - (node.y || 0)}
          stroke={child.outcome === 'success' ? '#22c55e' : child.outcome === 'failure' ? '#ef4444' : '#6b7280'}
          strokeWidth={2}
          strokeDasharray={child.outcome === 'pending' ? '5,5' : undefined}
        />
      ))}
      
      {/* Node box */}
      <foreignObject width={NODE_WIDTH} height={NODE_HEIGHT}>
        <div
          className={`h-full p-3 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 ${getOutcomeStyles()} ${isSelected ? 'ring-2 ring-white' : ''}`}
          onClick={() => onSelect(node)}
        >
          <div className="flex items-start gap-2">
            <span className="text-xl">{getOutcomeIcon()}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-white truncate">
                {node.title}
              </div>
              {node.description && (
                <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                  {node.description}
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                {new Date(node.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
}

// ============================================================
// DETAIL PANEL
// ============================================================

interface DetailPanelProps {
  node: TreeNode | null;
  solution?: {
    summary: string;
    key_insight?: string;
    code_snippet?: string;
  };
  onClose: () => void;
}

function DetailPanel({ node, solution, onClose }: DetailPanelProps) {
  if (!node) return null;

  return (
    <div className="absolute right-4 top-4 w-96 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
      <div className="bg-gray-700/50 px-4 py-3 flex items-center justify-between">
        <h3 className="font-medium">
          {node.type === 'problem' ? '🔴 Problem' : '💡 Attempt'} Details
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Title</label>
          <p className="text-white mt-1">{node.title}</p>
        </div>
        
        {node.description && (
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Description</label>
            <p className="text-gray-300 mt-1 text-sm">{node.description}</p>
          </div>
        )}
        
        {node.outcome && (
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Outcome</label>
            <div className="mt-1">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${
                node.outcome === 'success' ? 'bg-green-500/20 text-green-400' :
                node.outcome === 'failure' ? 'bg-red-500/20 text-red-400' :
                node.outcome === 'partial' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {node.outcome.charAt(0).toUpperCase() + node.outcome.slice(1)}
              </span>
            </div>
          </div>
        )}
        
        {node.notes && (
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Notes</label>
            <p className="text-gray-300 mt-1 text-sm">{node.notes}</p>
          </div>
        )}
        
        {solution && node.outcome === 'success' && (
          <div className="border-t border-gray-700 pt-4">
            <label className="text-xs text-green-400 uppercase tracking-wide">✅ Solution</label>
            <p className="text-white mt-2">{solution.summary}</p>
            
            {solution.key_insight && (
              <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <label className="text-xs text-green-400">Key Insight</label>
                <p className="text-green-300 mt-1 text-sm italic">"{solution.key_insight}"</p>
              </div>
            )}
            
            {solution.code_snippet && (
              <div className="mt-3">
                <label className="text-xs text-gray-500 uppercase tracking-wide">Code</label>
                <pre className="mt-1 p-3 bg-gray-900 rounded text-xs text-gray-300 overflow-x-auto">
                  {solution.code_snippet}
                </pre>
              </div>
            )}
          </div>
        )}
        
        <div className="text-xs text-gray-500">
          Created: {new Date(node.created_at).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function DecisionTree() {
  const { selectedProblemId, setCurrentView } = useAppStore();
  
  const [treeData, setTreeData] = useState<ProblemTree | null>(null);
  const [rootNode, setRootNode] = useState<TreeNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1200, height: 800 });
  const [zoom, setZoom] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Load problem tree data
  useEffect(() => {
    const loadTree = async () => {
      if (!selectedProblemId) return;
      
      setIsLoading(true);
      try {
        const data = await getProblemTree(selectedProblemId);
        setTreeData(data);
        
        // Build tree structure
        if (data && data.problem) {
          const buildTree = (): TreeNode => {
            const attemptMap = new Map<number | null, SolutionAttempt[]>();
            
            // Group attempts by parent
            for (const attempt of data.attempts || []) {
              const parentId = attempt.parent_attempt_id || null;
              if (!attemptMap.has(parentId)) {
                attemptMap.set(parentId, []);
              }
              attemptMap.get(parentId)!.push(attempt);
            }
            
            // Recursive build
            const buildNode = (attempt: SolutionAttempt): TreeNode => ({
              id: attempt.id,
              type: 'attempt',
              title: attempt.description.slice(0, 50) + (attempt.description.length > 50 ? '...' : ''),
              description: attempt.description,
              outcome: attempt.outcome,
              notes: attempt.notes,
              created_at: attempt.created_at,
              children: (attemptMap.get(attempt.id) || []).map(buildNode),
            });
            
            // Root node is the problem
            const root: TreeNode = {
              id: data.problem.id,
              type: 'problem',
              title: data.problem.title,
              description: data.problem.description,
              created_at: data.problem.created_at,
              children: (attemptMap.get(null) || []).map(buildNode),
            };
            
            return root;
          };
          
          const tree = buildTree();
          const layoutTree = calculateTreeLayout(tree, 600, 50);
          setRootNode(layoutTree);
          
          // Adjust viewBox to fit tree
          const bounds = getTreeBounds(layoutTree);
          const padding = 100;
          setViewBox({
            x: bounds.minX - padding,
            y: bounds.minY - padding,
            width: bounds.maxX - bounds.minX + padding * 2,
            height: bounds.maxY - bounds.minY + padding * 2,
          });
        }
      } catch (e) {
        console.error('Failed to load problem tree:', e);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTree();
  }, [selectedProblemId]);

  // Mouse handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    
    const dx = (e.clientX - panStart.x) / zoom;
    const dy = (e.clientY - panStart.y) / zoom;
    
    setViewBox(prev => ({
      ...prev,
      x: prev.x - dx,
      y: prev.y - dy,
    }));
    
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.25, Math.min(2, prev * delta)));
  };

  // Render tree recursively
  const renderNode = (node: TreeNode): React.JSX.Element => (
    <g key={node.id}>
      <TreeNodeComponent
        node={node}
        onSelect={setSelectedNode}
        isSelected={selectedNode?.id === node.id}
      />
      {node.children.map(renderNode)}
    </g>
  );

  // Export as SVG
  const handleExport = () => {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `problem-journey-${selectedProblemId}.svg`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentView('kanban')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-xl font-bold">Problem Journey</h1>
            {treeData?.problem && (
              <p className="text-sm text-gray-400">{treeData.problem.title}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Zoom controls */}
          <div className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-1">
            <button
              onClick={() => setZoom(prev => Math.max(0.25, prev - 0.25))}
              className="text-gray-400 hover:text-white"
            >
              −
            </button>
            <span className="text-sm text-gray-300 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(prev => Math.min(2, prev + 0.25))}
              className="text-gray-400 hover:text-white"
            >
              +
            </button>
          </div>
          
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
          >
            Export SVG
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-400">Loading problem journey...</div>
          </div>
        ) : !rootNode ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🌳</div>
              <h2 className="text-xl font-medium text-gray-300 mb-2">No Problem Selected</h2>
              <p className="text-gray-500 mb-4">
                Select a problem from the Kanban board to view its decision tree
              </p>
              <button
                onClick={() => setCurrentView('kanban')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
              >
                Go to Kanban Board
              </button>
            </div>
          </div>
        ) : (
          <svg
            ref={svgRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width / zoom} ${viewBox.height / zoom}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#374151" strokeWidth="0.5" />
              </pattern>
            </defs>
            
            {/* Background grid */}
            <rect x={viewBox.x - 1000} y={viewBox.y - 1000} width="5000" height="5000" fill="url(#grid)" />
            
            {/* Tree */}
            {renderNode(rootNode)}
          </svg>
        )}
        
        {/* Detail panel */}
        <DetailPanel
          node={selectedNode}
          solution={treeData?.solution}
          onClose={() => setSelectedNode(null)}
        />
        
        {/* Legend */}
        <div className="absolute left-4 bottom-4 bg-gray-800/90 backdrop-blur border border-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Legend</div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-purple-500"></span>
              <span className="text-gray-300">Problem</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-green-500"></span>
              <span className="text-gray-300">Success</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-red-500"></span>
              <span className="text-gray-300">Failure</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-yellow-500"></span>
              <span className="text-gray-300">Partial</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-blue-500"></span>
              <span className="text-gray-300">Pending</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
