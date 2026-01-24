/**
 * StoryMode - Cinematic narrative view of project journey
 * Generates a visual story with chapters, milestones, and key moments
 */

import { useState, useEffect, useRef } from 'react';
import { useAppStore, Project, Component, Problem, Learning, Change } from '../stores/appStore';

// ============================================================
// TYPES
// ============================================================

interface Chapter {
  id: string;
  title: string;
  subtitle?: string;
  date: string;
  type: 'genesis' | 'milestone' | 'challenge' | 'solution' | 'learning' | 'launch';
  content: ChapterContent[];
  stats?: {
    componentsCreated?: number;
    problemsSolved?: number;
    learningsGained?: number;
  };
}

interface ChapterContent {
  type: 'text' | 'quote' | 'code' | 'diagram' | 'stats' | 'problem_journey';
  content: string;
  metadata?: any;
}

interface StoryData {
  project: Project;
  chapters: Chapter[];
  stats: {
    duration_days: number;
    components_count: number;
    problems_encountered: number;
    problems_solved: number;
    learnings_count: number;
    changes_count: number;
  };
}

// ============================================================
// CHAPTER COMPONENTS
// ============================================================

interface ChapterHeaderProps {
  chapter: Chapter;
  index: number;
}

function ChapterHeader({ chapter, index }: ChapterHeaderProps) {
  const getChapterIcon = () => {
    switch (chapter.type) {
      case 'genesis': return '🌅';
      case 'milestone': return '🎯';
      case 'challenge': return '⚡';
      case 'solution': return '✅';
      case 'learning': return '💡';
      case 'launch': return '🚀';
      default: return '📖';
    }
  };

  const getChapterColor = () => {
    switch (chapter.type) {
      case 'genesis': return 'from-purple-600 to-blue-600';
      case 'milestone': return 'from-green-600 to-teal-600';
      case 'challenge': return 'from-red-600 to-orange-600';
      case 'solution': return 'from-emerald-600 to-green-600';
      case 'learning': return 'from-yellow-600 to-amber-600';
      case 'launch': return 'from-pink-600 to-purple-600';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  return (
    <div className={`relative py-16 px-8 bg-gradient-to-r ${getChapterColor()} rounded-2xl mb-8`}>
      <div className="absolute top-4 left-4 text-sm font-medium text-white/60 uppercase tracking-wider">
        Chapter {index + 1}
      </div>
      <div className="text-center">
        <div className="text-5xl mb-4">{getChapterIcon()}</div>
        <h2 className="text-3xl font-bold text-white mb-2">{chapter.title}</h2>
        {chapter.subtitle && (
          <p className="text-lg text-white/80">{chapter.subtitle}</p>
        )}
        <div className="mt-4 text-sm text-white/60">{chapter.date}</div>
      </div>
    </div>
  );
}

interface ChapterContentBlockProps {
  content: ChapterContent;
}

function ChapterContentBlock({ content }: ChapterContentBlockProps) {
  switch (content.type) {
    case 'text':
      return (
        <p className="text-lg text-gray-300 leading-relaxed mb-6">
          {content.content}
        </p>
      );
    
    case 'quote':
      return (
        <blockquote className="border-l-4 border-purple-500 pl-6 py-4 my-8 bg-gray-800/50 rounded-r-lg">
          <p className="text-xl text-white italic">"{content.content}"</p>
          {content.metadata?.author && (
            <cite className="text-sm text-gray-400 mt-2 block">— {content.metadata.author}</cite>
          )}
        </blockquote>
      );
    
    case 'code':
      return (
        <div className="my-6">
          {content.metadata?.title && (
            <div className="text-sm text-gray-400 mb-2">{content.metadata.title}</div>
          )}
          <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 overflow-x-auto text-sm text-gray-300">
            <code>{content.content}</code>
          </pre>
        </div>
      );
    
    case 'stats':
      const stats = JSON.parse(content.content);
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{String(value)}</div>
              <div className="text-sm text-gray-400 capitalize">{key.replace(/_/g, ' ')}</div>
            </div>
          ))}
        </div>
      );
    
    case 'problem_journey':
      const journey = content.metadata;
      return (
        <div className="my-8 bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔴</span>
            <h4 className="text-lg font-medium text-white">{journey?.title || 'Problem'}</h4>
          </div>
          <div className="space-y-3 ml-8">
            {journey?.attempts?.map((attempt: any, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <span className={attempt.outcome === 'success' ? 'text-green-400' : 'text-red-400'}>
                  {attempt.outcome === 'success' ? '✅' : '❌'}
                </span>
                <div>
                  <div className="text-gray-300">{attempt.description}</div>
                  {attempt.notes && (
                    <div className="text-sm text-gray-500 mt-1">"{attempt.notes}"</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {journey?.key_insight && (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="text-sm text-green-400 mb-1">Key Insight</div>
              <div className="text-green-300 italic">"{journey.key_insight}"</div>
            </div>
          )}
        </div>
      );
    
    case 'diagram':
      return (
        <div className="my-8 bg-gray-800 rounded-xl p-6 text-center">
          <div className="text-gray-400 text-sm">Component Diagram</div>
          <div className="mt-4 text-6xl">🏗️</div>
          <pre className="mt-4 text-sm text-gray-400">{content.content}</pre>
        </div>
      );
    
    default:
      return null;
  }
}

// ============================================================
// STORY GENERATOR (LOCAL)
// ============================================================

function generateLocalStory(
  project: Project,
  components: Component[],
  problems: Problem[],
  learnings: Learning[],
  changes: Change[]
): StoryData {
  const chapters: Chapter[] = [];
  
  // Chapter 1: Genesis
  chapters.push({
    id: 'genesis',
    title: 'Genesis',
    subtitle: `The birth of ${project.name}`,
    date: new Date(project.created_at).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    }),
    type: 'genesis',
    content: [
      {
        type: 'text',
        content: project.description || `${project.name} began as an idea — a solution to a problem that needed solving. This is the story of how it came to be.`,
      },
      {
        type: 'stats',
        content: JSON.stringify({
          components: components.length,
          'initial scope': components.filter(c => !c.parent_component_id).length + ' modules',
        }),
      },
    ],
    stats: {
      componentsCreated: components.length,
    },
  });

  // Chapter 2: Building Blocks (if components exist)
  if (components.length > 0) {
    const rootComponents = components.filter(c => !c.parent_component_id);
    chapters.push({
      id: 'architecture',
      title: 'The Architecture',
      subtitle: 'Building blocks take shape',
      date: new Date(components[0]?.created_at || project.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
      type: 'milestone',
      content: [
        {
          type: 'text',
          content: `The foundation was laid with ${rootComponents.length} core ${rootComponents.length === 1 ? 'module' : 'modules'}:`,
        },
        {
          type: 'diagram',
          content: rootComponents.map(c => `├── ${c.name} (${c.status})`).join('\n'),
        },
      ],
    });
  }

  // Chapter 3: Challenges (if problems exist)
  const solvedProblems = problems.filter(p => p.status === 'solved');
  if (problems.length > 0) {
    chapters.push({
      id: 'challenges',
      title: 'The Challenges',
      subtitle: `${problems.length} obstacles encountered`,
      date: new Date(problems[0]?.created_at || project.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
      type: 'challenge',
      content: [
        {
          type: 'text',
          content: `Every great project faces adversity. ${project.name} was no exception. ${problems.length} ${problems.length === 1 ? 'problem emerged' : 'problems emerged'}, each demanding creative solutions.`,
        },
        ...problems.slice(0, 3).map(p => ({
          type: 'problem_journey' as const,
          content: '',
          metadata: {
            title: p.title,
            description: p.description,
            severity: p.severity,
            status: p.status,
          },
        })),
      ],
    });
  }

  // Chapter 4: Learnings
  if (learnings.length > 0) {
    chapters.push({
      id: 'learnings',
      title: 'Wisdom Gained',
      subtitle: `${learnings.length} insights discovered`,
      date: new Date(learnings[0]?.created_at || project.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
      type: 'learning',
      content: [
        {
          type: 'text',
          content: 'Through trial and error, valuable lessons emerged:',
        },
        ...learnings.slice(0, 5).map(l => ({
          type: 'quote' as const,
          content: l.insight,
          metadata: { author: l.category || 'Experience' },
        })),
      ],
      stats: {
        learningsGained: learnings.length,
      },
    });
  }

  // Final Chapter: Current State
  const completedComponents = components.filter(c => c.status === 'complete').length;
  chapters.push({
    id: 'current',
    title: project.status === 'completed' ? 'Launch' : 'The Journey Continues',
    subtitle: project.status === 'completed' ? 'Mission accomplished' : 'Work in progress',
    date: 'Present',
    type: project.status === 'completed' ? 'launch' : 'milestone',
    content: [
      {
        type: 'text',
        content: project.status === 'completed'
          ? `After ${Math.ceil((Date.now() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24))} days of development, ${project.name} reached completion.`
          : `${project.name} continues to evolve. ${completedComponents} of ${components.length} components are complete, with ${problems.filter(p => p.status === 'open').length} challenges remaining.`,
      },
      {
        type: 'stats',
        content: JSON.stringify({
          'days active': Math.ceil((Date.now() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24)),
          components: components.length,
          'problems solved': solvedProblems.length,
          learnings: learnings.length,
        }),
      },
    ],
  });

  return {
    project,
    chapters,
    stats: {
      duration_days: Math.ceil((Date.now() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      components_count: components.length,
      problems_encountered: problems.length,
      problems_solved: solvedProblems.length,
      learnings_count: learnings.length,
      changes_count: changes.length,
    },
  };
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function StoryMode() {
  const { 
    selectedProjectId, 
    projects, 
    components, 
    problems, 
    learnings, 
    changes,
    setCurrentView 
  } = useAppStore();
  
  const [story, setStory] = useState<StoryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeChapter, setActiveChapter] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const project = projects.find(p => p.id === selectedProjectId);

  // Generate story
  useEffect(() => {
    if (!project) return;
    
    setIsLoading(true);
    
    // Use local generation with available data
    const storyData = generateLocalStory(
      project,
      components.filter(c => c.project_id === selectedProjectId),
      problems,
      learnings.filter(l => l.project_id === selectedProjectId),
      changes
    );
    
    setStory(storyData);
    setIsLoading(false);
  }, [selectedProjectId, project, components, problems, learnings, changes]);

  // Export to HTML
  const handleExportHTML = () => {
    if (!story) return;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${story.project.name} - Project Story</title>
  <style>
    body { font-family: system-ui; background: #111827; color: #f3f4f6; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #a855f7; }
    h2 { color: #818cf8; margin-top: 60px; }
    blockquote { border-left: 4px solid #a855f7; padding-left: 20px; font-style: italic; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat { background: #1f2937; padding: 15px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #a855f7; }
  </style>
</head>
<body>
  <h1>📖 ${story.project.name}</h1>
  <p>${story.project.description || 'A development journey'}</p>
  ${story.chapters.map((ch, i) => `
    <h2>Chapter ${i + 1}: ${ch.title}</h2>
    <p><em>${ch.subtitle}</em></p>
    <p><small>${ch.date}</small></p>
    ${ch.content.map(c => c.type === 'text' ? `<p>${c.content}</p>` : c.type === 'quote' ? `<blockquote>${c.content}</blockquote>` : '').join('')}
  `).join('')}
  <hr>
  <div class="stats">
    <div class="stat"><div class="stat-value">${story.stats.duration_days}</div><div>Days</div></div>
    <div class="stat"><div class="stat-value">${story.stats.components_count}</div><div>Components</div></div>
    <div class="stat"><div class="stat-value">${story.stats.problems_solved}</div><div>Problems Solved</div></div>
    <div class="stat"><div class="stat-value">${story.stats.learnings_count}</div><div>Learnings</div></div>
  </div>
  <p><small>Generated by FlowState</small></p>
</body>
</html>`;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story.project.name.toLowerCase().replace(/\s+/g, '-')}-story.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Scroll to chapter
  const scrollToChapter = (index: number) => {
    setActiveChapter(index);
    const chapterEl = document.getElementById(`chapter-${index}`);
    if (chapterEl) {
      chapterEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!project) {
    return (
      <div className="h-screen flex flex-col bg-gray-900">
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">📖</div>
            <h2 className="text-xl font-medium text-gray-300 mb-2">No Project Selected</h2>
            <p className="text-gray-500 mb-4">Select a project to view its story</p>
            <button
              onClick={() => setCurrentView('dashboard')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              📖 The {project.name} Story
            </h1>
          </div>
        </div>
        
        <button
          onClick={handleExportHTML}
          disabled={!story}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
        >
          Export HTML
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Chapter navigation */}
        <nav className="w-64 bg-gray-800/50 border-r border-gray-700 p-4 overflow-y-auto">
          <div className="text-sm text-gray-400 uppercase tracking-wide mb-4">Chapters</div>
          <div className="space-y-2">
            {story?.chapters.map((chapter, index) => (
              <button
                key={chapter.id}
                onClick={() => scrollToChapter(index)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeChapter === index
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <div className="text-sm font-medium">{index + 1}. {chapter.title}</div>
                <div className="text-xs opacity-70">{chapter.date}</div>
              </button>
            ))}
          </div>
          
          {/* Stats summary */}
          {story && (
            <div className="mt-8 pt-6 border-t border-gray-700">
              <div className="text-sm text-gray-400 uppercase tracking-wide mb-4">Summary</div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration</span>
                  <span className="text-gray-300">{story.stats.duration_days} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Components</span>
                  <span className="text-gray-300">{story.stats.components_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Problems</span>
                  <span className="text-gray-300">{story.stats.problems_solved}/{story.stats.problems_encountered}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Learnings</span>
                  <span className="text-gray-300">{story.stats.learnings_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Changes</span>
                  <span className="text-gray-300">{story.stats.changes_count}</span>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Main content */}
        <main ref={contentRef} className="flex-1 overflow-y-auto p-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400">Generating story...</div>
            </div>
          ) : story ? (
            <div className="max-w-3xl mx-auto">
              {/* Title page */}
              <div className="text-center mb-16 py-20">
                <div className="text-8xl mb-6">📖</div>
                <h1 className="text-5xl font-bold text-white mb-4">{story.project.name}</h1>
                <p className="text-xl text-gray-400 mb-2">A Development Story</p>
                <p className="text-sm text-gray-500">
                  {new Date(story.project.created_at).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })} — Present
                </p>
              </div>

              {/* Chapters */}
              {story.chapters.map((chapter, index) => (
                <section key={chapter.id} id={`chapter-${index}`} className="mb-20">
                  <ChapterHeader chapter={chapter} index={index} />
                  <div className="prose prose-invert max-w-none">
                    {chapter.content.map((content, i) => (
                      <ChapterContentBlock key={i} content={content} />
                    ))}
                  </div>
                </section>
              ))}

              {/* Footer */}
              <footer className="text-center py-16 border-t border-gray-800">
                <div className="text-6xl mb-4">✨</div>
                <p className="text-gray-400">Generated by FlowState</p>
                <p className="text-sm text-gray-600">Context that flows between sessions</p>
              </footer>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
