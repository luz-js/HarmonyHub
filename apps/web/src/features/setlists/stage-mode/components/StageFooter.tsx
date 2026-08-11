import type { ReactNode } from 'react';

export function StageFooter({ children }: { children: ReactNode }) {
  return <div className="space-y-3 border-t border-[#1b2c40] bg-[#050c13] px-4 py-3">{children}</div>;
}
