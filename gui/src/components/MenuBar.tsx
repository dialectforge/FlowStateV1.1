/**
 * FlowState - Menu Bar Component
 * Native-feeling menu bar for the app
 */

import { useState, useRef, useEffect } from 'react';
import { useAppStore, ViewType } from '../stores/appStore';
import {
  Home, FolderTree, Columns3, Clock, Search, GitBranch, 
  BookOpen, Network, Info, Keyboard,
  Plus, Copy, Undo, Redo, Sun, Moon, Monitor,
  FileDown, FileUp, Database, RefreshCw, ChevronRight, Cpu,
  Zap
} from 'lucide-react';

interface MenuBarProps {
  onOpenHelp: (section?: 'guide' | 'shortcuts' | 'mcp' | 'about') => void;
  onNewProject: () => void;
  onNewComponent: () => void;
  onNewProblem: () => void;
  onQuickCapture: () => void;
}

interface MenuItem {
  label: string;
  shortcut?: string;
  icon?: any;
  action?: () => void;
  divider?: boolean;
  disabled?: boolean;
  submenu?: MenuItem[];
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

export function MenuBar({
  onOpenHelp,
  onNewProject,
  onNewComponent,
  onNewProblem,
  onQuickCapture,
}: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { setCurrentView, theme, setTheme } = useAppStore();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigateToView = (view: ViewType) => {
    setCurrentView(view);
    setActiveMenu(null);
  };

  const menus: MenuSection[] = [
    {
      label: 'File',
      items: [
        { label: 'New Project', shortcut: '⌘N', icon: Plus, action: () => { onNewProject(); setActiveMenu(null); } },
        { label: 'New Component', shortcut: '⌘⇧N', icon: Plus, action: () => { onNewComponent(); setActiveMenu(null); } },
        { label: 'New Problem', icon: Plus, action: () => { onNewProblem(); setActiveMenu(null); } },
        { divider: true, label: '' },
        { label: 'Quick Capture', shortcut: '⌘⇧M', icon: Zap, action: () => { onQuickCapture(); setActiveMenu(null); } },
        { divider: true, label: '' },
        { label: 'Export Project...', icon: FileDown, disabled: true },
        { label: 'Import Project...', icon: FileUp, disabled: true },
        { divider: true, label: '' },
        { label: 'Database Location', icon: Database, disabled: true },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: '⌘Z', icon: Undo, disabled: true },
        { label: 'Redo', shortcut: '⌘⇧Z', icon: Redo, disabled: true },
        { divider: true, label: '' },
        { label: 'Cut', shortcut: '⌘X', disabled: true },
        { label: 'Copy', shortcut: '⌘C', icon: Copy, disabled: true },
        { label: 'Paste', shortcut: '⌘V', disabled: true },
        { divider: true, label: '' },
        { label: 'Find', shortcut: '⌘K', icon: Search, action: () => { navigateToView('search'); } },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Dashboard', shortcut: '⌘1', icon: Home, action: () => navigateToView('dashboard') },
        { label: 'Tree View', shortcut: '⌘2', icon: FolderTree, action: () => navigateToView('tree') },
        { label: 'Kanban Board', shortcut: '⌘3', icon: Columns3, action: () => navigateToView('kanban') },
        { label: 'Timeline', shortcut: '⌘4', icon: Clock, action: () => navigateToView('timeline') },
        { divider: true, label: '' },
        { label: 'Story Mode', shortcut: '⌘5', icon: BookOpen, action: () => navigateToView('story') },
        { label: 'Architecture', shortcut: '⌘6', icon: Network, action: () => navigateToView('architecture') },
        { label: 'Decision Tree', shortcut: '⌘7', icon: GitBranch, action: () => navigateToView('decision') },
        { divider: true, label: '' },
        { label: 'Search', shortcut: '⌘K', icon: Search, action: () => navigateToView('search') },
        { divider: true, label: '' },
        {
          label: 'Theme',
          icon: theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor,
          submenu: [
            { label: 'Light', icon: Sun, action: () => { setTheme('light'); setActiveMenu(null); } },
            { label: 'Dark', icon: Moon, action: () => { setTheme('dark'); setActiveMenu(null); } },
            { label: 'System', icon: Monitor, action: () => { setTheme('system'); setActiveMenu(null); } },
          ],
        },
        { divider: true, label: '' },
        { label: 'Reload', shortcut: '⌘R', icon: RefreshCw, action: () => { window.location.reload(); } },
      ],
    },
    {
      label: 'Window',
      items: [
        { label: 'Minimize', shortcut: '⌘M', disabled: true },
        { label: 'Zoom', disabled: true },
        { divider: true, label: '' },
        { label: 'Bring All to Front', disabled: true },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'User Guide', icon: BookOpen, action: () => { onOpenHelp('guide'); setActiveMenu(null); } },
        { label: 'Keyboard Shortcuts', shortcut: '⌘/', icon: Keyboard, action: () => { onOpenHelp('shortcuts'); setActiveMenu(null); } },
        { divider: true, label: '' },
        { label: 'MCP Server Setup', icon: Cpu, action: () => { onOpenHelp('mcp'); setActiveMenu(null); } },
        { divider: true, label: '' },
        { label: 'Report Issue...', disabled: true },
        { label: 'Check for Updates...', disabled: true },
        { divider: true, label: '' },
        { label: 'About FlowState', icon: Info, action: () => { onOpenHelp('about'); setActiveMenu(null); } },
      ],
    },
  ];

  const renderMenuItem = (item: MenuItem, index: number) => {
    if (item.divider) {
      return <div key={index} className="h-px bg-gray-700 my-1" />;
    }

    const Icon = item.icon;

    if (item.submenu) {
      return (
        <div key={index} className="relative group">
          <button
            className={`w-full flex items-center justify-between px-3 py-1.5 text-sm rounded-md transition-colors ${
              item.disabled 
                ? 'text-gray-500 cursor-not-allowed' 
                : 'text-gray-200 hover:bg-gray-700'
            }`}
            disabled={item.disabled}
          >
            <span className="flex items-center gap-2">
              {Icon && <Icon size={14} />}
              {item.label}
            </span>
            <ChevronRight size={14} className="text-gray-500" />
          </button>
          
          {/* Submenu */}
          <div className="absolute left-full top-0 ml-1 hidden group-hover:block">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[150px]">
              {item.submenu.map((subItem, subIndex) => renderMenuItem(subItem, subIndex))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <button
        key={index}
        className={`w-full flex items-center justify-between px-3 py-1.5 text-sm rounded-md transition-colors ${
          item.disabled 
            ? 'text-gray-500 cursor-not-allowed' 
            : 'text-gray-200 hover:bg-gray-700'
        }`}
        onClick={item.action}
        disabled={item.disabled}
      >
        <span className="flex items-center gap-2">
          {Icon && <Icon size={14} />}
          {item.label}
        </span>
        {item.shortcut && (
          <span className="text-gray-500 text-xs ml-4">{item.shortcut}</span>
        )}
      </button>
    );
  };

  return (
    <div 
      ref={menuRef}
      className="h-8 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 flex items-center px-2 gap-1 select-none"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {/* App Logo/Icon */}
      <div className="flex items-center gap-2 px-2 mr-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <span className="text-lg">🧠</span>
        <span className="font-semibold text-sm text-white">FlowState</span>
      </div>

      {/* Menu Items */}
      {menus.map((menu) => (
        <div key={menu.label} className="relative" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeMenu === menu.label
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-800'
            }`}
            onClick={() => setActiveMenu(activeMenu === menu.label ? null : menu.label)}
            onMouseEnter={() => activeMenu && setActiveMenu(menu.label)}
          >
            {menu.label}
          </button>

          {/* Dropdown */}
          {activeMenu === menu.label && (
            <div className="absolute left-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[200px] z-50">
              {menu.items.map((item, index) => renderMenuItem(item, index))}
            </div>
          )}
        </div>
      ))}

      {/* Spacer - draggable area */}
      <div className="flex-1" />

      {/* Optional: Window controls for custom title bar (if needed) */}
      {/* <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400" />
        <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400" />
        <button className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400" />
      </div> */}
    </div>
  );
}

export default MenuBar;
