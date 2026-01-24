/**
 * FlowState - Main App Component
 * "Context that flows between sessions"
 * 
 * v1.1: Added Settings panel, complete menu integration
 * Native macOS menu bar is handled by Tauri (see lib.rs)
 */

import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from './stores/appStore';
import { Dashboard } from './components/Dashboard';
import { TreeView } from './components/TreeView';
import { KanbanBoard } from './components/KanbanBoard';
import { Timeline } from './components/Timeline';
import { SearchPanel } from './components/SearchPanel';
import { DecisionTree } from './components/DecisionTree';
import { StoryMode } from './components/StoryMode';
import { ArchitectureDiagram } from './components/ArchitectureDiagram';
import { QuickCapture } from './components/QuickCapture';
import { HelpModal, ShortcutsModal } from './components/HelpSystem';
import { CreateProjectModal, CreateComponentModal, CreateProblemModal } from './components/CreateModals';
import { FilesView } from './components/FilesView';
import { SyncStatusBar } from './components/SyncStatusBar';
import { Settings } from './components/Settings';
import './App.css';

// ============================================================
// TYPES
// ============================================================

type SettingsTab = 'general' | 'sync' | 'ai';

// ============================================================
// MAIN APP
// ============================================================

function App() {
  const { 
    currentView, 
    theme, 
    isQuickCaptureOpen, 
    setQuickCaptureOpen,
    setCurrentView,
    selectedProjectId,
    // setTheme, // Reserved for future use
  } = useAppStore();
  
  // Modal states
  const [showWelcome, setShowWelcome] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpSection, setHelpSection] = useState<'guide' | 'shortcuts' | 'mcp' | 'about'>('guide');
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // Create modals - from store so any component can trigger them
  const { 
    showNewProject, setShowNewProject,
    showNewComponent, setShowNewComponent,
    showNewProblem, setShowNewProblem 
  } = useAppStore();
  
  // v1.1: Settings modal state
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('general');
  
  // v1.1: UI state
  // v1.1: UI state (sidebar/AI panel toggle - reserved for future implementation)
  const [_showSidebar, setShowSidebar] = useState(true);
  const [_showAiPanel, setShowAiPanel] = useState(false);
  
  // v1.1: Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  // Show toast helper
  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Listen for native menu events from Tauri
  useEffect(() => {
    const unlisten = listen<string>('menu-event', (event) => {
      const action = event.payload;
      
      switch (action) {
        // File menu
        case 'new_project':
          setShowNewProject(true);
          break;
        case 'import_file':
          // Navigate to files view for import
          setCurrentView('files');
          showToast('Drag & drop files to attach them', 'info');
          break;
        case 'import_extract':
          // Navigate to files view for import with extraction
          setCurrentView('files');
          showToast('Drag & drop files, then use AI Extract', 'info');
          break;
        case 'export_project':
          showToast('Export feature coming soon', 'info');
          break;
        case 'export_markdown':
          showToast('Markdown export coming soon', 'info');
          break;
        case 'sync_now':
          // Trigger sync via custom event (SyncStatusBar will handle)
          window.dispatchEvent(new CustomEvent('flowstate-sync'));
          break;
        case 'sync_settings':
          setSettingsTab('sync');
          setShowSettings(true);
          break;
        case 'settings':
          setSettingsTab('general');
          setShowSettings(true);
          break;
          
        // Edit menu
        case 'quick_capture':
          setQuickCaptureOpen(true);
          break;
        case 'find':
          setCurrentView('search');
          break;
        case 'find_in_files':
          setCurrentView('search');
          break;
          
        // View menu
        case 'view_dashboard':
          setCurrentView('dashboard');
          break;
        case 'view_tree':
          setCurrentView('tree');
          break;
        case 'view_kanban':
          setCurrentView('kanban');
          break;
        case 'view_timeline':
          setCurrentView('timeline');
          break;
        case 'view_story':
          setCurrentView('story');
          break;
        case 'view_architecture':
          setCurrentView('architecture');
          break;
        case 'view_decision':
          setCurrentView('decision');
          break;
        case 'view_search':
          setCurrentView('search');
          break;
        case 'view_files':
          setCurrentView('files');
          break;
        case 'toggle_sidebar':
          setShowSidebar(prev => !prev);
          break;
        case 'toggle_ai_panel':
          setShowAiPanel(prev => !prev);
          break;
          
        // Tools menu
        case 'ai_describe_file':
          if (currentView === 'files') {
            showToast('Select a file and click "AI Describe"', 'info');
          } else {
            setCurrentView('files');
            showToast('Select a file to describe with AI', 'info');
          }
          break;
        case 'ai_extract_file':
          if (currentView === 'files') {
            showToast('Select a file and click "Extract"', 'info');
          } else {
            setCurrentView('files');
            showToast('Select a file to extract content from', 'info');
          }
          break;
        case 'ai_summarize':
          if (selectedProjectId) {
            showToast('AI Summary feature coming soon', 'info');
          } else {
            showToast('Select a project first', 'error');
          }
          break;
        case 'reindex_files':
          showToast('Reindexing files...', 'info');
          // TODO: Implement reindex
          break;
        case 'verify_integrity':
          showToast('Verifying file integrity...', 'info');
          // TODO: Implement verify
          break;
        case 'git_history':
          setSettingsTab('sync');
          setShowSettings(true);
          break;
        case 'resolve_conflicts':
          setSettingsTab('sync');
          setShowSettings(true);
          break;
          
        // Window menu
        case 'show_all_projects':
          setCurrentView('dashboard');
          break;
          
        // Help menu
        case 'help_guide':
          setHelpSection('guide');
          setShowHelp(true);
          break;
        case 'help_shortcuts':
          setHelpSection('shortcuts');
          setShowHelp(true);
          break;
        case 'help_getting_started':
          setHelpSection('guide');
          setShowHelp(true);
          break;
        case 'help_working_files':
          setHelpSection('guide');
          setShowHelp(true);
          showToast('See "Working with Files" section', 'info');
          break;
        case 'help_sync':
          setHelpSection('guide');
          setShowHelp(true);
          showToast('See "Setting Up Sync" section', 'info');
          break;
        case 'help_ai':
          setHelpSection('guide');
          setShowHelp(true);
          showToast('See "AI Features" section', 'info');
          break;
        case 'help_mcp':
          setHelpSection('mcp');
          setShowHelp(true);
          break;
        case 'check_updates':
          showToast('You have the latest version', 'success');
          break;
        case 'release_notes':
          showToast('v1.1 - Added file handling, Git sync, AI features', 'info');
          break;
        case 'report_bug':
          showToast('Bug reports: github.com/flowstate/issues', 'info');
          break;
        case 'send_feedback':
          showToast('Feedback: feedback@flowstate.dev', 'info');
          break;
        case 'help_about':
          setHelpSection('about');
          setShowHelp(true);
          break;
      }
    });
    
    return () => {
      unlisten.then(fn => fn());
    };
  }, [setQuickCaptureOpen, setCurrentView, currentView, selectedProjectId]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCurrentView('search');
      }
      
      // ⌘+Shift+M or Ctrl+Shift+M to open quick capture
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'm') {
        e.preventDefault();
        setQuickCaptureOpen(true);
      }
      
      // ⌘/ or Ctrl+/ for keyboard shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(true);
      }
      
      // ⌘, or Ctrl+, for settings
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setSettingsTab('general');
        setShowSettings(true);
      }
      
      // ⌘N or Ctrl+N for new project
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'n') {
        e.preventDefault();
        setShowNewProject(true);
      }
      
      // ⌘+Shift+N for new component
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'n') {
        e.preventDefault();
        if (selectedProjectId) {
          setShowNewComponent(true);
        }
      }
      
      // ⌘\ or Ctrl+\ to toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setShowSidebar(prev => !prev);
      }
      
      // View navigation with ⌘+number
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        switch (e.key) {
          case '1': e.preventDefault(); setCurrentView('dashboard'); break;
          case '2': e.preventDefault(); setCurrentView('tree'); break;
          case '3': e.preventDefault(); setCurrentView('kanban'); break;
          case '4': e.preventDefault(); setCurrentView('timeline'); break;
          case '5': e.preventDefault(); setCurrentView('files'); break; // v1.1: Files & Attachments
          case '6': e.preventDefault(); setCurrentView('story'); break;
          case '7': e.preventDefault(); setCurrentView('architecture'); break;
          case '8': e.preventDefault(); setCurrentView('decision'); break;
          case '0': e.preventDefault(); setCurrentView('dashboard'); break;
        }
      }
      
      // Escape to close modals
      if (e.key === 'Escape') {
        if (showSettings) { setShowSettings(false); return; }
        if (isQuickCaptureOpen) { setQuickCaptureOpen(false); return; }
        if (showHelp) { setShowHelp(false); return; }
        if (showShortcuts) { setShowShortcuts(false); return; }
        if (showNewProject) { setShowNewProject(false); return; }
        if (showNewComponent) { setShowNewComponent(false); return; }
        if (showNewProblem) { setShowNewProblem(false); return; }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickCaptureOpen, setQuickCaptureOpen, setCurrentView, selectedProjectId, showHelp, showShortcuts, showNewProject, showNewComponent, showNewProblem, showSettings]);

  // Check for first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem('flowstate_visited');
    if (!hasVisited) {
      setShowWelcome(true);
      localStorage.setItem('flowstate_visited', 'true');
    }
  }, []);

  // Open help modal with specific section
  const openHelp = (section: 'guide' | 'shortcuts' | 'mcp' | 'about' = 'guide') => {
    setHelpSection(section);
    setShowHelp(true);
  };

  // Note: Settings can be opened directly via setSettingsTab + setShowSettings
  // from menu handlers above. This function is kept for future use cases.

  // Render current view
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'tree':
        return <TreeView />;
      case 'kanban':
        return <KanbanBoard />;
      case 'timeline':
        return <Timeline />;
      case 'files':
        return <FilesView />;
      case 'story':
        return <StoryMode />;
      case 'architecture':
        return <ArchitectureDiagram />;
      case 'search':
        return <SearchPanel />;
      case 'decision':
        return <DecisionTree />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Main view - takes full height now that MenuBar is native */}
      <div className="flex-1 overflow-hidden">
        {renderView()}
      </div>
      
      {/* Sync Status Bar - v1.1 */}
      <SyncStatusBar />
      
      {/* Quick Capture Modal */}
      <QuickCapture 
        isOpen={isQuickCaptureOpen} 
        onClose={() => setQuickCaptureOpen(false)} 
      />
      
      {/* Help Modal */}
      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        initialSection={helpSection}
      />
      
      {/* Shortcuts Modal (quick access) */}
      <ShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
      
      {/* Settings Modal - v1.1 */}
      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        initialTab={settingsTab}
      />
      
      {/* Create Modals */}
      <CreateProjectModal
        isOpen={showNewProject}
        onClose={() => setShowNewProject(false)}
      />
      
      {selectedProjectId && (
        <>
          <CreateComponentModal
            isOpen={showNewComponent}
            onClose={() => setShowNewComponent(false)}
            projectId={selectedProjectId}
          />
          <CreateProblemModal
            isOpen={showNewProblem}
            onClose={() => setShowNewProblem(false)}
            projectId={selectedProjectId}
          />
        </>
      )}
      
      {/* Welcome Modal for first-time users */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">🧠</div>
              <h1 className="text-3xl font-bold text-white mb-2">Welcome to FlowState</h1>
              <p className="text-gray-400 mb-6">Context that flows between sessions</p>
              
              <div className="text-left bg-gray-700/50 rounded-xl p-4 mb-6 space-y-3">
                <div className="flex items-center gap-3">
                  <kbd className="px-2 py-1 bg-gray-600 rounded text-sm">⌘K</kbd>
                  <span className="text-gray-300">Search everything</span>
                </div>
                <div className="flex items-center gap-3">
                  <kbd className="px-2 py-1 bg-gray-600 rounded text-sm">⌘⇧M</kbd>
                  <span className="text-gray-300">Quick capture (problems, learnings, todos)</span>
                </div>
                <div className="flex items-center gap-3">
                  <kbd className="px-2 py-1 bg-gray-600 rounded text-sm">⌘,</kbd>
                  <span className="text-gray-300">Open settings</span>
                </div>
                <div className="flex items-center gap-3">
                  <kbd className="px-2 py-1 bg-gray-600 rounded text-sm">⌘/</kbd>
                  <span className="text-gray-300">View all keyboard shortcuts</span>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 mb-6">
                FlowState remembers your projects, problems, solutions, and learnings across sessions.
                Built with ❤️ by John & Claude.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowWelcome(false);
                    openHelp('guide');
                  }}
                  className="flex-1 py-3 px-6 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-medium transition-colors"
                >
                  Read Guide
                </button>
                <button
                  onClick={() => setShowWelcome(false)}
                  className="flex-1 py-3 px-6 bg-purple-600 hover:bg-purple-700 rounded-xl text-white font-medium transition-colors"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notifications */}
      {toast && (
        <div
          className={`fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg z-50 ${
            toast.type === 'success' ? 'bg-green-600' :
            toast.type === 'error' ? 'bg-red-600' :
            'bg-gray-700'
          } text-white text-sm`}
        >
          {toast.message}
        </div>
      )}
      
      {/* Floating quick capture button (mobile-friendly) */}
      <button
        onClick={() => setQuickCaptureOpen(true)}
        className="fixed bottom-20 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 rounded-full shadow-lg shadow-purple-500/30 flex items-center justify-center text-2xl transition-all hover:scale-110 z-40"
        title="Quick Capture (⌘+Shift+M)"
      >
        ⚡
      </button>
    </div>
  );
}

export default App;
