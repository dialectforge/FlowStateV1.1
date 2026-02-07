/**
 * FlowState - Comprehensive Help System
 * Includes: User Guide, Keyboard Shortcuts, MCP Setup, About
 */

import { useState, useEffect } from 'react';
import { 
  X, Book, Keyboard, Cpu, Info, 
  Home, FolderTree, GitBranch, Zap,
  Heart, Github
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: 'guide' | 'shortcuts' | 'mcp' | 'about';
}

// ============================================================
// HELP CONTENT DATA
// ============================================================

const KEYBOARD_SHORTCUTS = [
  { category: 'File', shortcuts: [
    { keys: ['⌘', 'N'], description: 'New Project', alt: 'Ctrl+N' },
    { keys: ['⌘', 'E'], description: 'Export Project', alt: 'Ctrl+E' },
    { keys: ['⌘', 'W'], description: 'Close Window', alt: 'Ctrl+W' },
  ]},
  { category: 'Edit', shortcuts: [
    { keys: ['⌘', 'Z'], description: 'Undo', alt: 'Ctrl+Z' },
    { keys: ['⌘', '⇧', 'Z'], description: 'Redo', alt: 'Ctrl+Shift+Z' },
    { keys: ['⌘', 'X'], description: 'Cut', alt: 'Ctrl+X' },
    { keys: ['⌘', 'C'], description: 'Copy', alt: 'Ctrl+C' },
    { keys: ['⌘', 'V'], description: 'Paste', alt: 'Ctrl+V' },
    { keys: ['⌘', '⇧', 'M'], description: 'Quick Capture', alt: 'Ctrl+Shift+M' },
  ]},
  { category: 'View', shortcuts: [
    { keys: ['⌘', 'K'], description: 'Search', alt: 'Ctrl+K' },
    { keys: ['⌘', '\\'], description: 'Toggle Sidebar', alt: 'Ctrl+\\' },
  ]},
  { category: 'Window', shortcuts: [
    { keys: ['⌘', 'M'], description: 'Minimize', alt: 'Ctrl+M' },
  ]},
  { category: 'Help', shortcuts: [
    { keys: ['⌘', '?'], description: 'Keyboard Shortcuts', alt: 'Ctrl+?' },
  ]},
  { category: 'Quick Capture (when open)', shortcuts: [
    { keys: ['1'], description: 'Problem type', alt: null },
    { keys: ['2'], description: 'Learning type', alt: null },
    { keys: ['3'], description: 'Todo type', alt: null },
    { keys: ['4'], description: 'Change type', alt: null },
    { keys: ['⌘', '↵'], description: 'Save & close', alt: 'Ctrl+Enter' },
    { keys: ['Esc'], description: 'Cancel and close', alt: null },
  ]},
];

