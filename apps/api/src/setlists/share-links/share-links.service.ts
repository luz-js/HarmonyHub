import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { CreatedShareLink, CreateShareLinkData, SharedSetlist, ShareLink } from '@harmonyhub/contracts';
import type { OrgMember } from '../../permissions/current-membership.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveSetlistItemEffectiveValues } from '../setlist.utils';
import {
  generateShareToken,
  hashShareToken,
  isShareLinkActive,
  looksLikeShareToken,
  sharedEventDate,
  sharedSongContent,
  shareLinkExpiresAt,
} from './share-link.utils';

/** El mismo 404 para token mal formado, inexistente, vencido, revocado o de una organizacion archivada. */
export const SHARED_SETLIST_NOT_FOUND = 'Este enlace no existe o ya no esta disponible';

const linkSelect = {
  id: true,
  createdAt: true,
  expiresAt: true,
  revokedAt: true,
  lastAccessedAt: true,
  accessCount: true,
  createdBy: { select: { id: true, name: true } },
} as const;

type LinkRow = { id: string; createdAt: Date; expiresAt: Date | null; lastAccessedAt: Date | null; accessCount: number; createdBy: { id: string; name: string } | null };

const toShareLink = (link: LinkRow): ShareLink => ({
  id: link.id,
  createdAt: link.createdAt.toISOString(),
  expiresAt: link.expiresAt?.toISOString() ?? null,
  lastAccessedAt: link.lastAccessedAt?.toISOString() ?? null,
  accessCount: link.accessCount,
  createdBy: link.createdBy,
});

/** Enlaces de solo lectura de un setlist: crearlos, verlos y revocarlos (miembros) y abrirlos sin cuenta (publico). */
@Injectable()
export class ShareLinksService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async findSetlist(member: OrgMember, setlistId: string) {
    const setlist = await this.prisma.setlist.findFirst({ where: { id: setlistId, organizationId: member.organizationId }, select: { id: true, isTemplate: true } });
    if (!setlist) throw new NotFoundException('Setlist no encontrado');
    return setlist;
  }

  /** Los activos (sin revocar ni vencidos), el mas nuevo primero. */
  async list(member: OrgMember, setlistId: string, now = new Date()) {
    await this.findSetlist(member, setlistId);
    const links = await this.prisma.setlistShareLink.findMany({
      where: { setlistId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      orderBy: { createdAt: 'desc' },
      select: linkSelect,
    });
    return { items: links.map(toShareLink) };
  }

  async create(member: OrgMember, setlistId: string, data: CreateShareLinkData, now = new Date()): Promise<CreatedShareLink> {
    const setlist = await this.findSetlist(member, setlistId);
    if (setlist.isTemplate) throw new BadRequestException('Las plantillas no se comparten; crea un setlist desde ella primero');
    const token = generateShareToken();
    const link = await this.prisma.setlistShareLink.create({
      data: { setlistId, tokenHash: hashShareToken(token), expiresAt: shareLinkExpiresAt(data.duration, now), createdById: member.userId },
      select: linkSelect,
    });
    return { ...toShareLink(link), token };
  }

  async revoke(member: OrgMember, setlistId: string, linkId: string, now = new Date()) {
    await this.findSetlist(member, setlistId);
    const revoked = await this.prisma.setlistShareLink.updateMany({ where: { id: linkId, setlistId, revokedAt: null }, data: { revokedAt: now } });
    if (revoked.count === 0) throw new NotFoundException('Enlace no encontrado');
    return { ok: true };
  }

  /** La pagina publica: solo nombre, fecha del evento, orden, tonalidad y letra con acordes. */
  async shared(token: string, now = new Date()): Promise<SharedSetlist> {
    if (!looksLikeShareToken(token)) throw new NotFoundException(SHARED_SETLIST_NOT_FOUND);
    const link = await this.prisma.setlistShareLink.findUnique({
      where: { tokenHash: hashShareToken(token) },
      select: {
        id: true,
        revokedAt: true,
        expiresAt: true,
        setlist: {
          select: {
            name: true,
            isTemplate: true,
            organization: { select: { archivedAt: true } },
            events: { where: { status: { not: 'CANCELLED' } }, select: { startsAt: true } },
            items: {
              where: { isHidden: false },
              orderBy: { order: 'asc' },
              select: {
                type: true,
                title: true,
                keyOverride: true,
                bpmOverride: true,
                durationOverrideSec: true,
                estimatedSec: true,
                capo: true,
                song: { select: { artist: true } },
                songVersion: { select: { key: true, bpm: true, durationSec: true, contentJson: true, lyrics: true, chords: true } },
              },
            },
          },
        },
      },
    });
    if (!link || !isShareLinkActive(link, now) || link.setlist.isTemplate || link.setlist.organization.archivedAt) {
      throw new NotFoundException(SHARED_SETLIST_NOT_FOUND);
    }

    await this.prisma.setlistShareLink.update({ where: { id: link.id }, data: { lastAccessedAt: now, accessCount: { increment: 1 } } });

    const eventDate = sharedEventDate(link.setlist.events, now);
    return {
      name: link.setlist.name,
      eventStartsAt: eventDate?.toISOString() ?? null,
      items: link.setlist.items.map((item, index) => {
        const isSong = item.type === 'SONG';
        return {
          order: index + 1,
          type: item.type,
          title: item.title,
          artist: isSong ? (item.song?.artist ?? null) : null,
          key: isSong ? resolveSetlistItemEffectiveValues(item, item.songVersion ?? undefined).key : null,
          originalKey: isSong ? (item.songVersion?.key ?? null) : null,
          content: isSong ? sharedSongContent(item.songVersion) : null,
        };
      }),
    };
  }
}
