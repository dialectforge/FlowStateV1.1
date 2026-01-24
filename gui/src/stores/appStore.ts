/**
 * FlowState App Store - Global state management with Zustand
 */

import { create } from 'zustand';

// ============================================================
// TYPES
// ============================================================

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Component {
  id: number;
  project_id: number;
  parent_component_id?: number;
  name: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'testing' | 'complete' | 'deprecated';
  created_at: string;
  updated_at: string;
}

export interface Problem {
  id: number;
  component_id: number;
  title: string;
  description?: string;
  status: 'open' | 'investigating' | 'blocked' | 'solved' | 'wont_fix';
  severity: 'low' | 'medium' | 'high' | 'critical';
  root_cause?: string;
  created_at: string;
  solved_at?: string;
}

export interface SolutionAttempt {
  id: number;
  problem_id: number;
  parent_attempt_id?: number;
  description: string;
  outcome?: 'success' | 'failure' | 'partial' | 'abandoned' | 'pending';
  confidence: 'attempted' | 'worked_once' | 'verified' | 'proven' | 'deprecated';
  notes?: string;
  created_at: string;
}

export interface Solution {
  id: number;
  problem_id: number;
  winning_attempt_id?: number;
  summary: string;
  code_snippet?: string;
  key_insight?: string;
  created_at: string;
}

export interface Todo {
  id: number;
  project_id: number;
  component_id?: number;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
  due_date?: string;
  created_at: string;
  completed_at?: string;
}

export interface Learning {
  id: number;
  project_id: number;
  component_id?: number;
  category?: 'pattern' | 'gotcha' | 'best_practice' | 'tool_tip' | 'architecture' | 'performance' | 'security' | 'other';
  insight: string;
  context?: string;
  source: 'experience' | 'documentation' | 'conversation' | 'error' | 'research';
  verified: boolean;
  created_at: string;
}

export interface Change {
  id: number;
  component_id: number;
  field_name: string;
  old_value?: string;
  new_value?: string;
  change_type: 'config' | 'code' | 'architecture' | 'dependency' | 'documentation' | 'other';
  reason?: string;
  created_at: string;
}

export interface Session {
  id: number;
  project_id: number;
  started_at: string;
  ended_at?: string;
  focus_component_id?: number;
  focus_problem_id?: number;
  summary?: string;
  duration_minutes?: number;
}

// View types
export type ViewType = 'dashboard' | 'tree' | 'kanban' | 'timeline' | 'decision' | 'story' | 'architecture' | 'search' | 'files';

// ============================================================
// STORE STATE
// ============================================================

interface AppState {
  // Current view
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

  // Selected project
  selectedProjectId: number | null;
  setSelectedProjectId: (id: number | null) => void;

  // Selected component
  selectedComponentId: number | null;
  setSelectedComponentId: (id: number | null) => void;

  // Selected problem (for detail views)
  selectedProblemId: number | null;
  setSelectedProblemId: (id: number | null) => void;

  // Data cache
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  
  components: Component[];
  setComponents: (components: Component[]) => void;
  
  problems: Problem[];
  setProblems: (problems: Problem[]) => void;
  
  todos: Todo[];
  setTodos: (todos: Todo[]) => void;
  
  learnings: Learning[];
  setLearnings: (learnings: Learning[]) => void;
  
  changes: Change[];
  setChanges: (changes: Change[]) => void;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: any[];
  setSearchResults: (results: any[]) => void;

  // Quick capture modal
  isQuickCaptureOpen: boolean;
  setQuickCaptureOpen: (open: boolean) => void;
  quickCaptureType: 'problem' | 'learning' | 'todo' | 'change' | null;
  setQuickCaptureType: (type: 'problem' | 'learning' | 'todo' | 'change' | null) => void;

  // Create modals
  showNewProject: boolean;
  setShowNewProject: (show: boolean) => void;
  showNewComponent: boolean;
  setShowNewComponent: (show: boolean) => void;
  showNewProblem: boolean;
  setShowNewProblem: (show: boolean) => void;

  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Database path
  dbPath: string;
  setDbPath: (path: string) => void;
}

// ============================================================
// STORE IMPLEMENTATION
// ============================================================

export const useAppStore = create<AppState>((set) => ({
  // Current view
  currentView: 'dashboard',
  setCurrentView: (view) => set({ currentView: view }),

  // Selected project
  selectedProjectId: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id, selectedComponentId: null, selectedProblemId: null }),

  // Selected component
  selectedComponentId: null,
  setSelectedComponentId: (id) => set({ selectedComponentId: id }),

  // Selected problem
  selectedProblemId: null,
  setSelectedProblemId: (id) => set({ selectedProblemId: id }),

  // Data cache
  projects: [],
  setProjects: (projects) => set({ projects }),
  
  components: [],
  setComponents: (components) => set({ components }),
  
  problems: [],
  setProblems: (problems) => set({ problems }),
  
  todos: [],
  setTodos: (todos) => set({ todos }),
  
  learnings: [],
  setLearnings: (learnings) => set({ learnings }),
  
  changes: [],
  setChanges: (changes) => set({ changes }),

  // Loading states
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  // Error state
  error: null,
  setError: (error) => set({ error }),

  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  searchResults: [],
  setSearchResults: (results) => set({ searchResults: results }),

  // Quick capture modal
  isQuickCaptureOpen: false,
  setQuickCaptureOpen: (open) => set({ isQuickCaptureOpen: open }),
  quickCaptureType: null,
  setQuickCaptureType: (type) => set({ quickCaptureType: type }),

  // Create modals
  showNewProject: false,
  setShowNewProject: (show) => set({ showNewProject: show }),
  showNewComponent: false,
  setShowNewComponent: (show) => set({ showNewComponent: show }),
  showNewProblem: false,
  setShowNewProblem: (show) => set({ showNewProblem: show }),

  // Theme
  theme: 'system',
  setTheme: (theme) => set({ theme }),

  // Database path
  dbPath: '',
  setDbPath: (path) => set({ dbPath: path }),
}));

// ============================================================
// SELECTORS (for computed values)
// ============================================================

export const selectCurrentProject = (state: AppState): Project | null => {
  if (!state.selectedProjectId) return null;
  return state.projects.find(p => p.id === state.selectedProjectId) || null;
};

export const selectProjectComponents = (state: AppState): Component[] => {
  if (!state.selectedProjectId) return [];
  return state.components.filter(c => c.project_id === state.selectedProjectId);
};

export const selectOpenProblems = (state: AppState): Problem[] => {
  return state.problems.filter(p => p.status === 'open' || p.status === 'investigating');
};

export const selectProjectProblems = (state: AppState): Problem[] => {
  if (!state.selectedProjectId) return [];
  const componentIds = state.components
    .filter(c => c.project_id === state.selectedProjectId)
    .map(c => c.id);
  return state.problems.filter(p => componentIds.includes(p.component_id));
};

export const selectProjectTodos = (state: AppState): Todo[] => {
  if (!state.selectedProjectId) return [];
  return state.todos.filter(t => t.project_id === state.selectedProjectId);
};

export const selectProjectLearnings = (state: AppState): Learning[] => {
  if (!state.selectedProjectId) return [];
  return state.learnings.filter(l => l.project_id === state.selectedProjectId);
};
