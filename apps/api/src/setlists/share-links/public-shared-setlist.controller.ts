import { Controller, Get, Inject, Ip, Param, Res } from '@nestjs/common';
import { PublicRequestLimiter } from './public-request-limiter';
import { ShareLinksService } from './share-links.service';

type HeaderResponse = { setHeader(name: string, value: string): void };

/** Van en toda respuesta (tambien en el 404 y el 429): no se indexa, no se guarda en caches compartidas. */
export const PUBLIC_SHARE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store, private',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
};

/**
 * Pagina publica de un setlist compartido: sin sesion ni organizacion (el token es la llave). Responde lo mismo
 * para cualquier token que no sirve.
 */
@Controller('api/public/shared-setlists')
export class PublicSharedSetlistController {
  constructor(
    @Inject(ShareLinksService) private readonly shareLinks: ShareLinksService,
    @Inject(PublicRequestLimiter) private readonly limiter: PublicRequestLimiter,
  ) {}

  @Get(':token')
  async shared(@Param('token') token: string, @Ip() ip: string, @Res({ passthrough: true }) response: HeaderResponse) {
    for (const [name, value] of Object.entries(PUBLIC_SHARE_HEADERS)) response.setHeader(name, value);
    await this.limiter.hit(ip);
    return this.shareLinks.shared(token);
  }
}
