import 'reflect-metadata';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSION_KEY } from './require-permission.decorator';

const SRC = join(__dirname, '..');

/**
 * Rutas que NO llevan @RequirePermission, con el motivo. Cualquier ruta nueva fuera de esta lista
 * tiene que declarar su permiso; si de verdad no lo necesita, se agrega aqui con su explicacion.
 */
const EXEMPT_ROUTES: Record<string, string> = {
  'AuthController.login': 'Publica: todavia no hay sesion.',
  'AuthController.register': 'Publica: todavia no hay sesion.',
  'AuthController.me': 'Datos del propio usuario; no depende de una organizacion.',
  'ProfileController.update': 'Mi perfil: siempre el usuario del token.',
  'ProfileController.replaceInstruments': 'Mi perfil: siempre el usuario del token.',
  'OrganizationsController.list': 'Lista las organizaciones del usuario; no hay una activa que verificar.',
  'OrganizationsController.create': 'Crear una organizacion no requiere pertenecer a otra.',
  'InvitationsController.accept': 'Quien acepta todavia no es miembro de la organizacion.',
  'InvitationsController.cancel': "La organizacion sale de la invitacion; el servicio verifica 'invitations.manage'.",
  'MembershipsController.update': "La organizacion sale de la membresia editada; el servicio verifica 'members.manage' y las reglas de propietario.",
};

function findControllerFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return findControllerFiles(full);
    return name.endsWith('.controller.ts') ? [full] : [];
  });
}

type ControllerClass = { name: string; prototype: Record<string, unknown> };

function loadControllers() {
  const controllers: { file: string; controller: ControllerClass }[] = [];
  for (const file of findControllerFiles(SRC)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const exported = require(file) as Record<string, unknown>;
    for (const value of Object.values(exported)) {
      if (typeof value === 'function' && Reflect.getMetadata(PATH_METADATA, value) !== undefined) {
        controllers.push({ file: relative(SRC, file), controller: value as unknown as ControllerClass });
      }
    }
  }
  return controllers;
}

function routeHandlers(controller: ControllerClass) {
  return Object.getOwnPropertyNames(controller.prototype)
    .filter((name) => name !== 'constructor')
    .map((name) => ({ name, handler: controller.prototype[name] as object }))
    .filter(({ handler }) => typeof handler === 'function' && Reflect.getMetadata(PATH_METADATA, handler) !== undefined);
}

const controllers = loadControllers();

test('se encontraron los controllers de la API', () => {
  assert.ok(controllers.length >= 15, `solo se encontraron ${controllers.length} controllers`);
});

test('toda ruta declara su permiso con @RequirePermission o esta en la lista de excepciones', () => {
  const missing: string[] = [];
  const exemptButLabeled: string[] = [];
  for (const { file, controller } of controllers) {
    const classLabel = Reflect.getMetadata(PERMISSION_KEY, controller);
    for (const { name, handler } of routeHandlers(controller)) {
      const key = `${controller.name}.${name}`;
      const labeled = Boolean(Reflect.getMetadata(PERMISSION_KEY, handler) ?? classLabel);
      if (!labeled && !EXEMPT_ROUTES[key]) missing.push(`${key} (${file})`);
      if (labeled && EXEMPT_ROUTES[key]) exemptButLabeled.push(key);
    }
  }
  assert.deepEqual(missing, [], `Rutas sin @RequirePermission:\n${missing.join('\n')}`);
  assert.deepEqual(exemptButLabeled, [], `Rutas en la lista de excepciones que ya tienen permiso (sacarlas de la lista):\n${exemptButLabeled.join('\n')}`);
});

test('la lista de excepciones no tiene rutas que ya no existen', () => {
  const existing = new Set(controllers.flatMap(({ controller }) => routeHandlers(controller).map(({ name }) => `${controller.name}.${name}`)));
  const stale = Object.keys(EXEMPT_ROUTES).filter((key) => !existing.has(key));
  assert.deepEqual(stale, []);
});

test('todo controller con rutas etiquetadas usa PermissionsGuard (si no, la etiqueta no haria nada)', () => {
  const withoutGuard: string[] = [];
  for (const { controller } of controllers) {
    const classLabel = Reflect.getMetadata(PERMISSION_KEY, controller);
    const anyLabel = classLabel || routeHandlers(controller).some(({ handler }) => Reflect.getMetadata(PERMISSION_KEY, handler));
    const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, controller) || [];
    if (anyLabel && !guards.includes(PermissionsGuard)) withoutGuard.push(controller.name);
  }
  assert.deepEqual(withoutGuard, []);
});
