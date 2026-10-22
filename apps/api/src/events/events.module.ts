import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsController } from './events.controller';
import { EventsCalendarController } from './calendar/events-calendar.controller';
import { EventsCalendarService } from './calendar/events-calendar.service';
import { EventsRepository } from './events.repository';
import { EventsService } from './events.service';

@Module({
  imports: [AuthModule, PrismaModule, PermissionsModule, NotificationsModule],
  controllers: [EventsController, EventsCalendarController],
  providers: [EventsRepository, EventsService, EventsCalendarService],
})
export class EventsModule {}
