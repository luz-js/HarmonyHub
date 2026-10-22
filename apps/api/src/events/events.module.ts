import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsController } from './events.controller';
import { EventsRepository } from './events.repository';
import { EventsService } from './events.service';

@Module({
  imports: [AuthModule, PrismaModule, PermissionsModule, NotificationsModule],
  controllers: [EventsController],
  providers: [EventsRepository, EventsService],
})
export class EventsModule {}
