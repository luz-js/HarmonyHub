import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import {
  advanceLiveStageSchema,
  handoverLiveStageSchema,
  startLiveStageSchema,
  type AdvanceLiveStageData,
  type HandoverLiveStageData,
  type LiveStageState,
  type StartLiveStageData,
} from '@harmonyhub/contracts';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentMembership, OrgMember } from '../../permissions/current-membership.decorator';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { RequirePermission } from '../../permissions/require-permission.decorator';
import { ZodPipe } from '../../shared/zod.pipe';
import { LiveStageService } from './live-stage.service';

/** Lo minimo de Express que usa el stream (la API no depende de los tipos de Express). */
type StreamRequest = { on(event: 'close', listener: () => void): void };
type StreamResponse = {
  status(code: number): StreamResponse;
  setHeader(name: string, value: string): void;
  flushHeaders?(): void;
  write(chunk: string): boolean;
  end(): void;
};

/** Cada cuanto se manda un "sigo aqui" para que proxies y el cliente no den la conexion por muerta. */
function heartbeatMs() {
  const value = Number(process.env.LIVE_STAGE_HEARTBEAT_MS);
  return Number.isFinite(value) && value > 0 ? value : 20_000;
}

/** Modo escenario en vivo: el lider avanza y los demas dispositivos lo siguen (Server-Sent Events). */
@Controller('api/setlists')
@UseGuards(AuthGuard, PermissionsGuard)
export class LiveStageController {
  constructor(@Inject(LiveStageService) private readonly live: LiveStageService) {}

  @Get(':id/live')
  @RequirePermission('read')
  state(@CurrentMembership() member: OrgMember, @Param('id') id: string) {
    return this.live.state(member, id);
  }

  /**
   * Stream SSE con el estado en vivo. Se autentica con el header Authorization normal (el cliente usa fetch, no
   * EventSource, asi el token nunca va en la URL). Al conectar llega el estado actual; despues, cada cambio.
   */
  @Get(':id/live/stream')
  @RequirePermission('read')
  async stream(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Req() request: StreamRequest, @Res() response: StreamResponse) {
    let open = true;
    let started = false;
    const write = (chunk: string) => {
      if (!open) return;
      // Los headers del stream salen con el primer mensaje: si antes falla (404), Nest responde el error normal.
      if (!started) {
        started = true;
        response.status(200);
        response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        response.setHeader('Cache-Control', 'no-cache, no-transform');
        response.setHeader('Connection', 'keep-alive');
        response.setHeader('X-Accel-Buffering', 'no');
        response.flushHeaders?.();
      }
      response.write(chunk);
    };
    const close = () => {
      if (!open) return;
      open = false;
      response.end();
    };

    const unsubscribe = await this.live.connect(member, id, {
      send: (state: LiveStageState) => write(`event: state\ndata: ${JSON.stringify(state)}\n\n`),
      close,
    });
    const heartbeat = setInterval(() => write(': ping\n\n'), heartbeatMs());
    heartbeat.unref?.();
    request.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
      close();
    });
  }

  @Post(':id/live/start')
  @HttpCode(200)
  @RequirePermission('stage.lead')
  start(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(startLiveStageSchema)) body: StartLiveStageData) {
    return this.live.start(member, id, body);
  }

  @Post(':id/live/advance')
  @HttpCode(200)
  @RequirePermission('stage.lead')
  advance(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(advanceLiveStageSchema)) body: AdvanceLiveStageData) {
    return this.live.advance(member, id, body);
  }

  @Post(':id/live/handover')
  @HttpCode(200)
  @RequirePermission('stage.lead')
  handover(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(handoverLiveStageSchema)) body: HandoverLiveStageData) {
    return this.live.handover(member, id, body);
  }

  @Post(':id/live/end')
  @HttpCode(200)
  @RequirePermission('stage.lead')
  end(@CurrentMembership() member: OrgMember, @Param('id') id: string) {
    return this.live.end(member, id);
  }
}
