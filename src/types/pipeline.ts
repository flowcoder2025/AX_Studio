export type PipelineStatus =
  | 'idle'
  | 'analyzing'
  | 'generating_copy'
  | 'generating_images'
  | 'generating_videos'
  | 'assembling'
  | 'rendering'
  | 'complete'
  | 'error';

export interface PipelineEvent {
  id: string;
  status: PipelineStatus;
  progress: number;
  currentStep: string;
  errors: string[];
}

export interface PipelineStep {
  name: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  progress: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}
