/**
 * ArchitectureDiagram - Visual component relationship diagram
 * Auto-generates from project components with D3.js-like force layout
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore, Problem } from '../stores/appStore';

// ============================================================
// TYPES
// ============================================================

interface DiagramNode {
  id: number;
  name: string;
  description?: string;
  status: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  parent_id?: number;
  children: number[];
  problems: Problem[];
  depth: number;
}

interface DiagramLink {
  source: number;
  target: number;
  type: 'parent-child' | 'dependency';
}

// ============================================================
// FORCE SIMULATION (simplified D3-like physics)
// ============================================================

const REPULSION_STRENGTH = 5000;
const ATTRACTION_STRENGTH = 0.01;
const DAMPING = 0.9;
const CENTER_STRENGTH = 0.005;

function simulateForces(
  nodes: DiagramNode[],
  links: DiagramLink[],
  centerX: number,
  centerY: number
): DiagramNode[] {
  const updatedNodes = nodes.map(node => ({ ...node }));
  
  // Apply forces
  for (let i = 0; i < updatedNodes.length; i++) {
    const node = updatedNodes[i];
    let fx = 0;
    let fy = 0;
    
    // Repulsion from other nodes
    for (let j = 0; j < updatedNodes.length; j++) {
      if (i === j) continue;
      const other = updatedNodes[j];
      const dx = node.x - other.x;
      const dy = node.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = REPULSION_STRENGTH / (dist * dist);
      fx += (dx / dist) * force;
      fy += (dy / dist) * force;
    }
    
    // Attraction to linked nodes
    for (const link of links) {
      let other: DiagramNode | undefined;
      if (link.source === node.id) {
        other = updatedNodes.find(n => n.id === link.target);
      } else if (link.target === node.id) {
        other = updatedNodes.find(n => n.id === link.source);
      }
      
      if (other) {
        const adx = other.x - node.x;
        const ady = other.y - node.y;
        fx += adx * ATTRACTION_STRENGTH;
        fy += ady * ATTRACTION_STRENGTH;
      }
    }
    
    // Center gravity
    fx += (centerX - node.x) * CENTER_STRENGTH;
    fy += (centerY - node.y) * CENTER_STRENGTH;
    
    // Update velocity with damping
    node.vx = (node.vx + fx) * DAMPING;
    node.vy = (node.vy + fy) * DAMPING;
    
    // Update position
    node.x += node.vx;
    node.y += node.vy;
  }
  
  return updatedNodes;
}

// ============================================================
// NODE COMPONENT
// ============================================================

interface NodeComponentProps {
  node: DiagramNode;
  isSelected: boolean;
  onSelect: (node: DiagramNode) => void;
  onDragStart: (node: DiagramNode, e: React.MouseEvent) => void;
}

function NodeComponent({ node, isSelected, onSelect, onDragStart }: NodeComponentProps) {
  const getStatusColor = () => {
    switch (node.status) {
      case 'complete': return 'border-green-500 bg-green-500/10';
      case 'in_progress': return 'border-blue-500 bg-blue-500/10';
      case 'testing': return 'border-yellow-500 bg-yellow-500/10';
      case 'planning': return 'border-purple-500 bg-purple-500/10';
      case 'deprecated': return 'border-gray-500 bg-gray-500/10';
      default: return 'border-gray-600 bg-gray-700';
    }
  };

  const getStatusIcon = () => {
    switch (node.status) {
      case 'complete': return '✅';
      case 'in_progress': return '🔨';
      case 'testing': return '🧪';
      case 'planning': return '📋';
      case 'deprecated': return '📦';
      default: return '📁';
    }
  };

  const hasProblems = node.problems.length > 0;
  const openProblems = node.problems.filter(p => p.status === 'open' || p.status === 'investigating');

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      <foreignObject 
        width={node.width} 
        height={node.height}
        style={{ overflow: 'visible' }}
      >
        <div
          className={`p-3 rounded-xl border-2 cursor-move transition-shadow ${getStatusColor()} ${
            isSelected ? 'ring-2 ring-white shadow-lg shadow-purple-500/20' : ''
          } ${hasProblems ? 'ring-1 ring-red-500/50' : ''}`}
          onClick={() => onSelect(node)}
          onMouseDown={(e) => onDragStart(node, e)}
          style={{ width: node.width, height: node.height }}
        >
          <div className="flex items-start gap-2">
            <span className="text-xl">{getStatusIcon()}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-white truncate">{node.name}</div>
              {node.description && (
                <div className="text-xs text-gray-400 mt-1 line-clamp-2">{node.description}</div>
              )}
            </div>
          </div>
          
          {/* Problem indicator */}
          {openProblems.length > 0 && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
              {openProblems.length}
            </div>
          )}
          
          {/* Children count */}
          {node.children.length > 0 && (
            <div className="absolute -bottom-2 right-2 px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
              {node.children.length} sub
            </div>
          )}
        </div>
      </foreignObject>
    </g>
  );
}

