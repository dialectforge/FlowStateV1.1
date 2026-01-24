/**
 * Database hook - Interface to SQLite via Tauri commands
 * Complete implementation with all CRUD operations
 */

import { invoke } from '@tauri-apps/api/core';
import { useAppStore, Project, Component, Problem, Todo, Learning, Change } from '../stores/appStore';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface SolutionAttempt {
  id: number;
  problem_id: number;
  parent_attempt_id?: number;
  description: string;
  outcome?: 'success' | 'failure' | 'partial' | 'abandoned' | 'pending';
  confidence: string;
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

export interface ProblemTree {
  problem: Problem;
  attempts: SolutionAttempt[];
  solution?: Solution;
  learnings: Learning[];
}

export interface ProjectStory {
  project: Project;
  components: Component[];
  problems: Problem[];
  changes: Change[];
  learnings: Learning[];
  todos: Todo[];
  stats: {
    total_problems: number;
    solved_problems: number;
    open_problems: number;
    total_changes: number;
    total_learnings: number;
    total_components: number;
  };
  summary: any;
}

export interface ProblemJourney {
  problem: Problem;
  attempts: SolutionAttempt[];
  solution?: Solution;
  journey: any[];
  stats: {
    total_attempts: number;
    failed_attempts: number;
    is_solved: boolean;
  };
}

export interface ProjectStats {
  component_count: number;
  open_problems: number;
  solved_problems: number;
  pending_todos: number;
  learning_count: number;
  recent_changes: number;
}

// ============================================================
// PROJECT COMMANDS
// ============================================================

export async function listProjects(status?: string): Promise<Project[]> {
  return invoke('list_projects', { status });
}

export async function createProject(name: string, description?: string): Promise<Project> {
  return invoke('create_project', { name, description });
}

export async function getProject(id: number): Promise<Project> {
  return invoke('get_project', { id });
}

export async function updateProject(
  id: number,
  name?: string,
  description?: string,
  status?: string
): Promise<Project> {
  return invoke('update_project', { id, name, description, status });
}

export async function deleteProject(id: number): Promise<void> {
  return invoke('delete_project', { id });
}

export async function getProjectContext(projectName: string, hours: number = 48): Promise<any> {
  return invoke('get_project_context', { projectName, hours });
}

export async function getProjectStats(projectId: number): Promise<ProjectStats> {
  return invoke('get_project_stats', { projectId });
}

// ============================================================
// COMPONENT COMMANDS
// ============================================================

export async function listComponents(projectId: number): Promise<Component[]> {
  return invoke('list_components', { projectId });
}

export async function createComponent(
  projectId: number,
  name: string,
  description?: string,
  parentComponentId?: number
): Promise<Component> {
  return invoke('create_component', { projectId, name, description, parentComponentId });
}

export async function getComponent(id: number): Promise<Component> {
  return invoke('get_component', { id });
}

export async function updateComponent(
  id: number,
  name?: string,
  description?: string,
  status?: string
): Promise<Component> {
  return invoke('update_component', { id, name, description, status });
}

export async function deleteComponent(id: number): Promise<void> {
  return invoke('delete_component', { id });
}

// ============================================================
// CHANGE COMMANDS
// ============================================================

export async function logChange(
  componentId: number,
  fieldName: string,
  oldValue?: string,
  newValue?: string,
  changeType: string = 'code',
  reason?: string
): Promise<Change> {
  return invoke('log_change', { componentId, fieldName, oldValue, newValue, changeType, reason });
}

export async function getRecentChanges(
  projectId?: number,
  componentId?: number,
  hours: number = 24
): Promise<Change[]> {
  return invoke('get_recent_changes', { projectId, componentId, hours });
}

export async function getAllChanges(
  projectId?: number,
  componentId?: number
): Promise<Change[]> {
  return invoke('get_all_changes', { projectId, componentId });
}

// ============================================================
// PROBLEM COMMANDS
// ============================================================

export async function logProblem(
  componentId: number,
  title: string,
  description?: string,
  severity: string = 'medium'
): Promise<Problem> {
  return invoke('log_problem', { componentId, title, description, severity });
}

export async function getProblem(id: number): Promise<Problem> {
  return invoke('get_problem', { id });
}

export async function getOpenProblems(projectId?: number, componentId?: number): Promise<Problem[]> {
  return invoke('get_open_problems', { projectId, componentId });
}

export async function getAllProblems(projectId?: number, componentId?: number): Promise<Problem[]> {
  return invoke('get_all_problems', { projectId, componentId });
}

export async function updateProblem(
  id: number,
  title?: string,
  description?: string,
  status?: string,
  severity?: string,
  rootCause?: string
): Promise<Problem> {
  return invoke('update_problem', { id, title, description, status, severity, rootCause });
}

export async function deleteProblem(id: number): Promise<void> {
  return invoke('delete_problem', { id });
}

export async function getProblemTree(problemId: number): Promise<ProblemTree> {
  return invoke('get_problem_tree', { problemId });
}

// ============================================================
// SOLUTION ATTEMPT COMMANDS
// ============================================================

export async function logAttempt(
  problemId: number,
  description: string,
  parentAttemptId?: number
): Promise<SolutionAttempt> {
  return invoke('log_attempt', { problemId, description, parentAttemptId });
}

export async function markAttemptOutcome(
  id: number,
  outcome: string,
  notes?: string,
  confidence?: string
): Promise<SolutionAttempt> {
  return invoke('mark_attempt_outcome', { id, outcome, notes, confidence });
}

export async function getAttemptsForProblem(problemId: number): Promise<SolutionAttempt[]> {
  return invoke('get_attempts_for_problem', { problemId });
}

// ============================================================
// SOLUTION COMMANDS
// ============================================================

export async function markProblemSolved(
  problemId: number,
  winningAttemptId: number | null,
  summary: string,
  codeSnippet?: string,
  keyInsight?: string
): Promise<Solution> {
  return invoke('mark_problem_solved', { problemId, winningAttemptId, summary, codeSnippet, keyInsight });
}

export async function getSolutionForProblem(problemId: number): Promise<Solution | null> {
  return invoke('get_solution_for_problem', { problemId });
}

// ============================================================
// TODO COMMANDS
// ============================================================

export async function addTodo(
  projectId: number,
  title: string,
  description?: string,
  priority: string = 'medium',
  componentId?: number,
  dueDate?: string
): Promise<Todo> {
  return invoke('add_todo', { projectId, title, description, priority, componentId, dueDate });
}

export async function getTodo(id: number): Promise<Todo> {
  return invoke('get_todo', { id });
}

export async function getTodos(
  projectId: number,
  status?: string,
  priority?: string
): Promise<Todo[]> {
  return invoke('get_todos', { projectId, status, priority });
}

export async function updateTodo(
  id: number,
  title?: string,
  description?: string,
  status?: string,
  priority?: string,
  dueDate?: string
): Promise<Todo> {
  return invoke('update_todo', { id, title, description, status, priority, dueDate });
}

export async function deleteTodo(id: number): Promise<void> {
  return invoke('delete_todo', { id });
}

// ============================================================
// LEARNING COMMANDS
// ============================================================

export async function logLearning(
  projectId: number,
  insight: string,
  category?: string,
  context?: string,
  componentId?: number,
  source: string = 'experience'
): Promise<Learning> {
  return invoke('log_learning', { projectId, insight, category, context, componentId, source });
}

export async function getLearning(id: number): Promise<Learning> {
  return invoke('get_learning', { id });
}

export async function getLearnings(
  projectId?: number,
  category?: string,
  verifiedOnly: boolean = false
): Promise<Learning[]> {
  return invoke('get_learnings', { projectId, category, verifiedOnly });
}

export async function updateLearning(
  id: number,
  insight?: string,
  category?: string,
  context?: string,
  verified?: boolean
): Promise<Learning> {
  return invoke('update_learning', { id, insight, category, context, verified });
}

export async function deleteLearning(id: number): Promise<void> {
  return invoke('delete_learning', { id });
}

// ============================================================
// SEARCH COMMAND
// ============================================================

export async function search(
  query: string,
  projectId?: number,
  limit: number = 10
): Promise<any[]> {
  return invoke('search', { query, projectId, limit });
}

// ============================================================
// STORY GENERATION COMMANDS
// ============================================================

export async function generateProjectStory(projectId: number): Promise<ProjectStory> {
  return invoke('generate_project_story', { projectId });
}

export async function generateProblemJourney(problemId: number): Promise<ProblemJourney> {
  return invoke('generate_problem_journey', { problemId });
}

// ============================================================
// REACT HOOK
// ============================================================

export function useDatabase() {
  const store = useAppStore();

  // ============================================================
  // LOAD FUNCTIONS (update store)
  // ============================================================

  const loadProjects = async (status?: string) => {
    store.setIsLoading(true);
    store.setError(null);
    try {
      const projects = await listProjects(status);
      store.setProjects(projects);
      return projects;
    } catch (e) {
      store.setError(String(e));
      return [];
    } finally {
      store.setIsLoading(false);
    }
  };

  const loadProjectContext = async (projectName: string) => {
    store.setIsLoading(true);
    store.setError(null);
    try {
      const context = await getProjectContext(projectName);
      if (context) {
        store.setComponents(context.components || []);
        store.setProblems(context.open_problems || []);
        store.setTodos(context.high_priority_todos || []);
        store.setLearnings(context.recent_learnings || []);
        store.setChanges(context.recent_changes || []);
      }
      return context;
    } catch (e) {
      store.setError(String(e));
      return null;
    } finally {
      store.setIsLoading(false);
    }
  };

  const loadComponents = async (projectId: number) => {
    try {
      const components = await listComponents(projectId);
      store.setComponents(components);
      return components;
    } catch (e) {
      store.setError(String(e));
      return [];
    }
  };

  const loadProblems = async (projectId?: number, includeAll: boolean = false) => {
    try {
      const problems = includeAll 
        ? await getAllProblems(projectId)
        : await getOpenProblems(projectId);
      store.setProblems(problems);
      return problems;
    } catch (e) {
      store.setError(String(e));
      return [];
    }
  };

  const loadTodos = async (projectId: number) => {
    try {
      const todos = await getTodos(projectId);
      store.setTodos(todos);
      return todos;
    } catch (e) {
      store.setError(String(e));
      return [];
    }
  };

  const loadLearnings = async (projectId?: number) => {
    try {
      const learnings = await getLearnings(projectId);
      store.setLearnings(learnings);
      return learnings;
    } catch (e) {
      store.setError(String(e));
      return [];
    }
  };

  const loadChanges = async (projectId?: number, hours: number = 24) => {
    try {
      const changes = await getRecentChanges(projectId, undefined, hours);
      store.setChanges(changes);
      return changes;
    } catch (e) {
      store.setError(String(e));
      return [];
    }
  };

  const performSearch = async (query: string) => {
    store.setSearchQuery(query);
    if (!query.trim()) {
      store.setSearchResults([]);
      return [];
    }
    try {
      const results = await search(query, store.selectedProjectId || undefined);
      store.setSearchResults(results);
      return results;
    } catch (e) {
      store.setError(String(e));
      return [];
    }
  };

  // ============================================================
  // RETURN ALL FUNCTIONS
  // ============================================================

  return {
    // Load functions (update store)
    loadProjects,
    loadProjectContext,
    loadComponents,
    loadProblems,
    loadTodos,
    loadLearnings,
    loadChanges,
    performSearch,

    // Project API
    createProject,
    getProject,
    updateProject,
    deleteProject,
    getProjectStats,

    // Component API
    createComponent,
    getComponent,
    updateComponent,
    deleteComponent,

    // Change API
    logChange,
    getRecentChanges,
    getAllChanges,

    // Problem API
    logProblem,
    getProblem,
    getOpenProblems,
    getAllProblems,
    updateProblem,
    deleteProblem,
    getProblemTree,

    // Attempt API
    logAttempt,
    markAttemptOutcome,
    getAttemptsForProblem,

    // Solution API
    markProblemSolved,
    getSolutionForProblem,

    // Todo API
    addTodo,
    getTodo,
    updateTodo,
    deleteTodo,

    // Learning API
    logLearning,
    getLearning,
    updateLearning,
    deleteLearning,

    // Search
    search,

    // Story generation
    generateProjectStory,
    generateProblemJourney,
  };
}
