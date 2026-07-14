import { Clock } from 'lucide-react';

export function SetlistDurationBadge({ label }: { label: string }) {
  return (
    <span className="badge">
      <Clock className="h-3 w-3" /> {label}
    </span>
  );
}
