import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SetlistItemsRepository } from './items/setlist-items.repository';
import { SetlistsRepository } from './setlists.repository';

/**
 * Comprobaciones de recurso del modulo de setlists (que el setlist/item sea de la organizacion).
 * Los permisos por rol los verifica PermissionsGuard con @RequirePermission en cada ruta.
 */
@Injectable()
export class SetlistsAccessService {
  constructor(
    @Inject(SetlistsRepository) private readonly setlistsRepository: SetlistsRepository,
    @Inject(SetlistItemsRepository) private readonly itemsRepository: SetlistItemsRepository,
  ) {}

  async assertSetlistInOrg(organizationId: string, setlistId: string) {
    const setlist = await this.setlistsRepository.findById(setlistId, organizationId);
    if (!setlist) throw new NotFoundException('Setlist no encontrado');
    return setlist;
  }

  async assertItemInSetlist(organizationId: string, setlistId: string, itemId: string) {
    await this.assertSetlistInOrg(organizationId, setlistId);
    const item = await this.itemsRepository.findItem(setlistId, itemId);
    if (!item) throw new NotFoundException('Item no encontrado');
    return item;
  }
}
