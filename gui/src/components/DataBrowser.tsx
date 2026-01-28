/**
 * DataBrowser.tsx - Raw database table browser
 * v1.2: Complete visibility into all database tables
 * 
 * Shows every table in the database with full CRUD capabilities
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../stores/appStore';

// All database tables
const TABLES = [
  { name: 'projects', label: 'Projects', icon: '📁' },
  { name: 'components', label: 'Components', icon: '🧩' },
  { name: 'problems', label: 'Problems', icon: '🔴' },
  { name: 'solution_attempts', label: 'Solution Attempts', icon: '🔄' },
  { name: 'solutions', label: 'Solutions', icon: '✅' },
  { name: 'todos', label: 'Todos', icon: '📋' },
  { name: 'learnings', label: 'Learnings', icon: '💡' },
  { name: 'changes', label: 'Changes', icon: '📝' },
  { name: 'conversations', label: 'Conversations', icon: '💬' },
  { name: 'sessions', label: 'Sessions', icon: '⏱️' },
  { name: 'cross_references', label: 'Cross References', icon: '🔗' },
  { name: 'attachments', label: 'Attachments', icon: '📎' },
  { name: 'content_locations', label: 'Content Locations', icon: '📍' },
  { name: 'extractions', label: 'Extractions', icon: '🔬' },
  { name: 'project_variables', label: 'Project Variables', icon: '⚙️' },
  { name: 'project_methods', label: 'Project Methods', icon: '📖' },
  { name: 'settings', label: 'Settings', icon: '🔧' },
  { name: 'sync_status', label: 'Sync Status', icon: '🔄' },
  { name: 'sync_history', label: 'Sync History', icon: '📜' },
  { name: 'embeddings', label: 'Embeddings', icon: '🧠' },
];

interface TableData {
  columns: string[];
  rows: Record<string, any>[];
  count: number;
}

export function DataBrowser() {
  const { selectedProjectId, dbPath } = useAppStore();
  const [selectedTable, setSelectedTable] = useState<string>('projects');
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<Record<string, any> | null>(null);
  const [filterProjectOnly, setFilterProjectOnly] = useState(true);

  // Load table data
  useEffect(() => {
    loadTableData();
  }, [selectedTable, selectedProjectId, filterProjectOnly]);

  const loadTableData = async () => {
    setLoading(true);
    setError(null);
    try {
      const projectFilter = filterProjectOnly && selectedProjectId ? selectedProjectId : null;
      const data = await invoke<TableData>('get_table_data', {
        dbPath,
        tableName: selectedTable,
        projectId: projectFilter,
      });
      setTableData(data);
    } catch (err) {
      setError(String(err));
      setTableData(null);
    } finally {
      setLoading(false);
    }
  };

  const deleteRow = async (id: number) => {
    if (!confirm(`Delete row ${id} from ${selectedTable}?`)) return;
    try {
      await invoke('delete_table_row', {
        dbPath,
        tableName: selectedTable,
        rowId: id,
      });
      loadTableData();
    } catch (err) {
      setError(String(err));
    }
  };

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    if (typeof value === 'object') return JSON.stringify(value);
    const str = String(value);
    if (str.length > 100) return str.substring(0, 100) + '...';
    return str;
  };

  const getTableInfo = (name: string) => {
    return TABLES.find(t => t.name === name) || { name, label: name, icon: '📄' };
  };

  return (
    <div className="h-full flex bg-gray-900">
      {/* Sidebar - Table List */}
      <div className="w-64 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            🗄️ Data Browser
          </h2>
          <p className="text-xs text-gray-500 mt-1">All database tables</p>
        </div>

        {/* Filter toggle */}
        <div className="p-3 border-b border-gray-700">
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={filterProjectOnly}
              onChange={(e) => setFilterProjectOnly(e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            Filter by current project
          </label>
        </div>

        {/* Table list */}
        <div className="flex-1 overflow-y-auto">
          {TABLES.map((table) => (
            <button
              key={table.name}
              onClick={() => setSelectedTable(table.name)}
              className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-800 transition-colors ${
                selectedTable === table.name ? 'bg-gray-800 border-l-2 border-purple-500' : ''
              }`}
            >
              <span>{table.icon}</span>
              <span className={`text-sm ${selectedTable === table.name ? 'text-white' : 'text-gray-400'}`}>
                {table.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content - Table Data */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              {getTableInfo(selectedTable).icon} {getTableInfo(selectedTable).label}
            </h1>
            {tableData && (
              <p className="text-sm text-gray-500 mt-1">
                {tableData.count} rows • {tableData.columns.length} columns
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadTableData}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300"
            >
              ↻ Refresh
            </button>
            <button
              onClick={() => setEditingRow({})}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm text-white"
            >
              + Add Row
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-900/30 border-b border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Loading...
          </div>
        )}

        {/* Table */}
        {!loading && tableData && (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-800 z-10">
                <tr>
                  {tableData.columns.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-700"
                    >
                      {col}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    className="hover:bg-gray-800/50 border-b border-gray-800"
                  >
                    {tableData.columns.map((col) => (
                      <td
                        key={col}
                        className="px-3 py-2 text-gray-300 font-mono text-xs max-w-xs truncate"
                        title={String(row[col])}
                      >
                        {formatCellValue(row[col])}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingRow(row)}
                          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="px-2 py-1 text-xs bg-red-900/50 hover:bg-red-800 rounded text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tableData.rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={tableData.columns.length + 1}
                      className="px-3 py-8 text-center text-gray-500"
                    >
                      No data in this table
                      {filterProjectOnly && selectedProjectId && ' (filtered by project)'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit Modal */}
        {editingRow && (
          <EditRowModal
            tableName={selectedTable}
            columns={tableData?.columns || []}
            row={editingRow}
            onClose={() => setEditingRow(null)}
            onSave={() => {
              setEditingRow(null);
              loadTableData();
            }}
          />
        )}
      </div>
    </div>
  );
}

// Edit/Create Row Modal
function EditRowModal({
  tableName,
  columns,
  row,
  onClose,
  onSave,
}: {
  tableName: string;
  columns: string[];
  row: Record<string, any>;
  onClose: () => void;
  onSave: () => void;
}) {
  const { dbPath } = useAppStore();
  const [formData, setFormData] = useState<Record<string, any>>(row);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNew = !row.id;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        await invoke('insert_table_row', {
          dbPath,
          tableName,
          data: formData,
        });
      } else {
        await invoke('update_table_row', {
          dbPath,
          tableName,
          rowId: row.id,
          data: formData,
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
      <div className="w-full max-w-2xl max-h-[80vh] bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {isNew ? 'Add Row' : 'Edit Row'} - {tableName}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ×
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-900/30 border-b border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {columns
            .filter((col) => col !== 'id' || !isNew) // Hide id for new rows
            .map((col) => (
              <div key={col}>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  {col}
                  {col === 'id' && <span className="text-gray-600 ml-2">(read-only)</span>}
                </label>
                {col === 'id' ? (
                  <input
                    type="text"
                    value={formData[col] || ''}
                    disabled
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-gray-500 font-mono text-sm"
                  />
                ) : (
                  <textarea
                    value={formData[col] ?? ''}
                    onChange={(e) => setFormData({ ...formData, [col]: e.target.value })}
                    rows={col.includes('description') || col.includes('summary') || col.includes('snippet') ? 4 : 1}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white font-mono text-sm focus:border-purple-500 focus:outline-none"
                  />
                )}
              </div>
            ))}
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

export default DataBrowser;
