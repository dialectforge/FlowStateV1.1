/**
 * FlowState - Main App Component
 * "Context that flows between sessions"
 */

import { useEffect, useState } from 'react';
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
import { MenuBar } from './components/MenuBar';
import { HelpModal, ShortcutsModal } from './components/HelpSystem';
import { CreateProjectModal, CreateComponentModal, CreateProblemModal } from './components/CreateModals';
import './App.css';

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
  } = useAppStore();
  
  // Modal states
  const [showWelcome, setShowWelcome] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpSection, setHelpSection] = useState<'guide' | 'shortcuts' | 'mcp' | 'about'>('guide');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewComponent, setShowNewComponent] = useState(false);
  const [showNewProblem, setShowNewProblem] = useState(false);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

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
      
      // View navigation with ⌘+number
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        switch (e.key) {
          case '1': e.preventDefault(); setCurrentView('dashboard'); break;
          case '2': e.preventDefault(); setCurrentView('tree'); break;
          case '3': e.preventDefault(); setCurrentView('kanban'); break;
          case '4': e.preventDefault(); setCurrentView('timeline'); break;
          case '5': e.preventDefault(); setCurrentView('story'); break;
          case '6': e.preventDefault(); setCurrentView('architecture'); break;
          case '7': e.preventDefault(); setCurrentView('decision'); break;
        }
      }
      
      // Escape to close modals
      if (e.key === 'Escape') {
        if (isQuickCaptureOpen) setQuickCaptureOpen(false);
        if (showHelp) setShowHelp(false);
        if (showShortcuts) setShowShortcuts(false);
        if (showNewProject) setShowNewProject(false);
        if (showNewComponent) setShowNewComponent(false);
        if (showNewProblem) setShowNewProblem(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickCaptureOpen, setQuickCaptureOpen, setCurrentView, selectedProjectId, showHelp, showShortcuts, showNewProject, showNewComponent, showNewProblem]);

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
      {/* Menu Bar */}
      <MenuBar 
        onOpenHelp={openHelp}
        onNewProject={() => setShowNewProject(true)}
        onQuickCapture={() => setQuickCaptureOpen(true)}
      />
      
      {/* Main view */}
      <div className="flex-1 overflow-hidden">
        {renderView()}
      </div>
      
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
      
      {/* Floating quick capture button (mobile-friendly) */}
      <button
        onClick={() => setQuickCaptureOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 rounded-full shadow-lg shadow-purple-500/30 flex items-center justify-center text-2xl transition-all hover:scale-110 z-40"
        title="Quick Capture (⌘+Shift+M)"
      >
        ⚡
      </button>
    </div>
  );
}

export default App;
