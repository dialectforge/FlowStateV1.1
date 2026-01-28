/**
 * TodoBoard.tsx - Kanban board for todos
 * v1.2: Dedicated todo management with drag-and-drop
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore, Todo, Component } from '../stores/appStore';

const TODO_STATUSES = ['pending', 'in_progress', 'blocked', 'done', 'cancelled'] as const;
const PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-gray-700', icon: '⏳' },
  in_progress: { label: 'In Progress', color: 'bg-blue-900/50', icon: '🔄' },
  blocked: { label: 'Blocked', color: 'bg-red-900/50', icon: '🚫' },
  done: { label: 'Done', color: 'bg-green-900/50', icon: '✅' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-800', icon: '❌' },
};

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-600', text: 'text-red-200' },
  high: { label: 'High', color: 'bg-orange-600', text: 'text-orange-200' },
  medium: { label: 'Medium', color: 'bg-yellow-600', text: 'text-yellow-200' },
  low: { label: 'Low', color: 'bg-gray-600', text: 'text-gray-300' },
};

export function TodoBoard() {
  const { selectedProjectId, dbPath, todos, setTodos, components, setComponents } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [showNewTodo, setShowNewTodo] = useState(false);
  const [draggedTodo, setDraggedTodo] = useState<Todo | null>(null);

  // Load data
  useEffect(() => {
    if (selectedProjectId) {
      loadData();
    }
  }, [selectedProjectId]);

  const loadData = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const [todosData, componentsData] = await Promise.all([
        invoke<Todo[]>('get_todos', { dbPath, projectId: selectedProjectId }),
        invoke<Component[]>('get_components', { dbPath, projectId: selectedProjectId }),
      ]);
      setTodos(todosData);
      setComponents(componentsData);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const updateTodoStatus = async (todoId: number, newStatus: string) => {
    try {
      await invoke('update_todo', {
        dbPath,
        todoId,
        status: newStatus,
      });
      loadData();
    } catch (err) {
      setError(String(err));
    }
  };

  const deleteTodo = async (todoId: number) => {
    if (!confirm('Delete this todo?')) return;
    try {
      await invoke('delete_todo', { dbPath, todoId });
      loadData();
    } catch (err) {
      setError(String(err));
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, todo: Todo) => {
    setDraggedTodo(todo);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggedTodo && draggedTodo.status !== status) {
      updateTodoStatus(draggedTodo.id, status);
    }
    setDraggedTodo(null);
  };

  // Filter todos
  const filteredTodos = todos.filter((t) => {
    if (!showCompleted && (t.status === 'done' || t.status === 'cancelled')) {
      return false;
    }
    return true;
  });

  const getTodosByStatus = (status: string) => {
    return filteredTodos
      .filter((t) => t.status === status)
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  };

  const getComponentName = (componentId?: number) => {
    if (!componentId) return null;
    const component = components.find((c) => c.id === componentId);
    return component?.name;
  };

  if (!selectedProjectId) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-gray-500">
        <div className="text-center">
          <div className="text-6xl mb-4">📋</div>
          <p>Select a project to view todos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            📋 Todo Board
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredTodos.length} todos • Drag to change status
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            Show completed
          </label>
          <button
            onClick={() => setShowNewTodo(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium"
          >
            + Add Todo
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-900/30 border-b border-red-800 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Loading todos...
        </div>
      ) : (
        /* Kanban Columns */
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-4 h-full min-w-max">
            {TODO_STATUSES.filter((s) => showCompleted || (s !== 'done' && s !== 'cancelled')).map((status) => (
              <div
                key={status}
                className={`w-80 flex flex-col rounded-xl ${STATUS_CONFIG[status].color} border border-gray-700`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Column Header */}
                <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{STATUS_CONFIG[status].icon}</span>
                    <span className="font-semibold text-white">{STATUS_CONFIG[status].label}</span>
                    <span className="text-xs bg-gray-800 px-2 py-0.5 rounded-full text-gray-400">
                      {getTodosByStatus(status).length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {getTodosByStatus(status).map((todo) => (
                    <div
                      key={todo.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, todo)}
                      className={`p-3 bg-gray-800 rounded-lg border border-gray-700 cursor-grab hover:border-gray-600 transition-colors ${
                        draggedTodo?.id === todo.id ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Priority Badge */}
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${PRIORITY_CONFIG[todo.priority].color} ${PRIORITY_CONFIG[todo.priority].text}`}
                        >
                          {todo.priority}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingTodo(todo)}
                            className="text-gray-500 hover:text-white text-xs"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteTodo(todo.id)}
                            className="text-gray-500 hover:text-red-400 text-xs"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-white font-medium text-sm mb-1">{todo.title}</h3>

                      {/* Description */}
                      {todo.description && (
                        <p className="text-gray-400 text-xs line-clamp-2 mb-2">{todo.description}</p>
                      )}

                      {/* Meta */}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {getComponentName(todo.component_id) && (
                          <span className="bg-gray-700 px-2 py-0.5 rounded">
                            🧩 {getComponentName(todo.component_id)}
                          </span>
                        )}
                        {todo.due_date && (
                          <span className="bg-gray-700 px-2 py-0.5 rounded">
                            📅 {new Date(todo.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit/Create Modal */}
      {(editingTodo || showNewTodo) && (
        <TodoModal
          todo={editingTodo}
          components={components}
          onClose={() => {
            setEditingTodo(null);
            setShowNewTodo(false);
          }}
          onSave={() => {
            setEditingTodo(null);
            setShowNewTodo(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Todo Edit/Create Modal
function TodoModal({
  todo,
  components,
  onClose,
  onSave,
}: {
  todo: Todo | null;
  components: Component[];
  onClose: () => void;
  onSave: () => void;
}) {
  const { selectedProjectId, dbPath } = useAppStore();
  const isNew = !todo;

  const [title, setTitle] = useState(todo?.title || '');
  const [description, setDescription] = useState(todo?.description || '');
  const [priority, setPriority] = useState<string>(todo?.priority || 'medium');
  const [status, setStatus] = useState<string>(todo?.status || 'pending');
  const [componentId, setComponentId] = useState<number | undefined>(todo?.component_id);
  const [dueDate, setDueDate] = useState(todo?.due_date?.split('T')[0] || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        await invoke('create_todo', {
          dbPath,
          projectId: selectedProjectId,
          title,
          description: description || null,
          priority,
          componentId: componentId || null,
          dueDate: dueDate || null,
        });
      } else {
        await invoke('update_todo', {
          dbPath,
          todoId: todo!.id,
          title,
          description: description || null,
          priority,
          status,
          componentId: componentId || null,
          dueDate: dueDate || null,
        });
      }
      onSave();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {isNew ? 'New Todo' : 'Edit Todo'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ×
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-900/30 text-red-300 text-sm">{error}</div>
        )}

        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-purple-500 focus:outline-none"
              placeholder="What needs to be done?"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-purple-500 focus:outline-none"
              placeholder="Additional details..."
            />
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-purple-500 focus:outline-none"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            {!isNew && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-purple-500 focus:outline-none"
                >
                  {TODO_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Component & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Component</label>
              <select
                value={componentId || ''}
                onChange={(e) => setComponentId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="">None</option>
                {components.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TodoBoard;
