export interface GeneratedFile {
  path: string;
  content: string;
}

export interface Plan {
  slug: string;
  summary: string;
  components: string[];
  complexComponents: string[];
  interfaces: string;
  deps: string[];
  metaTitle: string;
  metaDescription: string;
  schemaType: string;
}

export type OrchestratorEvent =
  | { type: 'status'; message: string }
  | { type: 'agent_start'; agent: string }
  | { type: 'agent_done'; agent: string; files: string[] }
  | { type: 'agent_error'; agent: string; message: string }
  | { type: 'agent_log'; agent: string; chunk: string }
  | { type: 'result'; files: GeneratedFile[]; slug: string; summary: string; newDeps: string[] };

export interface OrchestrateParams {
  userPrompt: string;
  installedDeps: string[];
  creativityPrefix: string;
  temperature: number;
  designBrief: string;
  imageBase64?: string;
  mediaType?: string;
}

export interface QAIssue {
  component: string;
  description: string;
  fixHint: string;
}

export interface OrchestrateEditParams extends OrchestrateParams {
  existingFiles: { path: string; content: string }[];
  slug: string;
  fixMode?: boolean;
  qaIssues?: QAIssue[];
}
