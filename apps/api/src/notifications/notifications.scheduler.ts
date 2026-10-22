import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Revisa cada pocos minutos si hay recordatorios de eventos por enviar. Vive dentro de la API (sin cron externo);
 * con varias instancias cada una revisa por su cuenta y el dedupeKey evita avisos repetidos.
 * NOTIFICATION_REMINDERS_INTERVAL_MS="off" lo apaga (por ejemplo, en pruebas).
 */
@Injectable()
export class NotificationsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsScheduler.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(@Inject(NotificationsService) private readonly notifications: NotificationsService) {}

  onModuleInit() {
    const setting = process.env.NOTIFICATION_REMINDERS_INTERVAL_MS;
    if (setting === 'off') return;
    const intervalMs = Number(setting) > 0 ? Number(setting) : DEFAULT_INTERVAL_MS;
    this.timer = setInterval(() => void this.tick(), intervalMs);
    // No mantiene vivo el proceso por si solo (pruebas, apagado).
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick() {
    try {
      const created = await this.notifications.sendDueEventReminders();
      if (created > 0) this.logger.log(`Recordatorios de eventos enviados: ${created}`);
    } catch (error) {
      this.logger.warn(`Fallo la revision de recordatorios: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
