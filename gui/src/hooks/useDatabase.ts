/**
 * Database hook - Interface to SQLite via Tauri commands
 * v1.1: Complete implementation with file attachments, Git sync, and settings
 */

import { invoke } from '@tauri-apps/api/core';
import { useAppStore, Project, Component, Problem, Todo, Learning, Change } from '../stores/appStore';

// ============================================================
// v1.0 TYPE DEFINITIONS
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
// v1.1 TYPE DEFINITIONS: FILE ATTACHMENTS
// ============================================================

export interface Attachment {
  id: number;
  project_id: number;
  component_id?: number;
  problem_id?: number;
  // File location
  file_name: string;
  file_path: string;
  file_type: string;
  file_size?: number;
  file_hash?: string;
  is_external: boolean;
  // User metadata
  user_description?: string;
  tags?: string; // JSON array string
  // AI-generated metadata
  ai_description?: string;
  ai_summary?: string;
  content_extracted: boolean;
  // Timestamps
  created_at: string;
  updated_at: string;
  indexed_at?: string;
}

export interface ContentLocation {
  id: number;
  attachment_id: number;
  // What this location contains
  description: string;
  category?: string; // 'diagram', 'code', 'spec', 'decision', 'data', 'reference'
  // Where in the file
  location_type: string; // 'page', 'line', 'timestamp', 'section', 'range'
  start_location: string;
  end_location?: string;
  // Optional snippet
  snippet?: string;
  // Links to FlowState records
  related_problem_id?: number;
  related_solution_id?: number;
  related_learning_id?: number;
  related_component_id?: number;
  created_at: string;
}

export interface Extraction {
  id: number;
  attachment_id: number;
  // What was created
  record_type: string; // 'problem', 'learning', 'todo', 'change', 'component'
  record_id: number;
  // Source location
  source_location?: string;
  source_snippet?: string;
  // Confidence and review
  confidence?: number;
  user_reviewed: boolean;
  user_approved?: boolean;
  created_at: string;
}

export interface FileContent {
  type: 'text' | 'image' | 'pdf' | 'binary';
  content?: string;
  size: number;
  mime_type?: string;
  message?: string;
}

// ============================================================
// v1.1 TYPE DEFINITIONS: SYNC
// ============================================================

export interface SyncStatus {
  id: number;
  device_name: string;
  device_id: string;
  remote_url?: string;
  last_sync_at?: string;
  last_sync_commit?: string;
  pending_changes: number;
  has_conflicts: boolean;
  created_at: string;
  updated_at: string;
}

export interface SyncHistory {
  id: number;
  device_id: string;
  operation: string;
  commit_hash?: string;
  files_changed?: number;
  status?: string;
  error_message?: string;
  created_at: string;
}

export interface GitStatus {
  initialized: boolean;
  status?: string;
  pending_changes?: number;
  has_changes?: boolean;
  remote_url?: string;
  has_remote?: boolean;
  last_commit?: {
    hash: string;
    message: string;
    date: string;
  };
}

export interface GitCommit {
  hash: string;
  message: string;
  date: string;
  author: string;
}

export interface SyncResult {
  status: 'synced' | 'committed_local' | 'conflict' | 'error';
  committed: boolean;
  pushed?: boolean;
  message?: string;
}

// ============================================================
// v1.1 TYPE DEFINITIONS: SETTINGS
// ============================================================