const USER_GUIDE_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Home,
    content: `
# Welcome to FlowState

FlowState is a **development memory system** that helps you maintain context across coding sessions. Unlike generic note-taking apps, FlowState is designed specifically for the software development workflow.

## Core Concepts

### Projects
Projects are your top-level containers. Each project represents a distinct codebase, application, or initiative you're working on.

### Components  
Components are the building blocks within your projects. They can be nested (a component can have child components) to represent your architecture. Examples:
- "Authentication Module"
- "API Layer" → "REST Endpoints" → "User Routes"
- "iOS App" → "Views" → "Login Screen"

### Problems
Track issues, bugs, and challenges. Each problem belongs to a component and has:
- **Status**: open, investigating, blocked, solved, won't fix
- **Severity**: low, medium, high, critical

### Solution Attempts
The key differentiator! Track **what you tried** for each problem:
- What was the approach?
- Did it work, fail, or partially work?
- What did you learn?

This creates a **decision tree** showing your problem-solving journey.

### Learnings
Capture insights as you work:
- Patterns you discovered
- Gotchas to avoid
- Best practices
- Tool tips

### Todos
Simple task tracking tied to your projects and components.
    `
  },
  {
    id: 'views',
    title: 'Views & Navigation',
    icon: FolderTree,
    content: `
# Views in FlowState

FlowState offers 9 specialized views, each designed for a specific workflow:

## Dashboard
Your home base. Shows all projects at a glance with status indicators and quick stats.
- Click a project card to select it
- Use "+ New Project" to create projects
- Projects are grouped by status (Active, Paused, Completed, Archived)

## Tree View
Hierarchical explorer showing your project's component structure.
- Expand/collapse nodes
- Right-click for context menu
- View details in the side panel
- See problems and learnings per component

## Kanban Board
Drag-and-drop problem tracking.
- Columns: Open, Investigating, Blocked, Solved
- Drag cards between columns to update status
- Filter by component or severity
- Click cards for details

## Timeline
Chronological activity stream.
- All changes, problems, solutions, learnings in order
- Filter by event type
- Group by day/week
- Great for catching up after time away

## Search (⌘K)
Semantic search across everything.
- Type naturally: "authentication bug" or "API timeout solution"
- Filter by project, type, date
- Results ranked by relevance
- Click to navigate directly

## Decision Tree
Visual problem-solving journey.
- See the path from problem to solution
- All attempts shown as branches
- Failures are valuable - they show what didn't work
- Export as SVG for documentation

## Story Mode
Cinematic narrative of your build journey.
- Auto-generated chapters
- Key milestones highlighted
- Problems and solutions told as a story
- Perfect for retrospectives or demos

## Architecture Diagram
Visual component relationships.
- Interactive force-layout
- Drag nodes to arrange
- See problem hotspots (red badges)
- Export as SVG

## Quick Capture (⌘⇧M)
Fast entry from anywhere.
- Problems, learnings, todos, changes
- No need to navigate views
- Keyboard-friendly
    `
  },
  {
    id: 'workflow',
    title: 'Recommended Workflow',
    icon: GitBranch,
    content: `
# FlowState Workflow

## Starting a Session

1. **Open FlowState** and check the Dashboard
2. **Review open problems** on the Kanban board
3. **Check recent activity** in Timeline if you've been away
4. **Use ⌘K** to search for where you left off

## While Coding

### When you encounter a problem:
1. Press **⌘⇧M** to open Quick Capture
2. Select "Problem"
3. Describe what's happening
4. Set severity (helps prioritization)

### When you try something:
1. Open the problem in Kanban or Tree View
2. Click "Add Attempt"
3. Describe what you're trying
4. Update the outcome when you know the result

### When you solve something:
1. Mark the winning attempt as "Success"
2. Add a solution summary
3. Capture the key insight - what was the breakthrough?
4. Add any code snippet that might help later

### When you learn something:
1. Press **⌘⇧M** and select "Learning"
2. Write the insight
3. Choose a category (pattern, gotcha, best practice, etc.)
4. Add context if helpful

## Ending a Session

1. **Update problem statuses** - what's still open?
2. **Add todos** for tomorrow
3. **Review the Timeline** to see what you accomplished
4. FlowState will remember everything next time!

## Using with Claude/AI

FlowState has an MCP server that connects to Claude. When working with Claude:

1. Claude can read your project context automatically
2. No need to re-explain your architecture
3. Problems and solutions are available for reference
4. Your learnings inform Claude's suggestions

See the "MCP Setup" section for configuration.
    `
  },
  {
    id: 'tips',
    title: 'Pro Tips',
    icon: Zap,
    content: `
# Pro Tips for FlowState

## Naming Conventions

### Projects
- Use clear, unique names: "DialectForge VPN" not "VPN Project"
- Include version if relevant: "MyApp v2 Rewrite"

### Components
- Name by function: "Authentication", "Database Layer", "UI Components"
- Use hierarchy for organization: "API" → "Endpoints" → "Users"

### Problems
- Be specific: "Login fails with expired JWT" not "Login broken"
- Include error messages or symptoms

### Learnings
- Make them actionable: "Always validate JWT expiry BEFORE database lookup"
- Future you will thank present you

## Decision Tree Tips

- **Log failures** - they're valuable! Knowing what didn't work saves time
- **Add notes** to attempts explaining WHY it failed
- **Branch from attempts** when one approach leads to multiple paths

## Quick Capture Tips

- It's designed for speed - use it often!
- You can always edit entries later in the full view
- Keyboard shortcuts (1-4) switch type without mouse

## Search Tips

- Search is semantic - describe what you're looking for naturally
- Combine terms: "react hook performance issue"
- Use filters to narrow results

## Story Mode Tips

- Great for weekly/monthly retrospectives
- Export to share with team or stakeholders
- Shows your problem-solving patterns over time

## Architecture Diagram Tips

- Drag nodes to arrange logically
- Red badges show problem hotspots
- Reset layout if it gets messy
- Export for documentation
    `
  },
];

