import { useMemo } from 'react';
import { useMemberships } from '../../../musicians/hooks';
import { getCurrentOrganizationId } from '../../../../shared/api/http';

type MembershipRow = {
  id: string;
  userId: string;
  role: string;
  status: string;
  user: { id: string; name: string; avatarUrl?: string | null; active: boolean };
};

/** Selector simple de menciones: el frontend siempre envia IDs de usuario explicitos, nunca parsea nombres. */
export function MentionPicker({ selectedUserIds, onChange }: { selectedUserIds: string[]; onChange: (userIds: string[]) => void }) {
  const organizationId = getCurrentOrganizationId() || '';
  const membershipsQuery = useMemberships(organizationId);
  const members = useMemo(() => {
    const rows = (membershipsQuery.data as MembershipRow[] | undefined) || [];
    return rows.filter((row) => row.status === 'ACTIVE' && row.user?.active);
  }, [membershipsQuery.data]);

  function toggle(userId: string) {
    if (selectedUserIds.includes(userId)) onChange(selectedUserIds.filter((id) => id !== userId));
    else onChange([...selectedUserIds, userId]);
  }

  if (members.length === 0) return null;

  return (
    <div>
      <span className="label">Mencionar a</span>
      <div className="flex flex-wrap gap-2">
        {members.map((member) => {
          const active = selectedUserIds.includes(member.userId);
          return (
            <button
              key={member.id}
              type="button"
              className={active ? 'btn-primary h-8 px-3 text-xs' : 'btn-ghost h-8 px-3 text-xs'}
              onClick={() => toggle(member.userId)}
            >
              @{member.user.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
