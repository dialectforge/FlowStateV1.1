/**
 * FilesView - Files & Attachments View for FlowState v1.1
 * 
 * Features:
 * - Display all file attachments for current project
 * - Drag-and-drop file upload
 * - Filter by file type and component
 * - AI-generated descriptions and content locations
 * - File preview for supported types
 * - Extract mode to convert files into structured records
 */

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import {
  ArrowLeft,
  FileText,
  Image,
  FileCode,
  File,
  Search,
  Filter,
  Trash2,
  Eye,
  Sparkles,
  MapPin,
  Tag,
  Calendar,
  HardDrive,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Upload,
  X,
  RefreshCw,
  FolderOpen,
  FileArchive,
  FileSpreadsheet,
} from 'lucide-react';
import { useAppStore, Component } from '../stores/appStore';

// ============================================================
// TYPES
// ============================================================

interface Attachment {
  id: number;
  project_id: number;
  component_id?: number;
  problem_id?: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size?: number;
  file_hash?: string;
  is_external: boolean;
  user_description?: string;
  tags?: string;
  ai_description?: string;
  ai_summary?: string;
  content_extracted: boolean;
  created_at: string;
  updated_at: string;
  indexed_at?: string;
}

interface ContentLocation {
  id: number;
  attachment_id: number;
  description: string;
  category?: string;
  location_type: string;
  start_location: string;
  end_location?: string;
  snippet?: string;
  related_problem_id?: number;
  related_solution_id?: number;
  related_learning_id?: number;
  related_component_id?: number;
  created_at: string;
}

type FileTypeFilter = 'all' | 'document' | 'image' | 'code' | 'other';

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileType: string) => {
  const type = fileType.toLowerCase();
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'].includes(type)) {
    return <FileText className="w-5 h-5 text-blue-400" />;
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(type)) {
    return <Image className="w-5 h-5 text-green-400" />;
  }
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'rs', 'swift', 'java', 'c', 'cpp', 'h', 'go', 'rb', 'php', 'html', 'css', 'sql', 'json', 'xml', 'yaml', 'yml', 'toml'].includes(type)) {
    return <FileCode className="w-5 h-5 text-purple-400" />;
  }
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(type)) {
    return <FileArchive className="w-5 h-5 text-yellow-400" />;
  }
  if (['csv', 'xlsx', 'xls'].includes(type)) {
    return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
  }
  return <File className="w-5 h-5 text-gray-400" />;
};

const getFileTypeCategory = (fileType: string): FileTypeFilter => {
  const type = fileType.toLowerCase();
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'].includes(type)) return 'document';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(type)) return 'image';
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'rs', 'swift', 'java', 'c', 'cpp', 'h', 'go', 'rb', 'php', 'html', 'css', 'sql', 'json', 'xml', 'yaml', 'yml', 'toml'].includes(type)) return 'code';
  return 'other';
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// ============================================================
// FILE CARD COMPONENT
// ============================================================

interface FileCardProps {
  attachment: Attachment;
  components: Component[];
  onView: (attachment: Attachment) => void;
  onRemove: (attachment: Attachment) => void;
  onDescribe: (attachment: Attachment) => void;
  onExtract: (attachment: Attachment) => void;
}

