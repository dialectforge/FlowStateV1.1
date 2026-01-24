/**
 * SyncStatusBar - Bottom status bar for FlowState v1.1
 * 
 * Shows:
 * - Sync status indicator (synced/pending/conflict)
 * - Last sync time and device
 * - Pending changes count
 * - "Sync Now" button
 */

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  Check,
  Clock,
  Laptop,
  GitBranch,
  ChevronUp,
  X,
  History,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface SyncStatus {
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

interface SyncHistory {
  id: number;
  device_id: string;
  operation: string;
  commit_hash?: string;
  files_changed?: number;
  status?: string;
  error_message?: string;
  created_at: string;
}

interface GitStatus {
  is_repo: boolean;
  has_remote: boolean;
  remote_url?: string;
  current_branch?: string;
  pending_changes: number;
  last_commit?: string;
  last_commit_time?: string;
}

type SyncState = 'synced' | 'pending' | 'syncing' | 'conflict' | 'disconnected' | 'error';

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const formatRelativeTime = (dateStr?: string): string => {
  if (!dateStr) return 'Never';
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getSyncStateInfo = (status: SyncStatus | null, gitStatus: GitStatus | null): { state: SyncState; message: string } => {
  if (!gitStatus?.is_repo) {
    return { state: 'disconnected', message: 'Git not initialized' };
  }
  
  if (!gitStatus?.has_remote) {
    return { state: 'disconnected', message: 'No remote configured' };
  }
  
  if (status?.has_conflicts) {
    return { state: 'conflict', message: 'Sync conflict detected' };
  }
  
  if ((status?.pending_changes ?? 0) > 0 || (gitStatus?.pending_changes ?? 0) > 0) {
    const changes = status?.pending_changes || gitStatus?.pending_changes || 0;
    return { state: 'pending', message: `${changes} pending change${changes > 1 ? 's' : ''}` };
  }
  
  return { state: 'synced', message: 'All changes synced' };
};

// ============================================================
// SYNC HISTORY PANEL
// ============================================================

interface SyncHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: SyncHistory[];
  loading: boolean;
}

function SyncHistoryPanel({ isOpen, onClose, history, loading }: SyncHistoryPanelProps) {
  if (!isOpen) return null;
  
  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-64 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <History className="w-4 h-4 text-purple-400" />
          Sync History
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No sync history yet
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {history.map((item) => (
              <div key={item.id} className="px-3 py-2 hover:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.status === 'success' ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : item.status === 'error' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    <span className="text-sm text-white capitalize">{item.operation}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatRelativeTime(item.created_at)}
                  </span>
                </div>
                {item.files_changed !== null && item.files_changed !== undefined && (
                  <div className="text-xs text-gray-500 mt-1 ml-5">
                    {item.files_changed} file{item.files_changed !== 1 ? 's' : ''} changed
                  </div>
                )}
                {item.error_message && (
                  <div className="text-xs text-red-400 mt-1 ml-5 truncate">
                    {item.error_message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function SyncStatusBar() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load sync status
  const loadSyncStatus = useCallback(async () => {
    try {
      const status = await invoke<SyncStatus>('get_sync_status');
      setSyncStatus(status);
    } catch (err) {
      // Sync status might not exist yet - that's okay
      console.log('Sync status not initialized yet');
    }
  }, []);

  // Load git status
  const loadGitStatus = useCallback(async () => {
    try {
      const status = await invoke<GitStatus>('git_status');
      setGitStatus(status);
    } catch (err) {
      // Git might not be initialized - that's okay
      console.log('Git not initialized');
    }
  }, []);

  // Load sync history
  const loadSyncHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const history = await invoke<SyncHistory[]>('get_sync_history', { limit: 20 });
      setSyncHistory(history);
    } catch (err) {
      console.error('Failed to load sync history:', err);
    }
    setHistoryLoading(false);
  }, []);

  // Initial load and periodic refresh
  useEffect(() => {
    loadSyncStatus();
    loadGitStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadSyncStatus();
      loadGitStatus();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadSyncStatus, loadGitStatus]);

  // Load history when panel opens
  useEffect(() => {
    if (showHistory) {
      loadSyncHistory();
    }
  }, [showHistory, loadSyncHistory]);

  // Listen for sync event from menu
  useEffect(() => {
    const handleMenuSync = () => {
      handleSync();
    };
    window.addEventListener('flowstate-sync', handleMenuSync);
    return () => window.removeEventListener('flowstate-sync', handleMenuSync);
  }, []);

  // Perform sync
  const handleSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    setError(null);
    
    try {
      await invoke('git_sync', { commitMessage: null });
      await loadSyncStatus();
      await loadGitStatus();
      if (showHistory) {
        await loadSyncHistory();
      }
    } catch (err: any) {
      setError(err.toString());
      console.error('Sync failed:', err);
    }
    
    setIsSyncing(false);
  };

  // Get current state
  const { state, message } = isSyncing 
    ? { state: 'syncing' as SyncState, message: 'Syncing...' }
    : error 
    ? { state: 'error' as SyncState, message: 'Sync failed' }
    : getSyncStateInfo(syncStatus, gitStatus);

  // Status indicator color and icon
  const getStatusIndicator = () => {
    switch (state) {
      case 'synced':
        return { icon: <Cloud className="w-4 h-4" />, color: 'text-green-400', bgColor: 'bg-green-400' };
      case 'pending':
        return { icon: <Cloud className="w-4 h-4" />, color: 'text-yellow-400', bgColor: 'bg-yellow-400' };
      case 'syncing':
        return { icon: <RefreshCw className="w-4 h-4 animate-spin" />, color: 'text-purple-400', bgColor: 'bg-purple-400' };
      case 'conflict':
        return { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-400', bgColor: 'bg-red-400' };
      case 'error':
        return { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-400', bgColor: 'bg-red-400' };
      case 'disconnected':
      default:
        return { icon: <CloudOff className="w-4 h-4" />, color: 'text-gray-500', bgColor: 'bg-gray-500' };
    }
  };

  const indicator = getStatusIndicator();

  return (
    <div className="relative flex-shrink-0 h-8 bg-gray-850 border-t border-gray-800 px-4 flex items-center justify-between text-xs select-none"
         style={{ backgroundColor: '#1a1a2e' }}>
      {/* Left side - Sync status */}
      <div className="flex items-center gap-3">
        {/* Status indicator dot */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${indicator.bgColor}`} />
          <span className={indicator.color}>{indicator.icon}</span>
          <span className="text-gray-400">{message}</span>
        </div>
        
        {/* Last sync info */}
        {syncStatus?.last_sync_at && (
          <div className="flex items-center gap-1.5 text-gray-500 border-l border-gray-700 pl-3">
            <Clock className="w-3 h-3" />
            <span>Last sync: {formatRelativeTime(syncStatus.last_sync_at)}</span>
          </div>
        )}
        
        {/* Device info */}
        {syncStatus?.device_name && (
          <div className="flex items-center gap-1.5 text-gray-500">
            <Laptop className="w-3 h-3" />
            <span>{syncStatus.device_name}</span>
          </div>
        )}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {/* Branch info */}
        {gitStatus?.current_branch && (
          <div className="flex items-center gap-1.5 text-gray-500 mr-2">
            <GitBranch className="w-3 h-3" />
            <span>{gitStatus.current_branch}</span>
          </div>
        )}
        
        {/* History button */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
            showHistory ? 'bg-gray-700 text-purple-400' : 'text-gray-400 hover:text-white'
          }`}
          title="Sync History"
        >
          <ChevronUp className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
        </button>
        
        {/* Sync button */}
        <button
          onClick={handleSync}
          disabled={isSyncing || state === 'disconnected'}
          className={`
            px-3 py-1 rounded flex items-center gap-1.5 font-medium transition-colors
            ${isSyncing || state === 'disconnected'
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : state === 'pending' || state === 'conflict'
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }
          `}
          title={state === 'disconnected' ? 'Connect to GitHub first' : 'Sync Now (⌘S)'}
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync'}
        </button>
      </div>

      {/* Sync History Panel */}
      <SyncHistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={syncHistory}
        loading={historyLoading}
      />
      
      {/* Error toast */}
      {error && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-2 bg-red-500/90 text-white rounded-lg shadow-lg flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 p-0.5 hover:bg-red-400/50 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export default SyncStatusBar;
