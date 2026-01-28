/**
 * KnowledgeView.tsx - Project Knowledge Base
 * v1.2: Project Variables (servers, credentials, config) + Methods (patterns, workflows)
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore, ProjectVariable, ProjectMethod, Component } from '../stores/appStore';

const VARIABLE_CATEGORIES = ['server', 'credentials', 'config', 'environment', 'endpoint', 'custom'] as const;
const METHOD_CATEGORIES = ['auth', 'deployment', 'testing', 'architecture', 'workflow', 'convention', 'api', 'security', 'other'] as const;

const CATEGORY_CONFIG = {
  // Variable categories
  server: { label: 'Server', icon: '🖥️', color: 'bg-blue-900/50' },
  credentials: { label: 'Credentials', icon: '🔑', color: 'bg-red-900/50' },
  config: { label: 'Config', icon: '⚙️', color: 'bg-gray-700' },
  environment: { label: 'Environment', icon: '🌍', color: 'bg-green-900/50' },
  endpoint: { label: 'Endpoint', icon: '🔗', color: 'bg-purple-900/50' },
  custom: { label: 'Custom', icon: '📌', color: 'bg-yellow-900/50' },
  // Method categories
  auth: { label: 'Auth', icon: '🔐', color: 'bg-red-900/50' },
  deployment: { label: 'Deployment', icon: '🚀', color: 'bg-blue-900/50' },
  testing: { label: 'Testing', icon: '🧪', color: 'bg-green-900/50' },
  architecture: { label: 'Architecture', icon: '🏗️', color: 'bg-purple-900/50' },
  workflow: { label: 'Workflow', icon: '🔄', color: 'bg-orange-900/50' },
  convention: { label: 'Convention', icon: '📏', color: 'bg-gray-700' },
  api: { label: 'API', icon: '🔌', color: 'bg-cyan-900/50' },
  security: { label: 'Security', icon: '🛡️', color: 'bg-red-900/50' },
  other: { label: 'Other', icon: '📦', color: 'bg-gray-700' },
};

type TabType = 'variables' | 'methods';

export function KnowledgeView() {
  const { selectedProjectId, dbPath, components, setComponents } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabType>('variables');
  const [variables, setVariables] = useState<ProjectVariable[]>([]);
  const [methods, setMethods] = useState<ProjectMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [editingVariable, setEditingVariable] = useState<ProjectVariable | null>(null);
  const [editingMethod, setEditingMethod] = useState<ProjectMethod | null>(null);
  const [showNewVariable, setShowNewVariable] = useState(false);
  const [showNewMethod, setShowNewMethod] = useState(false);
  
  // Filter/search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    if (selectedProjectId) {
      loadData();
    }
  }, [selectedProjectId]);

  const loadData = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const [varsData, methodsData, compsData] = await Promise.all([
        invoke<ProjectVariable[]>('get_project_variables', { dbPath, projectId: selectedProjectId }),
        invoke<ProjectMethod[]>('get_project_methods', { dbPath, projectId: selectedProjectId }),
        invoke<Component[]>('get_components', { dbPath, projectId: selectedProjectId }),
      ]);
      setVariables(varsData);
      setMethods(methodsData);
      setComponents(compsData);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const deleteVariable = async (id: number) => {
    if (!confirm('Delete this variable?')) return;
    try {
      await invoke('delete_project_variable', { dbPath, variableId: id });
      loadData();
    } catch (err) {
      setError(String(err));
    }
  };

  const deleteMethod = async (id: number) => {
    if (!confirm('Delete this method?')) return;
    try {
      await invoke('delete_project_method', { dbPath, methodId: id });
      loadData();
    } catch (err) {
      setError(String(err));
    }
  };

  // Filter logic
  const filteredVariables = variables.filter(v => {
    const matchesSearch = searchQuery === '' || 
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || v.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredMethods = methods.filter(m => {
    const matchesSearch = searchQuery === '' ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryInfo = (category: string) => {
    return CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG] || { label: category, icon: '📄', color: 'bg-gray-700' };
  };

  const getComponentName = (id?: number) => {
    if (!id) return null;
    return components.find(c => c.id === id)?.name;
  };

  const parseSteps = (steps?: string): string[] => {
    if (!steps) return [];
    try {
      return JSON.parse(steps);
    } catch {
      return [];
    }
  };

  if (!selectedProjectId) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-gray-500">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <p>Select a project to view knowledge base</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              📚 Project Knowledge
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Variables, credentials, methods, and patterns
            </p>
          </div>
          <button
            onClick={() => activeTab === 'variables' ? setShowNewVariable(true) : setShowNewMethod(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium"
          >
            + Add {activeTab === 'variables' ? 'Variable' : 'Method'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-800 p-1 rounded-lg w-fit">
          <button
            onClick={() => { setActiveTab('variables'); setSelectedCategory('all'); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'variables'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            ⚙️ Variables ({variables.length})
          </button>
          <button
            onClick={() => { setActiveTab('methods'); setSelectedCategory('all'); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'methods'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📖 Methods ({methods.length})
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-700 flex items-center gap-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm w-64 focus:border-purple-500 focus:outline-none"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
        >
          <option value="all">All Categories</option>
          {(activeTab === 'variables' ? VARIABLE_CATEGORIES : METHOD_CATEGORIES).map(cat => (
            <option key={cat} value={cat}>{getCategoryInfo(cat).label}</option>
          ))}
        </select>
        {activeTab === 'variables' && (
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showSecrets}
              onChange={(e) => setShowSecrets(e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            Show secret values
          </label>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-900/30 border-b border-red-800 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Loading...
        </div>
      ) : activeTab === 'variables' ? (
        /* Variables Tab */
        <div className="flex-1 overflow-y-auto p-4">
          {filteredVariables.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <div className="text-6xl mb-4">⚙️</div>
              <p>No variables yet</p>
              <p className="text-sm mt-2">Store server addresses, credentials, and config values</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredVariables.map((v) => (
                <div
                  key={v.id}
                  className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${getCategoryInfo(v.category).color}`}>
                        {getCategoryInfo(v.category).icon} {getCategoryInfo(v.category).label}
                      </span>
                      {v.is_secret && (
                        <span className="text-xs bg-red-900/50 text-red-300 px-2 py-1 rounded">
                          🔒 Secret
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingVariable(v)}
                        className="text-gray-500 hover:text-white text-sm"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteVariable(v.id)}
                        className="text-gray-500 hover:text-red-400 text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <h3 className="text-white font-semibold mb-1">{v.name}</h3>
                  
                  {v.description && (
                    <p className="text-gray-400 text-sm mb-2">{v.description}</p>
                  )}

                  <div className="mt-3 p-2 bg-gray-900 rounded font-mono text-sm">
                    {v.is_secret && !showSecrets ? (
                      <span className="text-gray-500">••••••••</span>
                    ) : (
                      <span className="text-green-400 break-all">{v.value || '(empty)'}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Methods Tab */
        <div className="flex-1 overflow-y-auto p-4">
          {filteredMethods.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <div className="text-6xl mb-4">📖</div>
              <p>No methods yet</p>
              <p className="text-sm mt-2">Document your team's approaches, patterns, and workflows</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMethods.map((m) => (
                <div
                  key={m.id}
                  className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {m.category && (
                        <span className={`text-xs px-2 py-1 rounded ${getCategoryInfo(m.category).color}`}>
                          {getCategoryInfo(m.category).icon} {getCategoryInfo(m.category).label}
                        </span>
                      )}
                      {m.related_component_id && (
                        <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded">
                          🧩 {getComponentName(m.related_component_id)}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingMethod(m)}
                        className="text-gray-500 hover:text-white text-sm"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteMethod(m.id)}
                        className="text-gray-500 hover:text-red-400 text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <h3 className="text-white font-semibold text-lg mb-2">{m.name}</h3>
                  <p className="text-gray-300 mb-3">{m.description}</p>

                  {/* Steps */}
                  {parseSteps(m.steps).length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 mb-2">Steps:</div>
                      <ol className="list-decimal list-inside text-sm text-gray-400 space-y-1">
                        {parseSteps(m.steps).map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Code Example */}
                  {m.code_example && (
                    <div className="mt-3">
                      <div className="text-xs text-gray-500 mb-2">Example:</div>
                      <pre className="p-3 bg-gray-900 rounded text-sm text-green-400 overflow-x-auto">
                        <code>{m.code_example}</code>
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Variable Modal */}
      {(editingVariable || showNewVariable) && (
        <VariableModal
          variable={editingVariable}
          onClose={() => { setEditingVariable(null); setShowNewVariable(false); }}
          onSave={() => { setEditingVariable(null); setShowNewVariable(false); loadData(); }}
        />
      )}

      {/* Method Modal */}
      {(editingMethod || showNewMethod) && (
        <MethodModal
          method={editingMethod}
          components={components}
          onClose={() => { setEditingMethod(null); setShowNewMethod(false); }}
          onSave={() => { setEditingMethod(null); setShowNewMethod(false); loadData(); }}
        />
      )}
    </div>
  );
}

// Variable Edit/Create Modal
function VariableModal({
  variable,
  onClose,
  onSave,
}: {
  variable: ProjectVariable | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const { selectedProjectId, dbPath } = useAppStore();
  const isNew = !variable;

  const [name, setName] = useState(variable?.name || '');
  const [value, setValue] = useState(variable?.value || '');
  const [category, setCategory] = useState<string>(variable?.category || 'config');
  const [isSecret, setIsSecret] = useState(variable?.is_secret ?? false);
  const [description, setDescription] = useState(variable?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        await invoke('create_project_variable', {
          dbPath,
          projectId: selectedProjectId,
          category,
          name,
          value: value || null,
          isSecret,
          description: description || null,
        });
      } else {
        await invoke('update_project_variable', {
          dbPath,
          variableId: variable!.id,
          category,
          name,
          value: value || null,
          isSecret,
          description: description || null,
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
            {isNew ? 'New Variable' : 'Edit Variable'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
        </div>

        {error && (
          <div className="p-3 bg-red-900/30 text-red-300 text-sm">{error}</div>
        )}

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-purple-500 focus:outline-none"
                placeholder="API_KEY, SERVER_URL..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-purple-500 focus:outline-none"
              >
                {VARIABLE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{CATEGORY_CONFIG[cat].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Value</label>
            <input
              type={isSecret ? 'password' : 'text'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white font-mono focus:border-purple-500 focus:outline-none"
              placeholder="Enter value..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-purple-500 focus:outline-none"
              placeholder="What is this variable for?"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={isSecret}
              onChange={(e) => setIsSecret(e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            🔒 Mark as secret (hide value by default)
          </label>
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300">
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

// Method Edit/Create Modal
function MethodModal({
  method,
  components,
  onClose,
  onSave,
}: {
  method: ProjectMethod | null;
  components: Component[];
  onClose: () => void;
  onSave: () => void;
}) {
  const { selectedProjectId, dbPath } = useAppStore();
  const isNew = !method;

  const [name, setName] = useState(method?.name || '');
  const [description, setDescription] = useState(method?.description || '');
  const [category, setCategory] = useState<string>(method?.category || 'workflow');
  const [steps, setSteps] = useState(method?.steps ? JSON.parse(method.steps).join('\n') : '');
  const [codeExample, setCodeExample] = useState(method?.code_example || '');
  const [relatedComponentId, setRelatedComponentId] = useState<number | undefined>(method?.related_component_id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim() || !description.trim()) {
      setError('Name and description are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const stepsArray = steps.split('\n').map((s: string) => s.trim()).filter((s: string) => s);
      if (isNew) {
        await invoke('create_project_method', {
          dbPath,
          projectId: selectedProjectId,
          name,
          description,
          category: category || null,
          steps: stepsArray.length > 0 ? JSON.stringify(stepsArray) : null,
          codeExample: codeExample || null,
          relatedComponentId: relatedComponentId || null,
        });
      } else {
        await invoke('update_project_method', {
          dbPath,
          methodId: method!.id,
          name,
          description,
          category: category || null,
          steps: stepsArray.length > 0 ? JSON.stringify(stepsArray) : null,
          codeExample: codeExample || null,
          relatedComponentId: relatedComponentId || null,
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
      <div className="w-full max-w-2xl max-h-[90vh] bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {isNew ? 'New Method' : 'Edit Method'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
        </div>

        {error && (
          <div className="p-3 bg-red-900/30 text-red-300 text-sm">{error}</div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-purple-500 focus:outline-none"
                placeholder="Deploy to Production..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-purple-500 focus:outline-none"
              >
                {METHOD_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{CATEGORY_CONFIG[cat].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-purple-500 focus:outline-none"
              placeholder="What does this method do? When should it be used?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Steps (one per line)</label>
            <textarea
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white font-mono text-sm focus:border-purple-500 focus:outline-none"
              placeholder="Step 1: Do this&#10;Step 2: Do that&#10;Step 3: Verify result"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Code Example</label>
            <textarea
              value={codeExample}
              onChange={(e) => setCodeExample(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white font-mono text-sm focus:border-purple-500 focus:outline-none"
              placeholder="# Example code snippet..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Related Component</label>
            <select
              value={relatedComponentId || ''}
              onChange={(e) => setRelatedComponentId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-purple-500 focus:outline-none"
            >
              <option value="">None</option>
              {components.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300">
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

export default KnowledgeView;