function FileCard({ attachment, components, onView, onRemove, onDescribe, onExtract }: FileCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [locations, setLocations] = useState<ContentLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const componentName = components.find(c => c.id === attachment.component_id)?.name;
  const tags = attachment.tags ? JSON.parse(attachment.tags) : [];

  const loadLocations = async () => {
    if (locations.length > 0) return;
    setLoadingLocations(true);
    try {
      const locs = await invoke<ContentLocation[]>('get_content_locations', {
        attachmentId: attachment.id,
      });
      setLocations(locs);
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
    setLoadingLocations(false);
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      loadLocations();
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-all">
      {/* Main content */}
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* File icon */}
          <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
            {getFileIcon(attachment.file_type)}
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-white truncate">{attachment.file_name}</h3>
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 uppercase">
                {attachment.file_type}
              </span>
              {attachment.is_external && (
                <span title="External file">
                  <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                </span>
              )}
            </div>

            {/* Description */}
            {attachment.ai_description ? (
              <p className="text-sm text-gray-300 mb-2 line-clamp-2">
                <Sparkles className="w-3 h-3 inline mr-1 text-purple-400" />
                {attachment.ai_description}
              </p>
            ) : attachment.user_description ? (
              <p className="text-sm text-gray-400 mb-2 line-clamp-2">{attachment.user_description}</p>
            ) : (
              <p className="text-sm text-gray-500 italic mb-2">No description</p>
            )}

            {/* Meta info row */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {formatFileSize(attachment.file_size)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(attachment.created_at)}
              </span>
              {componentName && (
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                  {componentName}
                </span>
              )}
              {attachment.content_extracted && (
                <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                  Extracted
                </span>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag: string, i: number) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 text-xs flex items-center gap-1"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onView(attachment)}
              className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              title="View file"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDescribe(attachment)}
              className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-purple-400 transition-colors"
              title="AI Describe"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              onClick={() => onExtract(attachment)}
              className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-green-400 transition-colors"
              title="Extract to Database"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => onRemove(attachment)}
              className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors"
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expand for key locations */}
        {attachment.ai_description && (
          <button
            onClick={handleExpand}
            className="mt-3 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <MapPin className="w-3 h-3" />
            Key Locations ({loadingLocations ? '...' : locations.length})
          </button>
        )}
      </div>

      {/* Expanded content - Key locations */}
      {isExpanded && (
        <div className="border-t border-gray-700 px-4 py-3 bg-gray-800/50">
          {loadingLocations ? (
            <div className="text-sm text-gray-500">Loading locations...</div>
          ) : locations.length === 0 ? (
            <div className="text-sm text-gray-500 italic">No key locations indexed yet</div>
          ) : (
            <div className="space-y-2">
              {locations.map(loc => (
                <div key={loc.id} className="flex items-start gap-2 text-sm">
                  <span className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 text-xs">
                    {loc.location_type === 'page' ? `p.${loc.start_location}` : 
                     loc.location_type === 'line' ? `L${loc.start_location}` :
                     loc.start_location}
                  </span>
                  <span className="text-gray-300">{loc.description}</span>
                  {loc.category && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs">
                      {loc.category}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// FILE PREVIEW MODAL
// ============================================================

interface FilePreviewModalProps {
  attachment: Attachment | null;
  onClose: () => void;
}

function FilePreviewModal({ attachment, onClose }: FilePreviewModalProps) {
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attachment) return;
    
    const loadContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await invoke<any>('read_file_content', {
          filePath: attachment.file_path,
          fileType: attachment.file_type,
        });
        setContent(result);
      } catch (err: any) {
        setError(err.toString());
      }
      setLoading(false);
    };
    
    loadContent();
  }, [attachment]);

  if (!attachment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            {getFileIcon(attachment.file_type)}
            <div>
              <h2 className="font-semibold text-white">{attachment.file_name}</h2>
              <p className="text-sm text-gray-400">{formatFileSize(attachment.file_size)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-red-400 text-center py-8">
              <p className="font-medium mb-2">Failed to load file</p>
              <p className="text-sm text-gray-500">{error}</p>
            </div>
          ) : content ? (
            <>
              {content.type === 'text' && (
                <pre className="bg-gray-900 rounded-lg p-4 overflow-auto text-sm text-gray-300 font-mono whitespace-pre-wrap">
                  {content.content}
                </pre>
              )}
              {content.type === 'image' && (
                <div className="flex justify-center">
                  <img
                    src={`data:${content.mime_type};base64,${content.content}`}
                    alt={attachment.file_name}
                    className="max-w-full max-h-[60vh] rounded-lg"
                  />
                </div>
              )}
              {content.type === 'pdf' && (
                <div className="text-center py-8 text-gray-400">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p>PDF preview not supported in-app</p>
                  <p className="text-sm mt-2">File size: {formatFileSize(content.size)}</p>
                </div>
              )}
              {content.type === 'binary' && (
                <div className="text-center py-8 text-gray-400">
                  <File className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p>Binary file - cannot preview</p>
                  <p className="text-sm mt-2">File size: {formatFileSize(content.size)}</p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DROP ZONE COMPONENT
// ============================================================

interface DropZoneProps {
  onFileDrop: (path: string) => void;
  isDragging: boolean;
}

function DropZone({ onFileDrop, isDragging }: DropZoneProps) {
  const handleBrowse = async () => {
    try {
      // Use Tauri dialog plugin to open file dialog
      const selected = await open({
        multiple: false,
        directory: false,
        title: 'Select File to Attach',
        filters: [
          {
            name: 'All Files',
            extensions: ['*']
          },
          {
            name: 'Documents',
            extensions: ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf']
          },
          {
            name: 'Images',
            extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
          },
          {
            name: 'Code',
            extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'rs', 'swift', 'json', 'html', 'css']
          }
        ]
      });
      if (selected && typeof selected === 'string') {
        onFileDrop(selected);
      }
    } catch (error) {
      console.error('File dialog error:', error);
    }
  };

  return (
    <div
      className={`
        border-2 border-dashed rounded-xl p-8 text-center transition-all
        ${isDragging 
          ? 'border-purple-500 bg-purple-500/10' 
          : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
        }
      `}
    >
      <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-purple-400' : 'text-gray-600'}`} />
      <p className="text-gray-400 mb-2">
        {isDragging ? 'Drop file here' : 'Drag and drop files here'}
      </p>
      <p className="text-gray-500 text-sm mb-4">or</p>
      <button
        onClick={handleBrowse}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors inline-flex items-center gap-2"
      >
        <FolderOpen className="w-4 h-4" />
        Browse Files
      </button>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function FilesView() {
  const { selectedProjectId, projects, components, setCurrentView } = useAppStore();
  
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>('all');
  const [componentFilter, setComponentFilter] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);

  const project = projects.find(p => p.id === selectedProjectId);
  const projectComponents = components.filter(c => c.project_id === selectedProjectId);

  // Load attachments
  const loadAttachments = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await invoke<Attachment[]>('get_attachments', {
        projectId: selectedProjectId,
        componentId: componentFilter,
        problemId: null,
      });
      setAttachments(data);
    } catch (err: any) {
      setError(err.toString());
    }
    setLoading(false);
  }, [selectedProjectId, componentFilter]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  // Filter attachments
  const filteredAttachments = attachments.filter(att => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = att.file_name.toLowerCase().includes(query);
      const matchesDesc = att.user_description?.toLowerCase().includes(query) || 
                         att.ai_description?.toLowerCase().includes(query);
      if (!matchesName && !matchesDesc) return false;
    }
    
    // Type filter
    if (typeFilter !== 'all' && getFileTypeCategory(att.file_type) !== typeFilter) {
      return false;
    }
    
    return true;
  });

  // Handle file upload
  const handleFileDrop = async (filePath: string) => {
    if (!selectedProjectId) return;
    setUploading(true);
    try {
      await invoke('attach_file', {
        projectId: selectedProjectId,
        filePath,
        componentId: null,
        problemId: null,
        userDescription: null,
        copyToBundle: true,
      });
      await loadAttachments();
    } catch (err: any) {
      setError(err.toString());
    }
    setUploading(false);
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    // Note: Tauri handles file drops differently - this is for future enhancement
    // For now, users should use the browse button
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // In a real implementation, we'd need to get the file path from Tauri
      console.log('File dropped:', files[0].name);
    }
  };

  // Action handlers
  const handleView = (attachment: Attachment) => {
    setPreviewFile(attachment);
  };

  const handleRemove = async (attachment: Attachment) => {
    if (!confirm(`Remove "${attachment.file_name}"? This cannot be undone.`)) return;
    try {
      await invoke('remove_attachment', {
        id: attachment.id,
        deleteFile: !attachment.is_external,
      });
      await loadAttachments();
    } catch (err: any) {
      setError(err.toString());
    }
  };

  const handleDescribe = async (_attachment: Attachment) => {
    // For now, just show a placeholder - AI integration will be added later
    alert('AI Describe feature coming soon!\n\nThis will use Claude to generate a description and identify key content locations in the file.');
  };

  const handleExtract = async (_attachment: Attachment) => {
    // For now, just show a placeholder - AI integration will be added later
    alert('Extract to Database feature coming soon!\n\nThis will parse the file and create Problems, Learnings, Todos, and other records from its content.');
  };

  // No project selected
  if (!selectedProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <FolderOpen className="w-16 h-16 mx-auto text-gray-700 mb-4" />
          <p className="text-gray-500 mb-4">Select a project to view files</p>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex-1 flex flex-col bg-gray-900 overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-white flex items-center gap-2">
                  <File className="w-5 h-5 text-purple-400" />
                  Files & Attachments
                </h1>
                <p className="text-sm text-gray-500">{project?.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {filteredAttachments.length} file{filteredAttachments.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Type filter */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as FileTypeFilter)}
                className="appearance-none pl-3 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="document">Documents</option>
                <option value="image">Images</option>
                <option value="code">Code</option>
                <option value="other">Other</option>
              </select>
              <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>

            {/* Component filter */}
            {projectComponents.length > 0 && (
              <select
                value={componentFilter ?? ''}
                onChange={(e) => setComponentFilter(e.target.value ? parseInt(e.target.value) : null)}
                className="appearance-none pl-3 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="">All Components</option>
                {projectComponents.map(comp => (
                  <option key={comp.id} value={comp.id}>{comp.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-red-400 text-center py-8">
            <p className="font-medium mb-2">Failed to load files</p>
            <p className="text-sm text-gray-500">{error}</p>
            <button
              onClick={loadAttachments}
              className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Drop zone */}
            <DropZone onFileDrop={handleFileDrop} isDragging={isDragging} />

            {uploading && (
              <div className="flex items-center gap-2 text-purple-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Uploading file...</span>
              </div>
            )}

            {/* File list */}
            {filteredAttachments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <File className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                <p>No files attached yet</p>
                <p className="text-sm mt-1">Drop a file above or click Browse to add one</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAttachments.map(attachment => (
                  <FileCard
                    key={attachment.id}
                    attachment={attachment}
                    components={projectComponents}
                    onView={handleView}
                    onRemove={handleRemove}
                    onDescribe={handleDescribe}
                    onExtract={handleExtract}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* File preview modal */}
      <FilePreviewModal
        attachment={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}

export default FilesView;
