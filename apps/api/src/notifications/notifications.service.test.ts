import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PrismaService } from '../prisma/prisma.service';
import { NotificationsScheduler } from './notifications.scheduler';
import { NotificationsService, withoutActor } from './notifications.service';

const entry = (userId: string) => ({ userId, organizationId: 'o1', type: 'EVENT_TEAM_ADDED' as const, title: 't', dedupeKey: `k-${userId}` });

test('withoutActor: quien hizo la accion no recibe su propio aviso', () => {
  assert.deepEqual(withoutActor([entry('a'), entry('b')], 'a').map((item) => item.userId), ['b']);
  assert.equal(withoutActor([entry('a')]).length, 1);
});

test('notify ignora repetidos y, si la base falla, no rompe la accion principal', async () => {
  const calls: unknown[] = [];
  const ok = new NotificationsService({
    notification: {
      async createMany(args: unknown) {
        calls.push(args);
        return { count: 1 };
      },
    },
  } as unknown as PrismaService);
  assert.equal(await ok.notify([entry('a'), entry('b')], 'a'), 1);
  assert.deepEqual(calls, [{ data: [entry('b')], skipDuplicates: true }]);
  assert.equal(await ok.notify([entry('a')], 'a'), 0);
  assert.equal(calls.length, 1, 'sin destinatarios no consulta la base');

  const broken = new NotificationsService({
    notification: {
      async createMany() {
        throw new Error('base caida');
      },
    },
  } as unknown as PrismaService);
  assert.equal(await broken.notify([entry('b')]), 0);
});

test('el revisor de recordatorios se apaga con NOTIFICATION_REMINDERS_INTERVAL_MS=off y no falla si la revision falla', async () => {
  const previous = process.env.NOTIFICATION_REMINDERS_INTERVAL_MS;
  process.env.NOTIFICATION_REMINDERS_INTERVAL_MS = 'off';
  let runs = 0;
  const scheduler = new NotificationsScheduler({
    async sendDueEventReminders() {
      runs += 1;
      throw new Error('fallo');
    },
  } as unknown as NotificationsService);
  scheduler.onModuleInit();
  assert.equal((scheduler as unknown as { timer: unknown }).timer, null);
  await scheduler.tick();
  assert.equal(runs, 1);
  scheduler.onModuleDestroy();
  if (previous === undefined) delete process.env.NOTIFICATION_REMINDERS_INTERVAL_MS;
  else process.env.NOTIFICATION_REMINDERS_INTERVAL_MS = previous;
});
