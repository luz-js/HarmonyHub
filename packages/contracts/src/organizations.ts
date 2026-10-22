import { z } from 'zod';
import { ORGANIZATION_TYPES } from './enums';

// ---- Pedidos ----

/** POST /api/organizations: quien la crea queda como propietario. */
export const createOrganizationSchema = z.object({
  name: z.string().min(1).transform((value) => value.trim()),
  type: z.enum(ORGANIZATION_TYPES).default('BAND'),
  description: z.string().optional(),
  primaryColor: z.string().optional(),
});
export type CreateOrganizationInput = z.input<typeof createOrganizationSchema>;
export type CreateOrganizationData = z.output<typeof createOrganizationSchema>;

/** PATCH /api/organizations/:id */
export const updateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  primaryColor: z.string().optional(),
});
export type UpdateOrganizationInput = z.input<typeof updateOrganizationSchema>;
export type UpdateOrganizationData = z.output<typeof updateOrganizationSchema>;

/** POST /api/organizations/:id/transfer */
export const transferOrganizationSchema = z.object({
  membershipId: z.string().trim().min(1, 'Elige a quien le pasas la propiedad'),
  /** Por defecto quien transfiere deja de ser propietario y queda como administrador. */
  stepDown: z.boolean().default(true),
});
export type TransferOrganizationInput = z.input<typeof transferOrganizationSchema>;
export type TransferOrganizationData = z.output<typeof transferOrganizationSchema>;

const CONFIRM_NAME_MESSAGE = 'Escribe el nombre de la organizacion para confirmar';

/** POST /api/organizations/:id/archive: hay que escribir el nombre para confirmar (cualquier error da el mismo mensaje). */
export const archiveOrganizationSchema = z.object({ confirmName: z.string({ message: CONFIRM_NAME_MESSAGE }) }, { message: CONFIRM_NAME_MESSAGE });
export type ArchiveOrganizationInput = z.input<typeof archiveOrganizationSchema>;
export type ArchiveOrganizationData = z.output<typeof archiveOrganizationSchema>;

// ---- Respuestas ----

export type OrganizationSummary = {
  id: string;
  slug: string;
  name: string;
  type?: string;
  description?: string | null;
  primaryColor?: string;
  role?: string;
  archivedAt?: string | null;
};