export interface Setting {
  key: string;
  value: string;
  category: string;
  updated_at: string;
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

export async function getProjectContext(
  projectName: string, 
  hours: number = 48,
  includeFiles: boolean = true
): Promise<any> {
  return invoke('get_project_context', { projectName, hours, includeFiles });
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
// v1.1: FILE ATTACHMENT COMMANDS
// ============================================================

export async function attachFile(
  projectId: number,
  filePath: string,
  options?: {
    componentId?: number;
    problemId?: number;
    userDescription?: string;
    copyToBundle?: boolean;
  }
): Promise<Attachment> {
  return invoke('attach_file', {
    projectId,
    filePath,
    componentId: options?.componentId,
    problemId: options?.problemId,
    userDescription: options?.userDescription,
    copyToBundle: options?.copyToBundle ?? true,
  });
}

export async function getAttachments(
  projectId: number,
  componentId?: number,
  problemId?: number
): Promise<Attachment[]> {
  return invoke('get_attachments', { projectId, componentId, problemId });
}

export async function getAttachment(id: number): Promise<Attachment> {
  return invoke('get_attachment', { id });
}

export async function updateAttachment(
  id: number,
  options: {
    userDescription?: string;
    tags?: string;
    aiDescription?: string;
    aiSummary?: string;
    contentExtracted?: boolean;
  }
): Promise<Attachment> {
  return invoke('update_attachment', {
    id,
    userDescription: options.userDescription,
    tags: options.tags,
    aiDescription: options.aiDescription,
    aiSummary: options.aiSummary,
    contentExtracted: options.contentExtracted,
  });
}

export async function removeAttachment(id: number, deleteFile: boolean = false): Promise<void> {
  return invoke('remove_attachment', { id, deleteFile });
}

export async function readFileContent(filePath: string, fileType: string): Promise<FileContent> {
  return invoke('read_file_content', { filePath, fileType });
}

// ============================================================
// v1.1: CONTENT LOCATION COMMANDS
// ============================================================

export async function getContentLocations(attachmentId: number): Promise<ContentLocation[]> {
  return invoke('get_content_locations', { attachmentId });
}

export async function createContentLocation(
  attachmentId: number,
  description: string,
  locationType: string,
  startLocation: string,
  options?: {
    category?: string;
    endLocation?: string;
    snippet?: string;
    relatedProblemId?: number;
    relatedSolutionId?: number;
    relatedLearningId?: number;
    relatedComponentId?: number;
  }
): Promise<ContentLocation> {
  return invoke('create_content_location', {
    attachmentId,
    description,
    locationType,
    startLocation,
    category: options?.category,
    endLocation: options?.endLocation,
    snippet: options?.snippet,
    relatedProblemId: options?.relatedProblemId,
    relatedSolutionId: options?.relatedSolutionId,
    relatedLearningId: options?.relatedLearningId,
    relatedComponentId: options?.relatedComponentId,
  });
}

export async function deleteContentLocation(id: number): Promise<void> {
  return invoke('delete_content_location', { id });
}

// ============================================================
// v1.1: EXTRACTION COMMANDS
// ============================================================

export async function getExtractions(attachmentId: number): Promise<Extraction[]> {
  return invoke('get_extractions', { attachmentId });
}

export async function createExtraction(
  attachmentId: number,
  recordType: string,
  recordId: number,
  options?: {
    sourceLocation?: string;
    sourceSnippet?: string;
    confidence?: number;
  }
): Promise<Extraction> {
  return invoke('create_extraction', {
    attachmentId,
    recordType,
    recordId,
    sourceLocation: options?.sourceLocation,
    sourceSnippet: options?.sourceSnippet,
    confidence: options?.confidence,
  });
}

export async function updateExtractionReview(
  id: number,
  userReviewed: boolean,
  userApproved?: boolean
): Promise<Extraction> {
  return invoke('update_extraction_review', { id, userReviewed, userApproved });
}

export async function deleteExtraction(id: number): Promise<void> {
  return invoke('delete_extraction', { id });
}

// ============================================================
// v1.1: GIT SYNC COMMANDS
// ============================================================

export async function gitInit(dataPath?: string): Promise<{ status: string; path: string }> {
  return invoke('git_init', { dataPath });
}

export async function gitStatus(dataPath?: string): Promise<GitStatus> {
  return invoke('git_status', { dataPath });
}

export async function gitSync(dataPath?: string, commitMessage?: string): Promise<SyncResult> {
  return invoke('git_sync', { dataPath, commitMessage });
}

export async function gitSetRemote(remoteUrl: string, dataPath?: string): Promise<{ status: string; remote_url: string; action: string }> {
  return invoke('git_set_remote', { dataPath, remoteUrl });
}

export async function gitClone(remoteUrl: string, localPath?: string): Promise<{ status: string; path: string; remote_url: string }> {
  return invoke('git_clone', { remoteUrl, localPath });
}

export async function gitHistory(limit: number = 20, dataPath?: string): Promise<GitCommit[]> {
  return invoke('git_history', { dataPath, limit });
}

// ============================================================
// v1.1: SETTINGS COMMANDS
// ============================================================

export async function getSettings(): Promise<Setting[]> {
  return invoke('get_settings');
}

export async function getSetting(key: string): Promise<string | null> {
  return invoke('get_setting', { key });
}

export async function setSetting(key: string, value: string, category?: string): Promise<void> {
  return invoke('set_setting', { key, value, category });
}

export async function deleteSetting(key: string): Promise<void> {
  return invoke('delete_setting', { key });
}

export async function getSettingsByCategory(category: string): Promise<Setting[]> {
  return invoke('get_settings_by_category', { category });
}

// ============================================================
// v1.1: SYNC STATUS COMMANDS (Database-tracked sync state)
// ============================================================

export async function getSyncStatus(): Promise<SyncStatus | null> {
  return invoke('get_sync_status');
}

export async function initSyncStatus(deviceName: string): Promise<SyncStatus> {
  return invoke('init_sync_status', { deviceName });
}

export async function updateSyncStatus(options: {
  remoteUrl?: string;
  lastSyncAt?: string;
  lastSyncCommit?: string;
  pendingChanges?: number;
  hasConflicts?: boolean;
}): Promise<SyncStatus> {
  return invoke('update_sync_status', {
    remoteUrl: options.remoteUrl,
    lastSyncAt: options.lastSyncAt,
    lastSyncCommit: options.lastSyncCommit,
    pendingChanges: options.pendingChanges,
    hasConflicts: options.hasConflicts,
  });
}

export async function getSyncHistory(limit: number = 20): Promise<SyncHistory[]> {
  return invoke('get_sync_history', { limit });
}

export async function logSyncOperation(
  deviceId: string,
  operation: string,
  status: string,
  options?: {
    commitHash?: string;
    filesChanged?: number;
    errorMessage?: string;
  }
): Promise<SyncHistory> {
  return invoke('log_sync_operation', {
    deviceId,
    operation,
    status,
    commitHash: options?.commitHash,
    filesChanged: options?.filesChanged,
    errorMessage: options?.errorMessage,
  });
}

// ============================================================
// FILE EXPORT
// ============================================================

export async function writeTextFile(path: string, content: string): Promise<void> {
  return invoke('write_text_file', { path, content });
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

  const loadProjectContext = async (projectName: string, includeFiles: boolean = true) => {
    store.setIsLoading(true);
    store.setError(null);
    try {
      const context = await getProjectContext(projectName, 48, includeFiles);
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
  // v1.1: ATTACHMENT LOAD FUNCTIONS
  // ============================================================

  const loadAttachments = async (projectId: number, componentId?: number, problemId?: number) => {
    try {
      const attachments = await getAttachments(projectId, componentId, problemId);
      return attachments;
    } catch (e) {
      store.setError(String(e));
      return [];
    }
  };

  // ============================================================
  // v1.1: SYNC HELPER FUNCTIONS
  // ============================================================

  const performSync = async (commitMessage?: string) => {
    try {
      const result = await gitSync(undefined, commitMessage);
      // Update sync status in database
      if (result.status === 'synced' || result.status === 'committed_local') {
        await updateSyncStatus({
          lastSyncAt: new Date().toISOString(),
          pendingChanges: 0,
          hasConflicts: false,
        });
      } else if (result.status === 'conflict') {
        await updateSyncStatus({
          hasConflicts: true,
        });
      }
      return result;
    } catch (e) {
      store.setError(String(e));
      throw e;
    }
  };

  const loadSyncStatus = async () => {
    try {
      let status = await getSyncStatus();
      if (!status) {
        // Initialize sync status with device name
        const hostname = await invoke<string>('get_hostname').catch(() => 'Unknown Device');
        status = await initSyncStatus(hostname || 'Unknown Device');
      }
      return status;
    } catch (e) {
      store.setError(String(e));
      return null;
    }
  };

  // ============================================================
  // v1.1: SETTINGS HELPER FUNCTIONS
  // ============================================================

  const loadSettings = async () => {
    try {
      const settings = await getSettings();
      return settings;
    } catch (e) {
      store.setError(String(e));
      return [];
    }
  };

  const loadSettingsByCategory = async (category: string) => {
    try {
      const settings = await getSettingsByCategory(category);
      return settings;
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

    // v1.1: Attachment load functions
    loadAttachments,

    // v1.1: Sync helper functions
    performSync,
    loadSyncStatus,

    // v1.1: Settings helper functions
    loadSettings,
    loadSettingsByCategory,

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

    // v1.1: File Attachment API
    attachFile,
    getAttachments,
    getAttachment,
    updateAttachment,
    removeAttachment,
    readFileContent,

    // v1.1: Content Location API
    getContentLocations,
    createContentLocation,
    deleteContentLocation,

    // v1.1: Extraction API
    getExtractions,
    createExtraction,
    updateExtractionReview,
    deleteExtraction,

    // v1.1: Git Sync API
    gitInit,
    gitStatus,
    gitSync,
    gitSetRemote,
    gitClone,
    gitHistory,

    // v1.1: Settings API
    getSettings,
    getSetting,
    setSetting,
    deleteSetting,
    getSettingsByCategory,

    // v1.1: Sync Status API
    getSyncStatus,
    initSyncStatus,
    updateSyncStatus,
    getSyncHistory,
    logSyncOperation,

    // File Export
    writeTextFile,
  };
}
