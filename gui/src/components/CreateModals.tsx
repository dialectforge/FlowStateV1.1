/**
 * CreateModals - Reusable modal components for creating new entities
 * Includes: CreateProjectModal, CreateComponentModal, CreateProblemModal
 */

import { useState, useEffect, useRef } from 'react';
import { useAppStore, Project, Component } from '../stores/appStore';
import { useDatabase } from '../hooks/useDatabase';

// ============================================================
// CREATE PROJECT MODAL
// ============================================================

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (project: Project) => void;
}

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const { createProject, loadProjects } = useDatabase();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const project = await createProject(name.trim(), description.trim() || undefined);
      await loadProjects();
      onSuccess?.(project);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        <div className="bg-gray-700/50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>📁</span> New Project
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Project Name *</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Awesome App"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || !name.trim()}
              className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors">
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// CREATE COMPONENT MODAL
// ============================================================

interface CreateComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  parentComponentId?: number;
  onSuccess?: (component: Component) => void;
}

export function CreateComponentModal({ isOpen, onClose, projectId, parentComponentId, onSuccess }: CreateComponentModalProps) {
  const { components } = useAppStore();
  const { createComponent, loadComponents } = useDatabase();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<number | null>(parentComponentId || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const projectComponents = components.filter(c => c.project_id === projectId);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setParentId(parentComponentId || null);
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, parentComponentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Component name is required');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const component = await createComponent(projectId, name.trim(), description.trim() || undefined, parentId || undefined);
      await loadComponents(projectId);
      onSuccess?.(component);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create component');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        <div className="bg-gray-700/50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>🔧</span> New Component
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Component Name *</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Auth Module"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this component do?"
              rows={3}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Parent Component (optional)</label>
            <select
              value={parentId || ''}
              onChange={(e) => setParentId(Number(e.target.value) || null)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">None (top-level)</option>
              {projectComponents.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || !name.trim()}
              className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors">
              {isSubmitting ? 'Creating...' : 'Create Component'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// CREATE PROBLEM MODAL
// ============================================================

interface CreateProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  defaultComponentId?: number;
  onSuccess?: () => void;
}

export function CreateProblemModal({ isOpen, onClose, projectId, defaultComponentId, onSuccess }: CreateProblemModalProps) {
  const { components } = useAppStore();
  const { logProblem, loadProblems } = useDatabase();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [componentId, setComponentId] = useState<number | null>(defaultComponentId || null);
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const projectComponents = components.filter(c => c.project_id === projectId);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setComponentId(defaultComponentId || null);
      setSeverity('medium');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultComponentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Problem title is required');
      return;
    }
    if (!componentId) {
      setError('Please select a component');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await logProblem(componentId, title.trim(), description.trim() || undefined, severity);
      await loadProblems(projectId);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to log problem');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        <div className="bg-gray-700/50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>🔴</span> Log Problem
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Problem Title *</label>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's the issue?"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Component *</label>
            <select
              value={componentId || ''}
              onChange={(e) => setComponentId(Number(e.target.value) || null)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select component...</option>
              {projectComponents.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="More details about the problem..."
              rows={3}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high', 'critical'] as const).map(s => (
                <button key={s} type="button" onClick={() => setSeverity(s)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    severity === s
                      ? s === 'low' ? 'bg-gray-500/30 text-gray-300 ring-1 ring-gray-500'
                      : s === 'medium' ? 'bg-yellow-500/30 text-yellow-300 ring-1 ring-yellow-500'
                      : s === 'high' ? 'bg-orange-500/30 text-orange-300 ring-1 ring-orange-500'
                      : 'bg-red-500/30 text-red-300 ring-1 ring-red-500'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || !title.trim() || !componentId}
              className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors">
              {isSubmitting ? 'Logging...' : 'Log Problem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// CONFIRM DIALOG
// ============================================================

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmColor?: 'red' | 'purple' | 'green';
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmColor = 'purple' }: ConfirmDialogProps) {
  if (!isOpen) return null;

  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    green: 'bg-green-600 hover:bg-green-700',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
          <p className="text-gray-400 mb-6">{message}</p>
          
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 font-medium transition-colors">
              Cancel
            </button>
            <button onClick={() => { onConfirm(); onClose(); }}
              className={`flex-1 py-2 px-4 ${colorClasses[confirmColor]} rounded-lg text-white font-medium transition-colors`}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
