/**
 * ConversationsView.tsx - Claude interaction history
 * v1.2: View all logged conversations with Claude
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore, Conversation } from '../stores/appStore';

export function ConversationsView() {
  const { selectedProjectId, dbPath } = useAppStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [showNewConv, setShowNewConv] = useState(false);

  useEffect(() => {
    if (selectedProjectId) {
      loadConversations();
    }
  }, [selectedProjectId]);

  const loadConversations = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const data = await invoke<Conversation[]>('get_conversations', {
        dbPath,
        projectId: selectedProjectId,
      });
      setConversations(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (id: number) => {
    if (!confirm('Delete this conversation?')) return;
    try {
      await invoke('delete_conversation', { dbPath, conversationId: id });
      loadConversations();
      if (selectedConv?.id === id) setSelectedConv(null);
    } catch (err) {
      setError(String(err));
    }
  };

  const parseJSON = (str?: string): any[] => {
    if (!str) return [];
    try {
      return JSON.parse(str);
    } catch {
      return [];
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (!selectedProjectId) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-gray-500">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <p>Select a project to view conversations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gray-900">
      {/* Conversation List */}
      <div className="w-96 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              💬 Conversations
            </h2>
            <p className="text-xs text-gray-500 mt-1">{conversations.length} logged</p>
          </div>
          <button
            onClick={() => setShowNewConv(true)}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm text-white"
          >
            + Log
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-900/30 text-red-300 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Loading...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="mb-2">No conversations logged yet</p>
                <p className="text-xs">Use the MCP server or click "Log" to add</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`w-full p-4 text-left border-b border-gray-800 hover:bg-gray-800 transition-colors ${
                    selectedConv?.id === conv.id ? 'bg-gray-800 border-l-2 border-purple-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-white font-medium text-sm line-clamp-1">
                      {conv.user_prompt_summary}
                    </span>
                    <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                      {formatDate(conv.created_at)}
                    </span>
                  </div>
                  {conv.assistant_response_summary && (
                    <p className="text-gray-400 text-xs line-clamp-2">
                      {conv.assistant_response_summary}
                    </p>
                  )}
                  {parseJSON(conv.key_decisions).length > 0 && (
                    <div className="mt-2 flex items-center gap-1">
                      <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded">
                        {parseJSON(conv.key_decisions).length} decisions
                      </span>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Conversation Detail */}
      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Conversation Detail</h2>
                <p className="text-xs text-gray-500">
                  {new Date(selectedConv.created_at).toLocaleString()}
                  {selectedConv.session_id && ` • Session: ${selectedConv.session_id}`}
                </p>
              </div>
              <button
                onClick={() => deleteConversation(selectedConv.id)}
                className="px-3 py-1 bg-red-900/50 hover:bg-red-800 rounded text-sm text-red-300"
              >
                Delete
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* User Prompt */}
              <div className="bg-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">👤</span>
                  <span className="font-semibold text-white">User Prompt</span>
                </div>
                <p className="text-gray-300">{selectedConv.user_prompt_summary}</p>
              </div>

              {/* Assistant Response */}
              {selectedConv.assistant_response_summary && (
                <div className="bg-purple-900/20 border border-purple-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🤖</span>
                    <span className="font-semibold text-white">Claude's Response</span>
                  </div>
                  <p className="text-gray-300">{selectedConv.assistant_response_summary}</p>
                </div>
              )}

              {/* Key Decisions */}
              {parseJSON(selectedConv.key_decisions).length > 0 && (
                <div className="bg-gray-800 rounded-xl p-4">
                  <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    ⚡ Key Decisions
                  </h3>
                  <ul className="space-y-2">
                    {parseJSON(selectedConv.key_decisions).map((decision: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-300">
                        <span className="text-purple-400">•</span>
                        {decision}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* References */}
              <div className="grid grid-cols-2 gap-4">
                {parseJSON(selectedConv.problems_referenced).length > 0 && (
                  <div className="bg-gray-800 rounded-xl p-4">
                    <h3 className="font-semibold text-white mb-2 text-sm">🔴 Problems Referenced</h3>
                    <p className="text-gray-400 text-sm">
                      IDs: {parseJSON(selectedConv.problems_referenced).join(', ')}
                    </p>
                  </div>
                )}
                {parseJSON(selectedConv.solutions_created).length > 0 && (
                  <div className="bg-gray-800 rounded-xl p-4">
                    <h3 className="font-semibold text-white mb-2 text-sm">✅ Solutions Created</h3>
                    <p className="text-gray-400 text-sm">
                      IDs: {parseJSON(selectedConv.solutions_created).join(', ')}
                    </p>
                  </div>
                )}
              </div>

              {/* Tokens */}
              {selectedConv.tokens_used && (
                <div className="text-sm text-gray-500">
                  Tokens used: {selectedConv.tokens_used.toLocaleString()}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-6xl mb-4">👈</div>
              <p>Select a conversation to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewConv && (
        <NewConversationModal
          onClose={() => setShowNewConv(false)}
          onSave={() => {
            setShowNewConv(false);
            loadConversations();
          }}
        />
      )}
    </div>
  );
}

// New Conversation Modal
function NewConversationModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: () => void;
}) {
  const { selectedProjectId, dbPath } = useAppStore();
  const [userPrompt, setUserPrompt] = useState('');
  const [assistantResponse, setAssistantResponse] = useState('');
  const [keyDecisions, setKeyDecisions] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!userPrompt.trim()) {
      setError('User prompt is required');
      return;
    }
    setSaving(true);
    try {
      const decisions = keyDecisions
        .split('\n')
        .map((d) => d.trim())
        .filter((d) => d);
      await invoke('create_conversation', {
        dbPath,
        projectId: selectedProjectId,
        userPromptSummary: userPrompt,
        assistantResponseSummary: assistantResponse || null,
        keyDecisions: decisions.length > 0 ? JSON.stringify(decisions) : null,
      });
      onSave();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Log Conversation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
        </div>

        {error && (
          <div className="p-3 bg-red-900/30 text-red-300 text-sm">{error}</div>
        )}

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              User Prompt Summary *
            </label>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white"
              placeholder="What did you ask Claude?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Claude's Response Summary
            </label>
            <textarea
              value={assistantResponse}
              onChange={(e) => setAssistantResponse(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white"
              placeholder="What did Claude respond?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Key Decisions (one per line)
            </label>
            <textarea
              value={keyDecisions}
              onChange={(e) => setKeyDecisions(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white font-mono text-sm"
              placeholder="Decided to use approach X&#10;Rejected option Y&#10;Will implement Z next"
            />
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
            {saving ? 'Saving...' : 'Log Conversation'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConversationsView;
