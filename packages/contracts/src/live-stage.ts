import { z } from 'zod';

// ---- Pedidos (modo escenario en vivo: el lider avanza y los demas lo siguen) ----

/** POST /api/setlists/:id/live/start. Con `takeOver: true` toma el liderazgo de una sesion que ya existe. */
export const startLiveStageSchema = z.object({
  takeOver: z.boolean().optional(),
  currentItemId: z.string().trim().min(1).optional().nullable(),
});
export type StartLiveStageInput = z.input<typeof startLiveStageSchema>;
export type StartLiveStageData = z.output<typeof startLiveStageSchema>;

/** POST /api/setlists/:id/live/advance: el item que el lider esta mostrando. */
export const advanceLiveStageSchema = z.object({
  currentItemId: z.string().trim().min(1, 'Indica el item'),
});
export type AdvanceLiveStageInput = z.input<typeof advanceLiveStageSchema>;
export type AdvanceLiveStageData = z.output<typeof advanceLiveStageSchema>;

/** POST /api/setlists/:id/live/handover: pasar el liderazgo a otro miembro que pueda dirigir. */
export const handoverLiveStageSchema = z.object({
  membershipId: z.string().trim().min(1, 'Elige a quien le pasas el liderazgo'),
});
export type HandoverLiveStageInput = z.input<typeof handoverLiveStageSchema>;
export type HandoverLiveStageData = z.output<typeof handoverLiveStageSchema>;

// ---- Respuestas ----

export type LiveStageLeader = { userId: string; membershipId: string; name: string };

/** Estado en vivo de un setlist (lo envia el stream SSE y lo devuelven las acciones). */
export type LiveStageState =
  | { live: false; setlistId: string }
  | {
      live: true;
      setlistId: string;
      leader: LiveStageLeader;
      currentItemId: string | null;
      /** Sube con cada cambio: el cliente descarta mensajes viejos. */
      version: number;
      startedAt: string;
      updatedAt: string;
    };

/** 409 al iniciar cuando otra persona ya dirige: la app ofrece "Tomar el liderazgo". */
export type LiveStageConflict = { statusCode: 409; message: string; leader: LiveStageLeader };
