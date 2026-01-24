/**
 * Dashboard - Main landing view showing all projects
 */

import { useEffect, useState } from 'react';
import { useAppStore, Project } from '../stores/appStore';
import { useDatabase } from '../hooks/useDatabase';
import { FolderOpen, AlertCircle, CheckCircle, Clock, Plus, Pause, Archive } from 'lucide-react';

// ============================================================
// PROJECT CARD
// ============================================================

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

function ProjectCard({ project, onClick }: ProjectCardProps) {
  const statusColors = {
    active: 'border-l-green-500 bg-green-50 dark:bg-green-950/20',
    paused: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
    completed: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20',
    archived: 'border-l-gray-500 bg-gray-50 dark:bg-gray-950/20',
  };

  const statusIcons = {
    active: <Clock className="w-4 h-4 text-green-600" />,
    paused: <Pause className="w-4 h-4 text-yellow-600" />,
    completed: <CheckCircle className="w-4 h-4 text-blue-600" />,
    archived: <Archive className="w-4 h-4 text-gray-600" />,
  };

  const statusLabels = {
    active: 'Active',
    paused: 'Paused',
    completed: 'Completed',
    archived: 'Archived',
  };

  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-lg border-l-4 cursor-pointer
        transition-all duration-200 hover:shadow-md hover:scale-[1.01]
        ${statusColors[project.status]}
        border border-gray-200 dark:border-gray-700
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {project.name}
          </h3>
        </div>
        <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-white/50 dark:bg-gray-800/50">
          {statusIcons[project.status]}
          <span className="text-gray-600 dark:text-gray-400">
            {statusLabels[project.status]}
          </span>
        </div>
      </div>
      
      {project.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {project.description}
        </p>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
        <span>
          Updated {formatRelativeTime(project.updated_at)}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ============================================================
// NEW PROJECT MODAL
// ============================================================

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string) => void;
}

function NewProjectModal({ isOpen, onClose, onSubmit }: NewProjectModalProps) {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    if (name.trim()) {
      onSubmit(name.trim(), description.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Create New Project
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Project Name
            </label>
            <input
              type="text"
              name="name"
              required
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="My Awesome Project"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (optional)
            </label>
            <textarea
              name="description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What are you building?"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 
                         dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                         transition-colors"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD COMPONENT
// ============================================================

export function Dashboard() {
  const { projects, isLoading, error, setSelectedProjectId, setCurrentView } = useAppStore();
  const { loadProjects, createProject } = useDatabase();

  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const handleProjectClick = (project: Project) => {
    setSelectedProjectId(project.id);
    setCurrentView('tree');
  };

  const handleCreateProject = async (name: string, description: string) => {
    try {
      await createProject(name, description);
      await loadProjects();
      setIsNewProjectOpen(false);
    } catch (e) {
      console.error('Failed to create project:', e);
    }
  };

  // Group projects by status
  const activeProjects = projects.filter(p => p.status === 'active');
  const pausedProjects = projects.filter(p => p.status === 'paused');
  const completedProjects = projects.filter(p => p.status === 'completed');
  const archivedProjects = projects.filter(p => p.status === 'archived');

  if (isLoading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => loadProjects()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            FlowState
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your development memory
          </p>
        </div>
        <button
          onClick={() => setIsNewProjectOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg 
                     hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="text-center py-16">
          <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No projects yet
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first project to start tracking your development journey.
          </p>
          <button
            onClick={() => setIsNewProjectOpen(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Project
          </button>
        </div>
      )}

      {/* Active Projects */}
      {activeProjects.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-600" />
            Active Projects
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleProjectClick(project)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Paused Projects */}
      {pausedProjects.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Pause className="w-5 h-5 text-yellow-600" />
            Paused
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pausedProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleProjectClick(project)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed Projects */}
      {completedProjects.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            Completed
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleProjectClick(project)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Archived Projects */}
      {archivedProjects.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Archive className="w-5 h-5 text-gray-600" />
            Archived
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleProjectClick(project)}
              />
            ))}
          </div>
        </section>
      )}

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
}
