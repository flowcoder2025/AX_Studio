import { create } from 'zustand';
import { BlockDefinition } from '@/types/block';
import { CategoryId } from '@/lib/templates/categories';
import { PipelineStatus } from '@/lib/pipeline/engine';

interface ProjectState {
  // Current project
  projectId: string | null;
  productName: string;
  category: CategoryId | null;
  blocks: BlockDefinition[];
  heroStyle: 'dark' | 'light' | 'pastel' | 'warm';

  // Pipeline
  pipelineId: string | null;
  pipelineStatus: PipelineStatus;
  pipelineProgress: number;
  pipelineStep: string;

  // Actions
  setProject: (id: string, name: string, category: CategoryId) => void;
  setBlocks: (blocks: BlockDefinition[]) => void;
  reorderBlock: (fromIndex: number, toIndex: number) => void;
  toggleBlock: (blockId: string) => void;
  updateBlockData: (blockId: string, data: any) => void;
  setPipeline: (id: string) => void;
  updatePipelineStatus: (status: PipelineStatus, progress: number, step: string) => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectId: null,
  productName: '',
  category: null,
  blocks: [],
  heroStyle: 'dark',

  pipelineId: null,
  pipelineStatus: 'idle',
  pipelineProgress: 0,
  pipelineStep: '',

  setProject: (id, name, category) =>
    set({ projectId: id, productName: name, category }),

  setBlocks: (blocks) =>
    set({ blocks }),

  reorderBlock: (fromIndex, toIndex) => {
    const blocks = [...get().blocks];
    const [moved] = blocks.splice(fromIndex, 1);
    blocks.splice(toIndex, 0, moved);
    // Update order numbers
    blocks.forEach((b, i) => (b.order = i));
    set({ blocks });
  },

  toggleBlock: (blockId) => {
    const blocks = get().blocks.map((b) =>
      b.id === blockId ? { ...b, visible: !b.visible } : b
    );
    set({ blocks });
  },

  updateBlockData: (blockId, data) => {
    const blocks = get().blocks.map((b) =>
      b.id === blockId ? { ...b, data: { ...b.data, ...data } } : b
    );
    set({ blocks });
  },

  setPipeline: (id) =>
    set({ pipelineId: id, pipelineStatus: 'idle', pipelineProgress: 0 }),

  updatePipelineStatus: (status, progress, step) =>
    set({ pipelineStatus: status, pipelineProgress: progress, pipelineStep: step }),

  reset: () =>
    set({
      projectId: null, productName: '', category: null, blocks: [],
      pipelineId: null, pipelineStatus: 'idle', pipelineProgress: 0, pipelineStep: '',
    }),
}));
