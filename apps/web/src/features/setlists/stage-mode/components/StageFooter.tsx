import type { ReactNode } from 'react';

export function StageFooter({ children }: { children: ReactNode }) {
  return <div className="space-y-3 border-t border-[#30333A] bg-[#111214] px-4 py-3">{children}</div>;
}
