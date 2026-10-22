import { z } from 'zod';
import { SETLIST_MUSICAL_ROLES } from './enums';

// ---- Pedidos ("Mi perfil": siempre sobre la persona de la sesion) ----

/** PATCH /api/me: solo nombre y telefono; el correo no se cambia desde el perfil. Telefono vacio = sin telefono. */
export const updateMeSchema = z.object({
  name: z.string().trim().min(1, 'El nombre no puede estar vacio').max(120, 'El nombre es demasiado largo').optional(),
  phone: z
    .string()
    .trim()
    .max(40, 'El telefono es demasiado largo')
    .nullable()
    .optional()
    .transform((value) => (value === '' ? null : value)),
});
export type UpdateMeInput = z.input<typeof updateMeSchema>;
export type UpdateMeData = z.output<typeof updateMeSchema>;

/** PUT /api/me/active-organization: la organizacion que se abre al entrar, en cualquier dispositivo. */
export const activeOrganizationSchema = z.object({
  organizationId: z.string().trim().min(1, 'Indica la organizacion'),
});
export type ActiveOrganizationInput = z.input<typeof activeOrganizationSchema>;
export type ActiveOrganizationData = z.output<typeof activeOrganizationSchema>;

/** PUT /api/me/instruments: reemplaza la lista completa de lo que la persona sabe tocar. */
export const replaceInstrumentsSchema = z
  .object({
    instruments: z
      .array(z.object({ instrument: z.enum(SETLIST_MUSICAL_ROLES, { message: 'Instrumento invalido' }), isPrimary: z.boolean().optional() }))
      .max(SETLIST_MUSICAL_ROLES.length),
  })
  .superRefine((value, context) => {
    const seen = new Set<string>();
    for (const item of value.instruments) {
      if (seen.has(item.instrument)) {
        context.addIssue({ code: 'custom', path: ['instruments'], message: 'Hay instrumentos repetidos' });
        return;
      }
      seen.add(item.instrument);
    }
    if (value.instruments.filter((item) => item.isPrimary).length > 1) {
      context.addIssue({ code: 'custom', path: ['instruments'], message: 'Solo puede haber un instrumento principal' });
    }
  });
export type ReplaceMyInstrumentsInput = z.input<typeof replaceInstrumentsSchema>;
export type ReplaceMyInstrumentsData = z.output<typeof replaceInstrumentsSchema>;
