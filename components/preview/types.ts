import type { Issue } from '@/lib/visual-tester';

export interface GeneratedPage {
  slug: string;
  previewUrl: string;
  files: { path: string; lines: number }[];
  summary: string;
}

export interface SelectedElement {
  tag: string;
  text: string;
  classes: string[];
  outerHTMLSnippet: string;
}

export interface TestResult {
  desktopScreenshot: string;
  mobileScreenshot: string;
  desktopScreenshot2: string;
  issues: Issue[];
  domMetrics: {
    hasHorizontalOverflow: boolean;
    consoleErrors: string[];
    stuckAnimations: string[];
    smallTapTargets: number;
    smallTextElements: number;
    brokenImages: number;
    brokenIcons: string[];
    overlaps: { elementA: string; elementB: string; overlapArea: number }[];
  };
  passed: boolean;
}

export interface PreviewPanelProps {
  generatedPage: GeneratedPage | null;
  onUndo?: () => void;
  onElementSelect?: (element: SelectedElement) => void;
  onApplyFixes?: (issues: Issue[]) => void;
  isGenerating?: boolean;
  agentStatuses?: Record<string, 'running' | 'done' | 'error'>;
  agentFiles?: Record<string, string[]>;
  agentLogs?: Record<string, string>;
  genStatus?: string;
}
