import { useCallback, useState } from 'react';
import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { SetlistItem } from '../../../../shared/types';
import { normalizeOrders } from '../utils/normalizeOrders';
import { useOptimisticReorder } from './useOptimisticReorder';

/**
 * Sensors + wiring de dnd-kit para el editor. PointerSensor con distancia minima evita
 * interferir con el click-para-seleccionar; KeyboardSensor da recoger/mover/cancelar
 * (Enter/flechas/Escape) de forma nativa, cubriendo el requisito de accesibilidad de teclado.
 */
export function useSetlistDnD(organizationId: string, setlistId: string, items: SetlistItem[]) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const reorderMutation = useOptimisticReorder(organizationId, setlistId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeItem = items.find((item) => item.id === activeId) ?? null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over ? String(event.over.id) : null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      setOverId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(items, oldIndex, newIndex).map((item) => item.id);
      reorderMutation.mutate(normalizeOrders(reordered));
    },
    [items, reorderMutation],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
  }, []);

  return { sensors, activeId, activeItem, overId, handleDragStart, handleDragOver, handleDragEnd, handleDragCancel };
}
