import { FileText, Info, Monitor, Moon, Sun } from 'lucide-react';
import { files, musicians } from '../data';
import { getInitials } from '../features/dashboard/utils';

/** Estas secciones todavia muestran datos de ejemplo (src/data.ts); se diseñan en la próxima etapa. */
function SampleDataNotice() {
  return (
    <p className="flex items-start gap-2.5 rounded-xl border border-[#8FB4FF]/20 bg-[#1C2436] px-4 py-3 text-sm text-[#C9D8FF]">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#8FB4FF]" />
      Esta sección todavía muestra datos de ejemplo. La conectaremos con tu organización en la próxima etapa.
    </p>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section>
      <h1 className="page-title">{title}</h1>
      <p className="page-subtitle">{subtitle}</p>
    </section>
  );
}

export function MusiciansPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Músicos" subtitle="Las personas de tu equipo y lo que tocan." />
      <SampleDataNotice />
      <section className="panel divide-y divide-[#23252A]">
        {musicians.map((musician) => (
          <div key={musician.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
            <span className="avatar h-10 w-10 shrink-0 text-sm">{getInitials(musician.name)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-white">{musician.name}</p>
              <p className="truncate text-sm text-muted">{musician.instrument} · {musician.role}</p>
            </div>
            <span className="badge badge-success">{musician.status}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

export function ArchivesPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Archivos" subtitle="Partituras, letras y audios compartidos con el equipo." />
      <SampleDataNotice />
      <section className="panel divide-y divide-[#23252A]">
        {files.map((file) => (
          <div key={file.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
            <span className="icon-tile h-10 w-10 shrink-0 rounded-xl"><FileText className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-white">{file.name}</p>
              <p className="truncate text-sm text-muted">{file.type} · {file.size} · {file.author}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export function SettingsPage() {
  const themes = [
    { name: 'Oscuro', description: 'El tema Escenario, pensado para tocar en vivo.', icon: Moon },
    { name: 'Claro', description: 'Para planificar de día.', icon: Sun },
    { name: 'Sistema', description: 'Sigue la configuración de tu dispositivo.', icon: Monitor },
  ];
  return (
    <div className="space-y-5">
      <PageHeader title="Ajustes" subtitle="Preferencias de la aplicación." />
      <SampleDataNotice />
      <section className="panel p-5 sm:p-6">
        <h2 className="section-title">Tema</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {themes.map((theme, index) => {
            const Icon = theme.icon;
            return (
              <div
                key={theme.name}
                className={`rounded-xl border p-4 ${index === 0 ? 'border-primary/70 bg-primary-tint' : 'border-[#30333A] bg-[#141518]'}`}
              >
                <Icon className={`h-5 w-5 ${index === 0 ? 'text-primary' : 'text-muted'}`} />
                <p className="mt-3 text-[15px] font-bold text-white">{theme.name}{index === 0 && <span className="ml-2 text-xs font-semibold text-primary">Activo</span>}</p>
                <p className="mt-1 text-sm text-muted">{theme.description}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
