import { SlidersHorizontal } from 'lucide-react';

export function TransposeButton({ onClick }: { onClick: () => void }) {
  return <button type="button" className="btn-ghost" onClick={onClick}><SlidersHorizontal className="h-4 w-4" /> Transponer</button>;
}
