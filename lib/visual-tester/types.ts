export interface Issue {
  id: string;
  component: string;
  category: 'layout' | 'mobile' | 'contrast' | 'animation' | 'content' | 'ux' | 'error';
  severity: 'critical' | 'warning' | 'suggestion';
  description: string;
  fixHint: string;
}

export interface OverlapReport {
  elementA: string;
  elementB: string;
  overlapArea: number; // px²
}

export interface DomMetrics {
  hasHorizontalOverflow: boolean;
  consoleErrors: string[];
  stuckAnimations: string[];
  smallTapTargets: number;
  smallTextElements: number;
  brokenImages: number;
  brokenIcons: string[];
  overlaps: OverlapReport[];
}

export interface TestResult {
  desktopScreenshot: string;
  mobileScreenshot: string;
  desktopScreenshot2: string;
  issues: Issue[];
  domMetrics: DomMetrics;
  passed: boolean;
}
