import React, { useState } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ContentItem {
  id: string;
  title: string;
}

const initialItems: ContentItem[] = [
  { id: 'item-1', title: 'Intro Video (Mux)' },
  { id: 'item-2', title: 'Main Panel (WebRTC)' },
  { id: 'item-3', title: 'Q&A Session' },
];

const SortableItem: React.FC<{ item: ContentItem }> = ({ item }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-4 mb-3 bg-gray-800 border border-gray-700 rounded-lg cursor-grab shadow-sm text-gray-200 hover:bg-gray-750 transition-colors"
    >
      {item.title}
    </div>
  );
};

/**
 * ContentBoard Component
 * CMS Kanban-style board using dnd-kit for managing and sorting the live content schedule.
 */
export const ContentBoard: React.FC = () => {
  const [items, setItems] = useState<ContentItem[]>(initialItems);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // SYNC LOGIC:
        // Aquí se sincronizaría el estado global usando Zustand o Redux,
        // y este nuevo orden se emitiría a los demás clientes conectados
        // a través del hook use-content-sync (e.g. websockets) para
        // asegurar que todos los admins vean la misma escaleta en vivo.
        
        return newOrder;
      });
    }
  };

  return (
    <div className="p-6 bg-gray-900 rounded-xl shadow-lg w-full max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-5 text-indigo-400 border-b border-gray-700 pb-2">Content Board (Kanban)</h2>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col">
            {items.map((item) => (
              <SortableItem key={item.id} item={item} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
