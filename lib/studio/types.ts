import type { GeneratedPage } from '@/components/preview/types';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface PendingInstall {
  deps: string[];
  slug: string;
  summary: string;
  pendingFiles: { path: string; content: string }[];
}

export type CreativityMode = 'disruptive' | 'modern' | 'corporate';
export type PageType = 'saas' | 'producto' | 'agencia' | 'ecommerce' | 'startup' | 'portfolio';

export interface Session {
  id: string;
  summary: string;
  createdAt: number;
  generatedPage: GeneratedPage | null;
  messages: Message[];
  pageHistory: GeneratedPage[];
}

export type { GeneratedPage };
