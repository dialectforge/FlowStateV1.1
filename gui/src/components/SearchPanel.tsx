/**
 * SearchPanel - Semantic search across all FlowState content
 * Searches problems, solutions, learnings, changes, and conversations
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft,
  Search as SearchIcon,
  X,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  FileEdit,
  MessageSquare,
  Filter,
  Clock
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { useDatabase } from '../hooks/useDatabase';

// ============================================================
// TYPES
// ============================================================

interface SearchResult {
  id: number;
  type: 'problem' | 'solution' | 'learning' | 'change' | 'conversation';
  title: string;
  content: string;
  project_name?: string;
  component_name?: string;
  created_at: string;
  relevance_score?: number;
}

type ContentTypeFilter = 'all' | 'problem' | 'solution' | 'learning' | 'change' | 'conversation';

// ============================================================
// SEARCH RESULT CARD
// ============================================================

interface SearchResultCardProps {
  result: SearchResult;
  query: string;
  onClick: () => void;
}

function SearchResultCard({ result, query, onClick }: SearchResultCardProps) {
  const getIcon = () => {
    switch (result.type) {
      case 'problem': return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'solution': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'learning': return <Lightbulb className="w-4 h-4 text-yellow-400" />;
      case 'change': return <FileEdit className="w-4 h-4 text-purple-400" />;
      case 'conversation': return <MessageSquare className="w-4 h-4 text-blue-400" />;
      default: return <SearchIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeBgColor = () => {
    switch (result.type) {
      case 'problem': return 'bg-red-500/20 text-red-400';
      case 'solution': return 'bg-green-500/20 text-green-400';
      case 'learning': return 'bg-yellow-500/20 text-yellow-400';
      case 'change': return 'bg-purple-500/20 text-purple-400';
      case 'conversation': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Highlight matching text
  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">
          {part}
        </mark>
      ) : part
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div 
      onClick={onClick}
      className={`
        p-4 rounded-lg cursor-pointer
        bg-gray-800 hover:bg-gray-750 
        border border-gray-700 hover:border-gray-600
        transition-all duration-200
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className={`text-xs px-2 py-0.5 rounded uppercase ${getTypeBgColor()}`}>
            {result.type}
          </span>
          {result.relevance_score !== undefined && (
            <span className="text-xs text-gray-500">
              {Math.round(result.relevance_score * 100)}% match
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDate(result.created_at)}
        </span>
      </div>

      {/* Title */}
      <h4 className="font-medium mb-2">{highlightMatch(result.title, query)}</h4>

      {/* Content preview */}
      <p className="text-sm text-gray-400 line-clamp-2 mb-3">
        {highlightMatch(result.content, query)}
      </p>

      {/* Footer */}
      <div className="flex items-center gap-2 text-xs">
        {result.project_name && (
          <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-300">
            {result.project_name}
          </span>
        )}
        {result.component_name && (
          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
            {result.component_name}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN SEARCH PANEL
// ============================================================

export function SearchPanel() {
  const { setCurrentView, selectedProjectId, projects } = useAppStore();
  const { performSearch } = useDatabase();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('all');

  const currentProject = projects.find(p => p.id === selectedProjectId);

  // Debounced search
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await performSearch(searchQuery);
      
      // Filter by content type if needed
      let filtered = searchResults;
      if (contentTypeFilter !== 'all') {
        filtered = searchResults.filter((r: SearchResult) => r.type === contentTypeFilter);
      }
      
      setResults(filtered);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [contentTypeFilter, performSearch]);

  // Trigger search on query or filter change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(query);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [query, contentTypeFilter, handleSearch]);

  const handleResultClick = (result: SearchResult) => {
    // TODO: Navigate to the relevant view based on result type
    console.log('Clicked result:', result);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h1 className="text-xl font-semibold">Search FlowState</h1>
            <p className="text-sm text-gray-400">
              {currentProject ? `Searching in ${currentProject.name}` : 'Search across all projects'}
            </p>
          </div>
        </div>
      </header>

      {/* Search input */}
      <div className="px-6 py-4 bg-gray-800/50 border-b border-gray-700">
        <div className="max-w-3xl mx-auto">
          {/* Search box */}
          <div className="relative mb-4">
            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search problems, solutions, learnings, changes..."
              autoFocus
              className={`
                w-full pl-12 pr-12 py-3 rounded-xl
                bg-gray-700 border border-gray-600
                focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                text-lg placeholder:text-gray-500
                transition-all
              `}
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-600 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Filter:</span>
            </div>

            {/* Content type filters */}
            <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
              {(['all', 'problem', 'solution', 'learning', 'change'] as ContentTypeFilter[]).map(type => (
                <button
                  key={type}
                  onClick={() => setContentTypeFilter(type)}
                  className={`
                    px-3 py-1 rounded text-sm capitalize transition-colors
                    ${contentTypeFilter === type ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}
                  `}
                >
                  {type === 'all' ? 'All' : type + 's'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-4">
          {/* Loading state */}
          {isSearching && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          )}

          {/* No query */}
          {!isSearching && !query && (
            <div className="text-center py-12">
              <SearchIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">Start typing to search</h3>
              <p className="text-sm text-gray-500">
                Search across problems, solutions, learnings, changes, and conversations
              </p>
              
              {/* Search tips */}
              <div className="mt-8 text-left max-w-md mx-auto bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Search tips:</h4>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li>• Search is semantic - describe what you're looking for</li>
                  <li>• Use filters to narrow results by type</li>
                  <li>• Results are ranked by relevance</li>
                  <li>• Searches within the current project if one is selected</li>
                </ul>
              </div>
            </div>
          )}

          {/* No results */}
          {!isSearching && query && results.length === 0 && (
            <div className="text-center py-12">
              <SearchIcon className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No results found</h3>
              <p className="text-sm text-gray-500">
                Try different keywords or adjust your filters
              </p>
            </div>
          )}

          {/* Results list */}
          {!isSearching && results.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-400">
                  {results.length} result{results.length !== 1 ? 's' : ''} found
                </p>
                <span className="text-xs text-gray-500">Sorted by relevance</span>
              </div>

              <div className="space-y-3">
                {results.map((result) => (
                  <SearchResultCard
                    key={`${result.type}-${result.id}`}
                    result={result}
                    query={query}
                    onClick={() => handleResultClick(result)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard shortcut hint */}
      <div className="px-6 py-2 bg-gray-800 border-t border-gray-700 text-center">
        <span className="text-xs text-gray-500">
          Press <kbd className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 mx-1">⌘K</kbd> 
          anywhere to open search
        </span>
      </div>
    </div>
  );
}
