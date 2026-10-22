import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SetlistAssignmentsController } from './assignments/setlist-assignments.controller';
import { SetlistAssignmentsRepository } from './assignments/setlist-assignments.repository';
import { SetlistAssignmentsService } from './assignments/setlist-assignments.service';
import { SetlistParticipantsController } from './assignments/setlist-participants.controller';
import { SetlistParticipantsRepository } from './assignments/setlist-participants.repository';
import { SetlistParticipantsService } from './assignments/setlist-participants.service';
import { SetlistRoleRequirementsController } from './assignments/setlist-role-requirements.controller';
import { SetlistRoleRequirementsRepository } from './assignments/setlist-role-requirements.repository';
import { SetlistRoleRequirementsService } from './assignments/setlist-role-requirements.service';
import { SetlistCuesController } from './cues/setlist-cues.controller';
import { SetlistCuesRepository } from './cues/setlist-cues.repository';
import { SetlistCuesService } from './cues/setlist-cues.service';
import { SetlistItemsController } from './items/setlist-items.controller';
import { SetlistItemsRepository } from './items/setlist-items.repository';
import { SetlistItemsService } from './items/setlist-items.service';
import { SetlistsAccessService } from './setlists-access.service';
import { SetlistsController } from './setlists.controller';
import { SetlistsRepository } from './setlists.repository';
import { SetlistsService } from './setlists.service';
import { LiveStageController } from './live/live-stage.controller';
import { LiveStageHub } from './live/live-stage.hub';
import { LiveStageService } from './live/live-stage.service';

@Module({
  imports: [AuthModule, PrismaModule, PermissionsModule, NotificationsModule],
  controllers: [
    SetlistsController,
    SetlistItemsController,
    SetlistParticipantsController,
    SetlistAssignmentsController,
    SetlistRoleRequirementsController,
    SetlistCuesController,
    LiveStageController,
  ],
  providers: [
    SetlistsRepository,
    SetlistsService,
    SetlistsAccessService,
    SetlistItemsRepository,
    SetlistItemsService,
    SetlistParticipantsRepository,
    SetlistParticipantsService,
    SetlistAssignmentsRepository,
    SetlistAssignmentsService,
    SetlistRoleRequirementsRepository,
    SetlistRoleRequirementsService,
    SetlistCuesRepository,
    SetlistCuesService,
    LiveStageHub,
    LiveStageService,
  ],
})
export class SetlistsModule {}
