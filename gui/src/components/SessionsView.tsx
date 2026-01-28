/**
 * SessionsView.tsx - Work session history
 * v1.2: View and manage work sessions
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore, Session } from '../stores/appStore';

export function SessionsView() {
  const { selectedProjectId, dbPath, components, problems } = useAppStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  useEffect(() => {
    if (selectedProjectId) {
      loadSessions();
    }
  }, [selectedProjectId]);

  const loadSessions = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const data = await invoke<Session[]>('get_sessions', {
        dbPath,
        projectId: selectedProjectId,
      });
      setSessions(data);
      // Check for active session
      const active = data.find(s => !s.ended_at);
      setActiveSession(active || null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const startSession = async (focusComponentId?: number, focusProblemId?: number) => {
    try {
      await invoke('start_session', {
        dbPath,
        projectId: selectedProjectId,
        focusComponentId: focusComponentId || null,
        focusProblemId: focusProblemId || null,
      });
      loadSessions();
    } catch (err) {
      setError(String(err));
    }
  };

  const endSession = async (sessionId: number, summary?: string) => {
    try {
      await invoke('end_session', {
        dbPath,
        sessionId,
        summary: summary || null,
      });
      loadSessions();
    } catch (err) {
      setError(String(err));
    }
  };

  const deleteSession = async (id: number) => {
    if (!confirm('Delete this session?')) return;
    try {
      await invoke('delete_session', { dbPath, sessionId: id });
      loadSessions();
      if (selectedSession?.id === id) setSelectedSession(null);
    } catch (err) {
      setError(String(err));
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const calculateDuration = (session: Session) => {
    if (session.duration_minutes) return session.duration_minutes;
    if (!session.ended_at) {
      const start = new Date(session.started_at);
      const now = new Date();
      return Math.floor((now.getTime() - start.getTime()) / 60000);
    }
    const start = new Date(session.started_at);
    const end = new Date(session.ended_at);
    return Math.floor((end.getTime() - start.getTime()) / 60000);
  };

  const getComponentName = (id?: number) => {
    if (!id) return null;
    return components.find(c => c.id === id)?.name;
  };

  const getProblemTitle = (id?: number) => {
    if (!id) return null;
    return problems.find(p => p.id === id)?.title;
  };

  const parseOutcomes = (outcomes?: string): string[] => {
    if (!outcomes) return [];
    try {
      return JSON.parse(outcomes);
    } catch {
      return [];
    }
  };

  // Stats
  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + (calculateDuration(s) || 0), 0);
  const avgDuration = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;

  if (!selectedProjectId) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-gray-500">
        <div className="text-center">
          <div className="text-6xl mb-4">⏱️</div>
          <p>Select a project to view sessions</p>
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
              ⏱️ Work Sessions
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Track your development time
            </p>
          </div>
          {activeSession ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm text-green-400">🟢 Session Active</div>
                <div className="text-xs text-gray-500">
                  {formatDuration(calculateDuration(activeSession))} elapsed
                </div>
              </div>
              <button
                onClick={() => {
                  const summary = prompt('Session summary (optional):');
                  endSession(activeSession.id, summary || undefined);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
              >
                End Session
              </button>
            </div>
          ) : (
            <button
              onClick={() => startSession()}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white"
            >
              ▶ Start Session
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-white">{totalSessions}</div>
            <div className="text-xs text-gray-500">Total Sessions</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-white">{formatDuration(totalMinutes)}</div>
            <div className="text-xs text-gray-500">Total Time</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-white">{formatDuration(avgDuration)}</div>
            <div className="text-xs text-gray-500">Avg Duration</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 text-red-300 text-sm">{error}</div>
      )}

      {/* Session List */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Loading sessions...
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          {sessions.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <div className="text-6xl mb-4">🕐</div>
              <p>No sessions recorded yet</p>
              <p className="text-sm mt-2">Click "Start Session" to begin tracking</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`bg-gray-800 rounded-xl p-4 border ${
                    !session.ended_at ? 'border-green-500' : 'border-gray-700'
                  } hover:border-gray-600 transition-colors`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {!session.ended_at ? (
                          <span className="text-xs bg-green-900/50 text-green-300 px-2 py-0.5 rounded-full">
                            🟢 Active
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
                            Completed
                          </span>
                        )}
                        <span className="text-white font-medium">
                          {formatDuration(calculateDuration(session))}
                        </span>
                      </div>

                      <div className="text-sm text-gray-400 mb-2">
                        {new Date(session.started_at).toLocaleString()}
                        {session.ended_at && (
                          <> → {new Date(session.ended_at).toLocaleTimeString()}</>
                        )}
                      </div>

                      {/* Focus */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {session.focus_component_id && (
                          <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded">
                            🧩 {getComponentName(session.focus_component_id)}
                          </span>
                        )}
                        {session.focus_problem_id && (
                          <span className="text-xs bg-red-900/50 text-red-300 px-2 py-1 rounded">
                            🔴 {getProblemTitle(session.focus_problem_id)}
                          </span>
                        )}
                      </div>

                      {/* Summary */}
                      {session.summary && (
                        <p className="text-gray-300 text-sm mb-2">{session.summary}</p>
                      )}

                      {/* Outcomes */}
                      {parseOutcomes(session.outcomes).length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-500 mb-1">Outcomes:</div>
                          <ul className="text-xs text-gray-400 space-y-1">
                            {parseOutcomes(session.outcomes).map((outcome, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="text-green-400">✓</span>
                                {outcome}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => deleteSession(session.id)}
                      className="text-gray-500 hover:text-red-400 text-sm ml-4"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SessionsView;
