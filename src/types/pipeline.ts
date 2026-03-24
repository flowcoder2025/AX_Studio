export type PipelineStatus =
  | 'idle'
  | 'analyzing'
  | 'generating_copy'
  | 'assembling'
  | 'complete'
  | 'error';

export interface PipelineEvent {
  id: string;
  status: PipelineStatus;
  progress: number;
  currentStep: string;
}
