import 'reflect-metadata';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { PERMISSION_KEY, type PermissionRequirement } from './require-permission.decorator';

/** Una ruta de la API tal como la declaran los controllers (lo usan el test guardian y las pruebas e2e). */
export type CatalogRoute = {
  controller: string;
  handler: string;
  file: string;
  method: string;
  path: string;
  requirement?: PermissionRequirement;
  guards: unknown[];
};

const SRC = join(__dirname, '..');

function findControllerFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return findControllerFiles(full);
    return name.endsWith('.controller.ts') || name.endsWith('.controller.js') ? [full] : [];
  });
}

function joinPath(...parts: string[]) {
  return `/${parts.join('/')}`.replace(/\/+/g, '/').replace(/\/$/, '');
}

export function listRoutes(): CatalogRoute[] {
  const routes: CatalogRoute[] = [];
  for (const file of findControllerFiles(SRC)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const exported = require(file) as Record<string, unknown>;
    for (const value of Object.values(exported)) {
      if (typeof value !== 'function' || Reflect.getMetadata(PATH_METADATA, value) === undefined) continue;
      const controller = value as unknown as { name: string; prototype: Record<string, unknown> };
      const basePath = String(Reflect.getMetadata(PATH_METADATA, controller));
      const classRequirement = Reflect.getMetadata(PERMISSION_KEY, controller) as PermissionRequirement | undefined;
      const guards = (Reflect.getMetadata(GUARDS_METADATA, controller) as unknown[]) || [];
      for (const handler of Object.getOwnPropertyNames(controller.prototype)) {
        const fn = controller.prototype[handler];
        if (handler === 'constructor' || typeof fn !== 'function' || Reflect.getMetadata(PATH_METADATA, fn) === undefined) continue;
        routes.push({
          controller: controller.name,
          handler,
          file: relative(SRC, file),
          method: RequestMethod[Reflect.getMetadata(METHOD_METADATA, fn) as RequestMethod],
          path: joinPath(basePath, String(Reflect.getMetadata(PATH_METADATA, fn))),
          requirement: (Reflect.getMetadata(PERMISSION_KEY, fn) as PermissionRequirement | undefined) ?? classRequirement,
          guards,
        });
      }
    }
  }
  return routes;
}
