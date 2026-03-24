'use client';

import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BlockDefinition } from '@/types/block';
import { getSourceBadge, BLOCK_NAMES } from '@/components/blocks';

interface BlockSortableProps {
  blocks: BlockDefinition[];
  onReorder: (blocks: BlockDefinition[]) => void;
  onToggle: (blockId: string) => void;
  onEdit: (block: BlockDefinition) => void;
  onDelete: (blockId: string) => void;
  selectedBlockId?: string | null;
}

export default function BlockSortable({ blocks, onReorder, onToggle, onEdit, onDelete, selectedBlockId }: BlockSortableProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex(b => b.id === active.id);
    const newIndex = blocks.findIndex(b => b.id === over.id);

    const reordered = arrayMove(blocks, oldIndex, newIndex).map((b, i) => ({
      ...b,
      order: i,
    }));
    onReorder(reordered);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {blocks.map((block, index) => (
            <SortableBlockItem
              key={block.id}
              block={block}
              index={index}
              isSelected={block.id === selectedBlockId}
              onToggle={() => onToggle(block.id)}
              onEdit={() => onEdit(block)}
              onDelete={() => onDelete(block.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function hasBlockImage(block: BlockDefinition): boolean {
  const d = block.data as any;
  if (d.heroImageUrl || d.imageUrl) return true;
  const items = d.features || d.items || d.steps || [];
  return items.some((it: any) => it.imageUrl);
}

function hasBlockVideo(block: BlockDefinition): boolean {
  const d = block.data as any;
  return !!d.videoUrl;
}

function SortableBlockItem({
  block, index, isSelected, onToggle, onEdit, onDelete,
}: {
  block: BlockDefinition;
  index: number;
  isSelected?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const badge = getSourceBadge(block.type);
  const name = BLOCK_NAMES[block.type] || block.type;
  const hasData = block.data && Object.keys(block.data).length > 0;
  const hasImg = hasBlockImage(block);
  const hasVid = hasBlockVideo(block);

  return (
    <div
      ref={setNodeRef}
      style={style as any}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border cursor-default transition-all
        ${isSelected
          ? 'bg-blue-50 border-blue-400'
          : block.visible
            ? 'bg-white border-gray-200 hover:border-gray-300'
            : 'bg-gray-50 border-gray-100 opacity-50'
        }
        ${isDragging ? 'shadow-lg' : ''}
      `}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 flex-shrink-0"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm6 0a2 2 0 10.001 4.001A2 2 0 0013 2zM7 8a2 2 0 10.001 4.001A2 2 0 007 8zm6 0a2 2 0 10.001 4.001A2 2 0 0013 8zM7 14a2 2 0 10.001 4.001A2 2 0 007 14zm6 0a2 2 0 10.001 4.001A2 2 0 0013 14z" />
        </svg>
      </button>

      {/* Order number */}
      <span className="text-[10px] text-gray-400 w-3 text-center flex-shrink-0">{index + 1}</span>

      {/* Block info — clickable to edit */}
      <button className="flex-1 min-w-0 text-left" onClick={onEdit}>
        <span className="text-[12px] font-medium truncate block">{name}</span>
      </button>

      {/* Visibility toggle */}
      <button onClick={onToggle} className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-0.5">
        {block.visible ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" strokeLinecap="round" />
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="text-gray-300 hover:text-red-400 flex-shrink-0 p-0.5"
        title="블록 삭제"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
