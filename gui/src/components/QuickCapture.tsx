/**
 * QuickCapture - Global hotkey quick input widget
 * Fast entry for problems, learnings, todos, and notes
 * Triggered by ⌘+Shift+M (Mac) or Ctrl+Shift+M (Windows)
 */

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { useDatabase } from '../hooks/useDatabase';

type CaptureType = 'problem' | 'learning' | 'todo' | 'change';

interface QuickCaptureProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickCapture({ isOpen, onClose }: QuickCaptureProps) {
  const { projects, components, selectedProjectId } = useAppStore();
  const { loadProjects, loadComponents, logProblem, logLearning, addTodo, logChange } = useDatabase();
  
  const [captureType, setCaptureType] = useState<CaptureType>('problem');
  const [projectId, setProjectId] = useState<number | null>(selectedProjectId);
  const [componentId, setComponentId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [category, setCategory] = useState<string>('pattern');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
      if (projectId) loadComponents(projectId);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    if (projectId) {
      loadComponents(projectId);
      setComponentId(null);
    }
  }, [projectId]);

  const projectComponents = components.filter(c => c.project_id === projectId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, title, projectId, componentId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSeverity('medium');
    setPriority('medium');
    setCategory('pattern');
  };

  const handleSubmit = async () => {
    if (!title.trim() || !projectId) return;
    setIsSubmitting(true);
    try {
      if (captureType === 'problem') {
        if (!componentId) { alert('Please select a component'); return; }
        await logProblem(componentId, title, description, severity);
      } else if (captureType === 'learning') {
        await logLearning(projectId, title, category, description, componentId || undefined);
      } else if (captureType === 'todo') {
        await addTodo(projectId, title, description, priority, componentId || undefined);
      } else if (captureType === 'change') {
        if (!componentId) { alert('Please select a component'); return; }
        await logChange(componentId, 'manual', '', title, 'other', description);
      }
      setShowSuccess(true);
      resetForm();
      setTimeout(() => { setShowSuccess(false); onClose(); }, 1500);
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeConfigs = {
    problem: { icon: '🔴', title: 'Log Problem', placeholder: 'What went wrong?' },
    learning: { icon: '💡', title: 'Log Learning', placeholder: 'What did you learn?' },
    todo: { icon: '📋', title: 'Add Todo', placeholder: 'What needs to be done?' },
    change: { icon: '📝', title: 'Log Change', placeholder: 'What changed?' },
  };
  const config = typeConfigs[captureType];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm">
      <div ref={modalRef} className={`w-full max-w-lg bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden ${showSuccess ? 'scale-95 opacity-50' : ''}`}>
        {showSuccess && (
          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center z-10">
            <div className="text-center"><div className="text-5xl mb-2">✅</div><div className="text-green-400 font-medium">Saved!</div></div>
          </div>
        )}

        <div className="bg-gray-700/50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{config.icon}</span>
            <span className="font-medium">{config.title}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <kbd className="px-1.5 py-0.5 bg-gray-600 rounded text-xs">⌘</kbd>+<kbd className="px-1.5 py-0.5 bg-gray-600 rounded text-xs">Enter</kbd>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            {(['problem', 'learning', 'todo', 'change'] as CaptureType[]).map((type, i) => (
              <button key={type} onClick={() => setCaptureType(type)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  captureType === type
                    ? type === 'problem' ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50'
                    : type === 'learning' ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/50'
                    : type === 'todo' ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50'
                    : 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/50'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}>
                {i + 1}. {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Project</label>
            <select value={projectId || ''} onChange={(e) => setProjectId(Number(e.target.value) || null)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">Select project...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {(captureType === 'problem' || captureType === 'change' || captureType === 'learning') && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">
                Component {captureType !== 'learning' && <span className="text-red-400">*</span>}
              </label>
              <select value={componentId || ''} onChange={(e) => setComponentId(Number(e.target.value) || null)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" disabled={!projectId}>
                <option value="">{projectId ? 'Select component...' : 'Select project first'}</option>
                {projectComponents.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">{captureType === 'learning' ? 'Insight' : 'Title'}</label>
            <input ref={inputRef} type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={config.placeholder}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">{captureType === 'learning' ? 'Context' : 'Description'} (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add more details..." rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>

          {captureType === 'problem' && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Severity</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high', 'critical'] as const).map(s => (
                  <button key={s} onClick={() => setSeverity(s)}
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
          )}

          {captureType === 'todo' && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Priority</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high', 'critical'] as const).map(p => (
                  <button key={p} onClick={() => setPriority(p)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      priority === p
                        ? p === 'low' ? 'bg-gray-500/30 text-gray-300 ring-1 ring-gray-500'
                        : p === 'medium' ? 'bg-blue-500/30 text-blue-300 ring-1 ring-blue-500'
                        : p === 'high' ? 'bg-orange-500/30 text-orange-300 ring-1 ring-orange-500'
                        : 'bg-red-500/30 text-red-300 ring-1 ring-red-500'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {captureType === 'learning' && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="pattern">Pattern</option>
                <option value="gotcha">Gotcha</option>
                <option value="best_practice">Best Practice</option>
                <option value="tool_tip">Tool Tip</option>
                <option value="architecture">Architecture</option>
                <option value="performance">Performance</option>
                <option value="security">Security</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 font-medium transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={!title.trim() || !projectId || isSubmitting}
              className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors">
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
