/**
 * FlowState Settings Panel - v1.1
 * Full settings management with tabs: General, Sync, AI
 */

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

// ============================================================
// TYPES
// ============================================================

interface Setting {
  key: string;
  value: string;
  category: string;
  updated_at: string;
}

interface SyncStatus {
  id: number;
  device_name: string;
  device_id: string;
  remote_url: string | null;
  last_sync_at: string | null;
  last_sync_commit: string | null;
  pending_changes: number;
  has_conflicts: boolean;
  created_at: string;
  updated_at: string;
}

interface GitStatus {
  initialized: boolean;
  pending_changes?: number;
  has_changes?: boolean;
  remote_url?: string | null;
  has_remote?: boolean;
  last_commit?: {
    hash: string;
    message: string;
    date: string;
  } | null;
}

interface GitCommit {
  hash: string;
  message: string;
  date: string;
  author: string;
}

type SettingsTab = 'general' | 'sync' | 'ai';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
}

// ============================================================
// SETTINGS COMPONENT
// ============================================================

export function Settings({ isOpen, onClose, initialTab = 'general' }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [_settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // General settings state
  const [dataLocation, setDataLocation] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  // Sync settings state
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [gitHistory, setGitHistory] = useState<GitCommit[]>([]);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [autoSyncInterval, setAutoSyncInterval] = useState(15);
  const [syncOnClose, setSyncOnClose] = useState(true);
  const [syncOnOpen, setSyncOnOpen] = useState(true);

  // AI settings state
  const [aiEnabled, setAiEnabled] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [autoDescribeFiles, setAutoDescribeFiles] = useState(true);
  const [suggestRelated, setSuggestRelated] = useState(true);
  const [expandNotes, setExpandNotes] = useState(true);
  const [autoExtract, setAutoExtract] = useState(false);
  const [aiModel, setAiModel] = useState('claude-sonnet');

  // Reset tab when opened with a specific initial tab
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Load settings on mount
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      // Load all settings
      const allSettings: Setting[] = await invoke('get_settings');
      setSettings(allSettings);

      // Parse settings into state
      const settingsMap = new Map(allSettings.map(s => [s.key, s.value]));

      // General
      setDataLocation(settingsMap.get('data_location') || '~/FlowState-Data');
      setTheme((settingsMap.get('theme') as 'light' | 'dark' | 'system') || 'system');

      // Sync
      setAutoSyncEnabled(settingsMap.get('auto_sync_enabled') !== 'false');
      setAutoSyncInterval(parseInt(settingsMap.get('auto_sync_interval') || '15', 10));
      setSyncOnClose(settingsMap.get('sync_on_close') !== 'false');
      setSyncOnOpen(settingsMap.get('sync_on_open') !== 'false');

      // AI
      setAiEnabled(settingsMap.get('ai_enabled') !== 'false');
      setApiKey(settingsMap.get('api_key') || '');
      setAutoDescribeFiles(settingsMap.get('auto_describe_files') !== 'false');
      setSuggestRelated(settingsMap.get('suggest_related') !== 'false');
      setExpandNotes(settingsMap.get('expand_notes') !== 'false');
      setAutoExtract(settingsMap.get('auto_extract') === 'true');
      setAiModel(settingsMap.get('ai_model') || 'claude-sonnet');

      // Load sync status
      const status: SyncStatus | null = await invoke('get_sync_status');
      setSyncStatus(status);
      if (status?.remote_url) {
        setRemoteUrl(status.remote_url);
      }

      // Load git status
      const git: GitStatus = await invoke('git_status', { dataPath: null });
      setGitStatus(git);
      if (git.remote_url) {
        setRemoteUrl(git.remote_url);
      }

      // Load git history if initialized
      if (git.initialized) {
        const history: GitCommit[] = await invoke('git_history', { dataPath: null, limit: 10 });
        setGitHistory(history);
      }

    } catch (error) {
      console.error('Failed to load settings:', error);
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, loadSettings]);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Save a single setting
  const saveSetting = async (key: string, value: string, category: string) => {
    try {
      await invoke('set_setting', { key, value, category });
    } catch (error) {
      console.error(`Failed to save setting ${key}:`, error);
      throw error;
    }
  };

  // Save all settings
  const saveAllSettings = async () => {
    setSaving(true);
    try {
      // General settings
      await saveSetting('data_location', dataLocation, 'general');
      await saveSetting('theme', theme, 'general');

      // Sync settings
      await saveSetting('auto_sync_enabled', String(autoSyncEnabled), 'sync');
      await saveSetting('auto_sync_interval', String(autoSyncInterval), 'sync');
      await saveSetting('sync_on_close', String(syncOnClose), 'sync');
      await saveSetting('sync_on_open', String(syncOnOpen), 'sync');

      // AI settings
      await saveSetting('ai_enabled', String(aiEnabled), 'ai');
      if (apiKey) {
        await saveSetting('api_key', apiKey, 'ai');
      }
      await saveSetting('auto_describe_files', String(autoDescribeFiles), 'ai');
      await saveSetting('suggest_related', String(suggestRelated), 'ai');
      await saveSetting('expand_notes', String(expandNotes), 'ai');
      await saveSetting('auto_extract', String(autoExtract), 'ai');
      await saveSetting('ai_model', aiModel, 'ai');

      // Apply theme immediately
      const root = document.documentElement;
      if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      showToast('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Initialize Git
  const initializeGit = async () => {
    try {
      await invoke('git_init', { dataPath: null });
      showToast('Git repository initialized', 'success');
      await loadSettings();
    } catch (error) {
      console.error('Failed to initialize git:', error);
      showToast('Failed to initialize Git', 'error');
    }
  };

  // Set remote URL
  const setGitRemote = async () => {
    if (!remoteUrl) {
      showToast('Please enter a remote URL', 'error');
      return;
    }
    try {
      await invoke('git_set_remote', { dataPath: null, remoteUrl });
      showToast('Remote URL set successfully', 'success');
      await loadSettings();
    } catch (error) {
      console.error('Failed to set remote:', error);
      showToast('Failed to set remote URL', 'error');
    }
  };

  // Initialize sync status (device registration)
  const initializeDevice = async () => {
    const deviceName = await getDeviceName();
    try {
      await invoke('init_sync_status', { deviceName });
      showToast('Device registered for sync', 'success');
      await loadSettings();
    } catch (error) {
      console.error('Failed to initialize device:', error);
      showToast('Failed to register device', 'error');
    }
  };

  // Get device name
  const getDeviceName = async (): Promise<string> => {
    // Try to get from hostname or use a default
    try {
      const hostname = window.location.hostname;
      if (hostname && hostname !== 'localhost') {
        return hostname;
      }
    } catch {
      // Ignore
    }
    return `Device-${Date.now().toString(36)}`;
  };

  // Format relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {(['general', 'sync', 'ai'] as SettingsTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-purple-400 border-b-2 border-purple-400 bg-gray-700/50'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
              }`}
            >
              {tab === 'general' && '⚙️ General'}
              {tab === 'sync' && '🔄 Sync'}
              {tab === 'ai' && '🤖 AI'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
              {/* General Tab */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">General Settings</h3>
                    
                    {/* Data Location */}
                    <div className="mb-4">
                      <label className="block text-sm text-gray-400 mb-2">Data Location</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={dataLocation}
                          onChange={(e) => setDataLocation(e.target.value)}
                          className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                          placeholder="~/FlowState-Data"
                        />
                        <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">
                          Browse...
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Where FlowState stores your projects and data
                      </p>
                    </div>

                    {/* Theme */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Theme</label>
                      <div className="flex gap-2">
                        {(['light', 'dark', 'system'] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setTheme(t)}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                              theme === t
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {t === 'light' && '☀️ Light'}
                            {t === 'dark' && '🌙 Dark'}
                            {t === 'system' && '💻 System'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sync Tab */}
              {activeTab === 'sync' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Sync Settings</h3>

                    {/* Status */}
                    <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-3 h-3 rounded-full ${
                          gitStatus?.initialized && gitStatus?.has_remote
                            ? 'bg-green-500'
                            : gitStatus?.initialized
                            ? 'bg-yellow-500'
                            : 'bg-gray-500'
                        }`} />
                        <span className="text-white font-medium">
                          {gitStatus?.initialized && gitStatus?.has_remote
                            ? 'Connected to GitHub'
                            : gitStatus?.initialized
                            ? 'Local repository (no remote)'
                            : 'Not initialized'}
                        </span>
                      </div>

                      {gitStatus?.initialized && gitStatus?.remote_url && (
                        <p className="text-sm text-gray-400">
                          Repository: <span className="text-gray-300">{gitStatus.remote_url}</span>
                        </p>
                      )}

                      {gitStatus?.last_commit && (
                        <p className="text-sm text-gray-400 mt-1">
                          Last commit: <span className="text-gray-300">{gitStatus.last_commit.message}</span>
                          <span className="text-gray-500 ml-2">({formatRelativeTime(gitStatus.last_commit.date)})</span>
                        </p>
                      )}

                      <div className="flex gap-2 mt-4">
                        {!gitStatus?.initialized && (
                          <button
                            onClick={initializeGit}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
                          >
                            Initialize Git
                          </button>
                        )}
                        {gitStatus?.initialized && !syncStatus && (
                          <button
                            onClick={initializeDevice}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
                          >
                            Register Device
                          </button>
                        )}
                        {gitStatus?.initialized && gitStatus?.has_remote && (
                          <button
                            onClick={() => window.open(gitStatus.remote_url || '', '_blank')}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm transition-colors"
                          >
                            View on GitHub
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Remote URL */}
                    {gitStatus?.initialized && (
                      <div className="mb-4">
                        <label className="block text-sm text-gray-400 mb-2">Remote Repository URL</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={remoteUrl}
                            onChange={(e) => setRemoteUrl(e.target.value)}
                            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                            placeholder="https://github.com/username/flowstate-data.git"
                          />
                          <button
                            onClick={setGitRemote}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                          >
                            {gitStatus?.has_remote ? 'Update' : 'Connect'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="border-t border-gray-700 my-4 pt-4">
                      {/* Auto-sync toggle */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <label className="text-sm text-white">Auto-sync</label>
                          <p className="text-xs text-gray-500">Automatically sync changes in the background</p>
                        </div>
                        <button
                          onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            autoSyncEnabled ? 'bg-purple-600' : 'bg-gray-600'
                          }`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              autoSyncEnabled ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Sync interval */}
                      {autoSyncEnabled && (
                        <div className="mb-4 ml-4">
                          <label className="block text-sm text-gray-400 mb-2">Sync Interval</label>
                          <select
                            value={autoSyncInterval}
                            onChange={(e) => setAutoSyncInterval(parseInt(e.target.value, 10))}
                            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                          >
                            <option value={5}>Every 5 minutes</option>
                            <option value={15}>Every 15 minutes</option>
                            <option value={30}>Every 30 minutes</option>
                            <option value={60}>Every hour</option>
                          </select>
                        </div>
                      )}

                      {/* Sync on close */}
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-sm text-white">Sync on app close</label>
                        <button
                          onClick={() => setSyncOnClose(!syncOnClose)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            syncOnClose ? 'bg-purple-600' : 'bg-gray-600'
                          }`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              syncOnClose ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Sync on open */}
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-white">Sync on app open</label>
                        <button
                          onClick={() => setSyncOnOpen(!syncOnOpen)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            syncOnOpen ? 'bg-purple-600' : 'bg-gray-600'
                          }`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              syncOnOpen ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Sync History */}
                    {gitHistory.length > 0 && (
                      <div className="border-t border-gray-700 mt-4 pt-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-3">Recent Sync History</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {gitHistory.slice(0, 5).map((commit) => (
                            <div key={commit.hash} className="flex items-start gap-2 text-sm">
                              <span className="text-gray-500 font-mono">{commit.hash.slice(0, 7)}</span>
                              <span className="text-gray-300 flex-1 truncate">{commit.message}</span>
                              <span className="text-gray-500 text-xs">{formatRelativeTime(commit.date)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Device info */}
                    {syncStatus && (
                      <div className="border-t border-gray-700 mt-4 pt-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">This Device</h4>
                        <p className="text-sm text-gray-400">
                          Name: <span className="text-gray-300">{syncStatus.device_name}</span>
                        </p>
                        <p className="text-sm text-gray-400">
                          ID: <span className="text-gray-500 font-mono text-xs">{syncStatus.device_id.slice(0, 8)}...</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Tab */}
              {activeTab === 'ai' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">AI Settings</h3>

                    {/* Enable AI toggle */}
                    <div className="flex items-center justify-between mb-6 p-4 bg-gray-700/50 rounded-lg">
                      <div>
                        <label className="text-white font-medium">Enable AI Features</label>
                        <p className="text-xs text-gray-400 mt-1">
                          Use Claude to enhance FlowState capabilities
                        </p>
                      </div>
                      <button
                        onClick={() => setAiEnabled(!aiEnabled)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          aiEnabled ? 'bg-purple-600' : 'bg-gray-600'
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            aiEnabled ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {aiEnabled && (
                      <>
                        {/* API Key */}
                        <div className="mb-6">
                          <label className="block text-sm text-gray-400 mb-2">API Key</label>
                          <div className="flex gap-2">
                            <div className="flex-1 relative">
                              <input
                                type={showApiKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 pr-10"
                                placeholder="sk-ant-api..."
                              />
                              <button
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                              >
                                {showApiKey ? '👁️' : '👁️‍🗨️'}
                              </button>
                            </div>
                            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">
                              Verify
                            </button>
                          </div>
                          {apiKey && (
                            <p className="text-xs text-green-400 mt-1">✓ API key configured</p>
                          )}
                        </div>

                        <div className="border-t border-gray-700 my-4 pt-4">
                          <h4 className="text-sm font-medium text-gray-300 mb-4">AI Features</h4>

                          {/* Auto-describe files */}
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <label className="text-sm text-white">Auto-describe attached files</label>
                              <p className="text-xs text-gray-500">Automatically generate AI descriptions for new files</p>
                            </div>
                            <button
                              onClick={() => setAutoDescribeFiles(!autoDescribeFiles)}
                              className={`relative w-12 h-6 rounded-full transition-colors ${
                                autoDescribeFiles ? 'bg-purple-600' : 'bg-gray-600'
                              }`}
                            >
                              <div
                                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                  autoDescribeFiles ? 'translate-x-7' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>

                          {/* Suggest related */}
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <label className="text-sm text-white">Suggest related items</label>
                              <p className="text-xs text-gray-500">Show AI-powered related problems and learnings</p>
                            </div>
                            <button
                              onClick={() => setSuggestRelated(!suggestRelated)}
                              className={`relative w-12 h-6 rounded-full transition-colors ${
                                suggestRelated ? 'bg-purple-600' : 'bg-gray-600'
                              }`}
                            >
                              <div
                                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                  suggestRelated ? 'translate-x-7' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>

                          {/* Expand notes */}
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <label className="text-sm text-white">Expand notes on request</label>
                              <p className="text-xs text-gray-500">Offer to expand brief notes into detailed descriptions</p>
                            </div>
                            <button
                              onClick={() => setExpandNotes(!expandNotes)}
                              className={`relative w-12 h-6 rounded-full transition-colors ${
                                expandNotes ? 'bg-purple-600' : 'bg-gray-600'
                              }`}
                            >
                              <div
                                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                  expandNotes ? 'translate-x-7' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>

                          {/* Auto-extract */}
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-sm text-white">Auto-extract from documents</label>
                              <p className="text-xs text-gray-500">Automatically suggest extractions (requires confirmation)</p>
                            </div>
                            <button
                              onClick={() => setAutoExtract(!autoExtract)}
                              className={`relative w-12 h-6 rounded-full transition-colors ${
                                autoExtract ? 'bg-purple-600' : 'bg-gray-600'
                              }`}
                            >
                              <div
                                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                  autoExtract ? 'translate-x-7' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Model selection */}
                        <div className="border-t border-gray-700 mt-4 pt-4">
                          <label className="block text-sm text-gray-400 mb-2">Model</label>
                          <select
                            value={aiModel}
                            onChange={(e) => setAiModel(e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 w-full"
                          >
                            <option value="claude-haiku">Claude Haiku (Fast)</option>
                            <option value="claude-sonnet">Claude Sonnet (Balanced)</option>
                            <option value="claude-opus">Claude Opus (Most capable)</option>
                          </select>
                        </div>

                        {/* Usage estimate */}
                        <div className="mt-4 p-3 bg-gray-700/30 rounded-lg">
                          <p className="text-xs text-gray-400">
                            Estimated monthly usage: <span className="text-gray-300">~$2-5</span> (varies with activity)
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={saveAllSettings}
            disabled={saving}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {saving && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            } text-white text-sm`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;
