import { getCurrentOrganizationId } from '../../../shared/api/http';
import { ActivityFeed } from '../components';
import { useRecentActivity } from '../hooks';

type Navigate = (href: string) => void;

export function ActivityPage({ navigate }: { navigate: Navigate }) {
  const organizationId = getCurrentOrganizationId() || '';
  const activityQuery = useRecentActivity(organizationId, 50);

  return (
    <div className="space-y-5">
      <section>
        <h1 className="page-title">Actividad</h1>
        <p className="page-subtitle">Lo último que pasó en el repertorio de tu equipo.</p>
      </section>
      <section className="panel p-5 sm:p-6">
        <ActivityFeed
          items={activityQuery.data?.items || []}
          loading={activityQuery.isLoading}
          error={activityQuery.error instanceof Error ? activityQuery.error.message : ''}
          onOpenSong={(songId) => navigate(`/songs/${songId}`)}
        />
      </section>
    </div>
  );
}
