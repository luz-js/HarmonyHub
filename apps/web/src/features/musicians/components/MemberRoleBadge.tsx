import type { MembershipRole } from '../../../shared/types';
import { formatRole } from '../../../shared/utils/format';

const ROLE_BADGE_CLASS: Record<MembershipRole, string> = {
  OWNER: 'border-transparent bg-[#251E36] text-[#CDBDFF]',
  ADMIN: 'border-transparent bg-[var(--primary-tint)] text-[var(--primary)]',
  LEADER: 'border-transparent bg-[var(--primary-tint)] text-[var(--primary)]',
  MUSICIAN: 'border-[#3D4048] bg-transparent text-[#D8D5CE]',
  GUEST: 'border-transparent bg-[#2D1D12] text-[#F5A66B]',
};

export function MemberRoleBadge({ role }: { role: MembershipRole }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ROLE_BADGE_CLASS[role]}`}>
      {formatRole(role)}
    </span>
  );
}
