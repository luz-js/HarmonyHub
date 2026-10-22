import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PermissionsGuard } from './permissions.guard';
import { listRoutes } from './route-catalog';

/**
 * Rutas que NO llevan @RequirePermission, con el motivo. Cualquier ruta nueva fuera de esta lista
 * tiene que declarar su permiso; si de verdad no lo necesita, se agrega aqui con su explicacion.
 */
export const EXEMPT_ROUTES: Record<string, string> = {
  'AuthController.login': 'Publica: todavia no hay sesion.',
  'AuthController.register': 'Publica: todavia no hay sesion.',
  'AuthController.me': 'Datos del propio usuario; no depende de una organizacion.',
  'AuthController.refresh': 'Renueva la sesion con la cookie httpOnly; el access token ya vencio y no hay organizacion que verificar.',
  'AuthController.logout': 'Cierra la sesion de la cookie; no depende de una organizacion.',
  'ProfileController.update': 'Mi perfil: siempre el usuario del token.',
  'ProfileController.replaceInstruments': 'Mi perfil: siempre el usuario del token.',
  'OrganizationsController.list': 'Lista las organizaciones del usuario; no hay una activa que verificar.',
  'OrganizationsController.create': 'Crear una organizacion no requiere pertenecer a otra.',
  'InvitationsController.accept': 'Quien acepta todavia no es miembro de la organizacion.',
  'MyInvitationsController.list': 'Mis invitaciones: se buscan por el correo de la sesion; todavia no es miembro de esas organizaciones.',
  'MyInvitationsController.accept': 'Mis invitaciones: solo si la invitacion es de su correo (si no, 404); aun no es miembro.',
  'MyInvitationsController.decline': 'Mis invitaciones: solo si la invitacion es de su correo (si no, 404); aun no es miembro.',
  'InvitationsController.cancel': "La organizacion sale de la invitacion; el servicio verifica 'invitations.manage'.",
  'MembershipsController.update': "La organizacion sale de la membresia editada; el servicio verifica 'members.manage' y las reglas de propietario.",
};

const routes = listRoutes();
const key = (route: { controller: string; handler: string }) => `${route.controller}.${route.handler}`;

test('se encontraron las rutas de la API', () => {
  assert.ok(new Set(routes.map((route) => route.controller)).size >= 15, 'faltan controllers');
});

test('toda ruta declara su permiso con @RequirePermission o esta en la lista de excepciones', () => {
  const missing = routes.filter((route) => !route.requirement && !EXEMPT_ROUTES[key(route)]).map((route) => `${key(route)} (${route.file})`);
  const exemptButLabeled = routes.filter((route) => route.requirement && EXEMPT_ROUTES[key(route)]).map(key);
  assert.deepEqual(missing, [], `Rutas sin @RequirePermission:\n${missing.join('\n')}`);
  assert.deepEqual(exemptButLabeled, [], `Rutas en la lista de excepciones que ya tienen permiso (sacarlas de la lista):\n${exemptButLabeled.join('\n')}`);
});

test('la lista de excepciones no tiene rutas que ya no existen', () => {
  const existing = new Set(routes.map(key));
  assert.deepEqual(Object.keys(EXEMPT_ROUTES).filter((name) => !existing.has(name)), []);
});

test('todo controller con rutas etiquetadas usa PermissionsGuard (si no, la etiqueta no haria nada)', () => {
  const withoutGuard = new Set(routes.filter((route) => route.requirement && !route.guards.includes(PermissionsGuard)).map((route) => route.controller));
  assert.deepEqual([...withoutGuard], []);
});