const MCP_GUIDE = `
# MCP Server Setup

FlowState includes a Model Context Protocol (MCP) server that allows Claude to access your project context directly.

## What is MCP?

MCP is a protocol that allows AI assistants like Claude to connect to external tools and data sources. With the FlowState MCP server, Claude can:

- Read your project structure
- See open problems and past solutions
- Access learnings and patterns
- Understand your architecture

## Installation

### 1. Locate the MCP Server

The MCP server is located at:
\`\`\`
/path/to/flowstate/mcp-server/
\`\`\`

### 2. Install Dependencies

\`\`\`bash
cd mcp-server
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate
pip install -r requirements.txt
\`\`\`

### 3. Configure Claude Desktop

Edit your Claude Desktop configuration file:

**macOS**: \`~/Library/Application Support/Claude/claude_desktop_config.json\`
**Windows**: \`%APPDATA%\\Claude\\claude_desktop_config.json\`

Add the FlowState server:

\`\`\`json
{
  "mcpServers": {
    "flowstate": {
      "command": "python",
      "args": ["-m", "flowstate.server"],
      "cwd": "/path/to/flowstate/mcp-server"
    }
  }
}
\`\`\`

### 4. Restart Claude Desktop

After saving the configuration, restart Claude Desktop to load the MCP server.

## Available MCP Tools

Once connected, Claude has access to 32 tools:

### Project Management
- \`list_projects\` - See all projects
- \`create_project\` - Create new project
- \`get_project_context\` - Get full context for a project

### Component Tracking
- \`list_components\` - See project components
- \`create_component\` - Add new component
- \`get_component_history\` - See component changes over time

### Problem/Solution Workflow
- \`log_problem\` - Log a new problem
- \`log_attempt\` - Track a solution attempt
- \`mark_problem_solved\` - Mark problem as solved
- \`get_problem_tree\` - Get full decision tree

### Learning & Search
- \`log_learning\` - Capture an insight
- \`search\` - Semantic search across all content

## Usage with Claude

Once configured, you can tell Claude:

> "Check my FlowState project context for DialectForge"

> "Log a problem: The API is returning 500 errors on user creation"

> "What solutions have we tried for the authentication issue?"

> "Search my learnings for anything about caching"

Claude will use the MCP tools automatically to access your FlowState data.

## Troubleshooting

### Server not connecting?
1. Check the path in your config is correct
2. Ensure Python dependencies are installed
3. Check Claude Desktop logs for errors

### Data not syncing?
FlowState GUI and MCP server share the same SQLite database. Changes in either appear in both.

### Need help?
Open an issue on GitHub or check the documentation.
`;

const ABOUT_INFO = {
  version: '1.0.0',
  authors: ['John Martin', 'Claude'],
  license: 'MIT License',
  description: 'FlowState is a development memory system that helps developers maintain context across coding sessions. Track projects, problems, solutions, and learnings with a beautiful visual interface.',
  repository: 'https://github.com/dialectforge/FlowState',
  technologies: [
    { name: 'Tauri 2.0', desc: 'Cross-platform desktop framework' },
    { name: 'React 18', desc: 'UI library' },
    { name: 'TypeScript', desc: 'Type-safe JavaScript' },
    { name: 'Tailwind CSS', desc: 'Utility-first styling' },
    { name: 'SQLite', desc: 'Local database' },
    { name: 'Rust', desc: 'Backend runtime' },
  ],
};

// ============================================================
// HELPER COMPONENTS
// ============================================================

const KeyBadge = ({ children }: { children: React.ReactNode }) => (
  <kbd className="px-2 py-1 bg-gray-700 rounded text-xs font-mono border border-gray-600 min-w-[24px] text-center">
    {children}
  </kbd>
);

const MarkdownContent = ({ content }: { content: string }) => {
  // Simple markdown rendering
  const lines = content.trim().split('\n');
  
  return (
    <div className="prose prose-invert max-w-none">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) {
          return <h1 key={i} className="text-2xl font-bold text-white mt-6 mb-4 first:mt-0">{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-xl font-semibold text-white mt-5 mb-3">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-lg font-medium text-white mt-4 mb-2">{line.slice(4)}</h3>;
        }
        if (line.startsWith('- ')) {
          return <li key={i} className="text-gray-300 ml-4">{line.slice(2)}</li>;
        }
        if (line.startsWith('```')) {
          return null; // Handle code blocks separately
        }
        if (line.startsWith('> ')) {
          return (
            <blockquote key={i} className="border-l-4 border-purple-500 pl-4 my-2 text-gray-400 italic">
              {line.slice(2)}
            </blockquote>
          );
        }
        if (line.trim() === '') {
          return <div key={i} className="h-2" />;
        }
        // Handle inline formatting
        let formatted = line
          .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
          .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 bg-gray-700 rounded text-sm text-purple-300 font-mono">$1</code>');
        return <p key={i} className="text-gray-300 my-2" dangerouslySetInnerHTML={{ __html: formatted }} />;
      })}
    </div>
  );
};

// ============================================================
// MAIN HELP MODAL
// ============================================================