// ============================================================
// DETAIL PANEL
// ============================================================

interface DetailPanelProps {
  node: DiagramNode | null;
  onClose: () => void;
}

function DetailPanel({ node, onClose }: DetailPanelProps) {
  if (!node) return null;

  return (
    <div className="absolute right-4 top-4 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
      <div className="bg-gray-700/50 px-4 py-3 flex items-center justify-between">
        <h3 className="font-medium">Component Details</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Name</label>
          <p className="text-white mt-1 font-medium">{node.name}</p>
        </div>
        
        {node.description && (
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Description</label>
            <p className="text-gray-300 mt-1 text-sm">{node.description}</p>
          </div>
        )}
        
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Status</label>
          <div className="mt-1">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${
              node.status === 'complete' ? 'bg-green-500/20 text-green-400' :
              node.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
              node.status === 'testing' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {node.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Hierarchy</label>
          <p className="text-gray-300 mt-1 text-sm">
            Depth: {node.depth} • {node.children.length} children
          </p>
        </div>
        
        {node.problems.length > 0 && (
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">
              Problems ({node.problems.length})
            </label>
            <div className="mt-2 space-y-2">
              {node.problems.map(problem => (
                <div 
                  key={problem.id}
                  className={`p-2 rounded text-sm ${
                    problem.status === 'solved' 
                      ? 'bg-green-500/10 border border-green-500/30' 
                      : 'bg-red-500/10 border border-red-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{problem.status === 'solved' ? '✅' : '🔴'}</span>
                    <span className="text-gray-300">{problem.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function ArchitectureDiagram() {
  const { selectedProjectId, projects, components, problems, setCurrentView } = useAppStore();
  
  const [nodes, setNodes] = useState<DiagramNode[]>([]);
  const [links, setLinks] = useState<DiagramLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<DiagramNode | null>(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const [viewBox, setViewBox] = useState({ x: -400, y: -300, width: 1200, height: 800 });
  const [zoom, setZoom] = useState(1);
  const [draggedNode, setDraggedNode] = useState<DiagramNode | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  const project = projects.find(p => p.id === selectedProjectId);

  // Initialize nodes from components
  useEffect(() => {
    if (!selectedProjectId) return;
    
    const projectComponents = components.filter(c => c.project_id === selectedProjectId);
    const projectProblems = problems;
    
    // Build nodes
    const newNodes: DiagramNode[] = projectComponents.map((comp, index) => {
      // Find children
      const children = projectComponents
        .filter(c => c.parent_component_id === comp.id)
        .map(c => c.id);
      
      // Find depth
      let depth = 0;
      let parent = comp.parent_component_id;
      while (parent) {
        depth++;
        const parentComp = projectComponents.find(c => c.id === parent);
        parent = parentComp?.parent_component_id;
      }
      
      // Find problems for this component
      const compProblems = projectProblems.filter(p => p.component_id === comp.id);
      
      // Initial position in a circle
      const angle = (index / projectComponents.length) * Math.PI * 2;
      const radius = 200 + depth * 100;
      
      return {
        id: comp.id,
        name: comp.name,
        description: comp.description,
        status: comp.status,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        width: 180,
        height: 80,
        parent_id: comp.parent_component_id,
        children,
        problems: compProblems,
        depth,
      };
    });
    
    // Build links (parent-child relationships)
    const newLinks: DiagramLink[] = [];
    for (const node of newNodes) {
      if (node.parent_id) {
        newLinks.push({
          source: node.parent_id,
          target: node.id,
          type: 'parent-child',
        });
      }
    }
    
    setNodes(newNodes);
    setLinks(newLinks);
    setIsSimulating(true);
  }, [selectedProjectId, components, problems]);

  // Force simulation loop
  useEffect(() => {
    if (!isSimulating || nodes.length === 0 || draggedNode) return;
    
    let iterations = 0;
    const maxIterations = 300;
    
    const simulate = () => {
      if (iterations >= maxIterations) {
        setIsSimulating(false);
        return;
      }
      
      setNodes(prevNodes => {
        const centerX = 0;
        const centerY = 0;
        return simulateForces(prevNodes, links, centerX, centerY);
      });
      
      iterations++;
      animationRef.current = requestAnimationFrame(simulate);
    };
    
    animationRef.current = requestAnimationFrame(simulate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSimulating, nodes.length, links, draggedNode]);

  // Node drag handlers
  const handleDragStart = (node: DiagramNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggedNode(node);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggedNode) {
      const svg = svgRef.current;
      if (!svg) return;
      
      const rect = svg.getBoundingClientRect();
      const scale = viewBox.width / rect.width / zoom;
      
      const x = viewBox.x + (e.clientX - rect.left) * scale - draggedNode.width / 2;
      const y = viewBox.y + (e.clientY - rect.top) * scale - draggedNode.height / 2;
      
      setNodes(prevNodes => 
        prevNodes.map(n => 
          n.id === draggedNode.id 
            ? { ...n, x, y, vx: 0, vy: 0 } 
            : n
        )
      );
    } else if (isPanning) {
      const dx = (e.clientX - panStart.x) / zoom;
      const dy = (e.clientY - panStart.y) / zoom;
      
      setViewBox(prev => ({
        ...prev,
        x: prev.x - dx,
        y: prev.y - dy,
      }));
      
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [draggedNode, isPanning, panStart, viewBox, zoom]);

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
    setIsPanning(false);
  }, []);

  const handlePanStart = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as Element).tagName === 'rect') {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.25, Math.min(3, prev * delta)));
  };

  // Export SVG
  const handleExport = () => {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.name || 'architecture'}-diagram.svg`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  // Reset simulation
  const handleReset = () => {
    setIsSimulating(true);
  };

  if (!project) {
    return (
      <div className="h-screen flex flex-col bg-gray-900">
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🏗️</div>
            <h2 className="text-xl font-medium text-gray-300 mb-2">No Project Selected</h2>
            <p className="text-gray-500 mb-4">Select a project to view its architecture</p>
            <button
              onClick={() => setCurrentView('dashboard')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              🏗️ Architecture: {project.name}
            </h1>
            <p className="text-sm text-gray-400">{nodes.length} components</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Simulation status */}
          <div className={`text-sm ${isSimulating ? 'text-yellow-400' : 'text-green-400'}`}>
            {isSimulating ? '⏳ Simulating...' : '✅ Stable'}
          </div>
          
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
              onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
              className="text-gray-400 hover:text-white"
            >
              +
            </button>
          </div>
          
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
          >
            Reset Layout
          </button>
          
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
        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📦</div>
              <h2 className="text-xl font-medium text-gray-300 mb-2">No Components Yet</h2>
              <p className="text-gray-500">Add components to see the architecture diagram</p>
            </div>
          </div>
        ) : (
          <svg
            ref={svgRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width / zoom} ${viewBox.height / zoom}`}
            onMouseDown={handlePanStart}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <defs>
              <pattern id="arch-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1f2937" strokeWidth="0.5" />
              </pattern>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
              </marker>
            </defs>
            
            {/* Background grid */}
            <rect 
              x={viewBox.x - 2000} 
              y={viewBox.y - 2000} 
              width="6000" 
              height="6000" 
              fill="url(#arch-grid)" 
            />
            
            {/* Links */}
            {links.map(link => {
              const source = nodes.find(n => n.id === link.source);
              const target = nodes.find(n => n.id === link.target);
              if (!source || !target) return null;
              
              return (
                <line
                  key={`${link.source}-${link.target}`}
                  x1={source.x + source.width / 2}
                  y1={source.y + source.height}
                  x2={target.x + target.width / 2}
                  y2={target.y}
                  stroke="#4b5563"
                  strokeWidth={2}
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
            
            {/* Nodes */}
            {nodes.map(node => (
              <NodeComponent
                key={node.id}
                node={node}
                isSelected={selectedNode?.id === node.id}
                onSelect={setSelectedNode}
                onDragStart={handleDragStart}
              />
            ))}
          </svg>
        )}
        
        {/* Detail panel */}
        <DetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
        
        {/* Legend */}
        <div className="absolute left-4 bottom-4 bg-gray-800/90 backdrop-blur border border-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Status Legend</div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded border-2 border-green-500"></span>
              <span className="text-gray-300">Complete</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded border-2 border-blue-500"></span>
              <span className="text-gray-300">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded border-2 border-yellow-500"></span>
              <span className="text-gray-300">Testing</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded border-2 border-purple-500"></span>
              <span className="text-gray-300">Planning</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-700 text-xs text-gray-500">
            Drag nodes to reposition • Scroll to zoom
          </div>
        </div>
      </div>
    </div>
  );
}