export function HelpModal({ isOpen, onClose, initialSection = 'guide' }: HelpModalProps) {
  const [activeSection, setActiveSection] = useState(initialSection);
  const [expandedGuide, setExpandedGuide] = useState<string | null>('getting-started');

  // Sync active section with initialSection prop whenever it changes
  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  if (!isOpen) return null;

  const renderContent = () => {
    switch (activeSection) {
      case 'guide':
        return (
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-56 border-r border-gray-700 p-4 flex-shrink-0">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">User Guide</h3>
              <nav className="space-y-1">
                {USER_GUIDE_SECTIONS.map(section => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setExpandedGuide(section.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        expandedGuide === section.id 
                          ? 'bg-purple-600/30 text-purple-300' 
                          : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                      }`}
                    >
                      <Icon size={16} />
                      <span className="truncate">{section.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {USER_GUIDE_SECTIONS.find(s => s.id === expandedGuide) && (
                <MarkdownContent content={USER_GUIDE_SECTIONS.find(s => s.id === expandedGuide)!.content} />
              )}
            </div>
          </div>
        );

      case 'shortcuts':
        return (
          <div className="p-6 overflow-y-auto h-full">
            <h2 className="text-2xl font-bold text-white mb-6">Keyboard Shortcuts</h2>
            
            <div className="space-y-8">
              {KEYBOARD_SHORTCUTS.map(category => (
                <div key={category.category}>
                  <h3 className="text-lg font-semibold text-white mb-3 pb-2 border-b border-gray-700">
                    {category.category}
                  </h3>
                  <div className="space-y-2">
                    {category.shortcuts.map((shortcut, i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <span className="text-gray-300">{shortcut.description}</span>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, j) => (
                              <KeyBadge key={j}>{key}</KeyBadge>
                            ))}
                          </div>
                          {shortcut.alt && (
                            <span className="text-gray-500 text-sm">
                              ({shortcut.alt})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 p-4 bg-gray-700/30 rounded-xl">
              <p className="text-sm text-gray-400">
                <strong className="text-gray-300">Tip:</strong> On Windows/Linux, replace ⌘ with Ctrl.
              </p>
            </div>
          </div>
        );

      case 'mcp':
        return (
          <div className="p-6 overflow-y-auto h-full">
            <MarkdownContent content={MCP_GUIDE} />
          </div>
        );

      case 'about':
        return (
          <div className="p-6 overflow-y-auto h-full">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🧠</div>
              <h2 className="text-3xl font-bold text-white mb-2">FlowState</h2>
              <p className="text-gray-400">v{ABOUT_INFO.version}</p>
            </div>
            
            <p className="text-gray-300 text-center mb-8 max-w-lg mx-auto">
              {ABOUT_INFO.description}
            </p>
            
            <div className="max-w-md mx-auto space-y-6">
              {/* Authors */}
              <div className="bg-gray-700/30 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Created By</h3>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-xl mb-1">👨‍💻</div>
                    <span className="text-white text-sm">John Martin</span>
                  </div>
                  <div className="text-2xl text-gray-500">+</div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-xl mb-1">🤖</div>
                    <span className="text-white text-sm">Claude</span>
                  </div>
                </div>
              </div>
              
              {/* Technologies */}
              <div className="bg-gray-700/30 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Built With</h3>
                <div className="grid grid-cols-2 gap-2">
                  {ABOUT_INFO.technologies.map(tech => (
                    <div key={tech.name} className="flex items-center gap-2 text-sm">
                      <span className="text-purple-400">•</span>
                      <span className="text-white">{tech.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* License */}
              <div className="bg-gray-700/30 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">License</h3>
                <p className="text-white">{ABOUT_INFO.license}</p>
                <p className="text-gray-400 text-sm mt-1">Free and open source forever.</p>
              </div>
              
              {/* Links */}
              <div className="flex justify-center gap-4">
                <a 
                  href={ABOUT_INFO.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                >
                  <Github size={18} />
                  <span>GitHub</span>
                </a>
              </div>
              
              {/* Dedication */}
              <div className="text-center pt-4">
                <p className="text-gray-500 text-sm flex items-center justify-center gap-1">
                  Made with <Heart size={14} className="text-red-500" /> for developers everywhere
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[80vh] bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-800/80 backdrop-blur-sm flex-shrink-0">
          <h2 className="text-xl font-bold text-white">Help & Documentation</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700 px-4 flex-shrink-0">
          {[
            { id: 'guide', label: 'User Guide', icon: Book },
            { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
            { id: 'mcp', label: 'MCP Setup', icon: Cpu },
            { id: 'about', label: 'About', icon: Info },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeSection === tab.id
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STANDALONE SHORTCUTS MODAL (for quick access)
// ============================================================

export function ShortcutsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Keyboard size={20} />
            Keyboard Shortcuts
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {KEYBOARD_SHORTCUTS.map(category => (
            <div key={category.category} className="mb-4 last:mb-0">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {category.category}
              </h3>
              <div className="space-y-1">
                {category.shortcuts.map((shortcut, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-gray-300 text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-0.5">
                      {shortcut.keys.map((key, j) => (
                        <KeyBadge key={j}>{key}</KeyBadge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="px-4 py-3 bg-gray-700/30 text-center">
          <span className="text-xs text-gray-500">Press <KeyBadge>Esc</KeyBadge> to close</span>
        </div>
      </div>
    </div>
  );
}

export default HelpModal;
