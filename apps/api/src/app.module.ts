import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
import { AuthRepository } from './auth/auth.repository';
import { AuthService } from './auth/auth.service';
import { AuthGuard } from './auth/auth.guard';
import { JwtService } from './auth/jwt.service';
import { PrismaService } from './prisma/prisma.service';
import { SongsController } from './songs/songs.controller';
import { SongsRepository } from './songs/songs.repository';
import { SongsService } from './songs/songs.service';
import { TRACK_STORAGE } from './songs/storage/track-storage.interface';
import { createTrackStorageProvider } from './songs/storage/track-storage.factory';
import { SongNotesController } from './songs/notes/song-notes.controller';
import { SongNotesRepository } from './songs/notes/song-notes.repository';
import { SongNotesService } from './songs/notes/song-notes.service';
import { SongCollaborationController } from './songs/collaboration/song-collaboration.controller';
import { SongCollaborationRepository } from './songs/collaboration/song-collaboration.repository';
import { SongCollaborationService } from './songs/collaboration/song-collaboration.service';
import { SongActivityRepository } from './songs/activity/song-activity.repository';
import { SongActivityService } from './songs/activity/song-activity.service';
import { SongHistoryController } from './songs/history/song-history.controller';
import { SongRevisionsRepository } from './songs/history/song-revisions.repository';
import { SongRevisionsService } from './songs/history/song-revisions.service';
import { SetlistsController } from './setlists/setlists.controller';
import { SetlistsRepository } from './setlists/setlists.repository';
import { SetlistsService } from './setlists/setlists.service';
import { SetlistItemsController } from './setlists/items/setlist-items.controller';
import { SetlistItemsRepository } from './setlists/items/setlist-items.repository';
import { SetlistItemsService } from './setlists/items/setlist-items.service';
import { SetlistParticipantsController } from './setlists/assignments/setlist-participants.controller';
import { SetlistParticipantsRepository } from './setlists/assignments/setlist-participants.repository';
import { SetlistParticipantsService } from './setlists/assignments/setlist-participants.service';
import { SetlistAssignmentsController } from './setlists/assignments/setlist-assignments.controller';
import { SetlistAssignmentsRepository } from './setlists/assignments/setlist-assignments.repository';
import { SetlistAssignmentsService } from './setlists/assignments/setlist-assignments.service';
import { SetlistRoleRequirementsController } from './setlists/assignments/setlist-role-requirements.controller';
import { SetlistRoleRequirementsRepository } from './setlists/assignments/setlist-role-requirements.repository';
import { SetlistRoleRequirementsService } from './setlists/assignments/setlist-role-requirements.service';
import { OrganizationsController } from './organizations/organizations.controller';
import { OrganizationsService } from './organizations/organizations.service';
import { MembershipsController } from './memberships/memberships.controller';
import { MembershipsService } from './memberships/memberships.service';
import { InvitationsController } from './invitations/invitations.controller';
import { InvitationsService } from './invitations/invitations.service';
import { PermissionsService } from './permissions/permissions.service';

@Module({
  controllers: [
    AuthController,
    SongsController,
    SongNotesController,
    SongCollaborationController,
    SongHistoryController,
    SetlistsController,
    SetlistItemsController,
    SetlistParticipantsController,
    SetlistAssignmentsController,
    SetlistRoleRequirementsController,
    OrganizationsController,
    MembershipsController,
    InvitationsController,
  ],
  providers: [
    PrismaService,
    AuthRepository,
    AuthService,
    AuthGuard,
    JwtService,
    SongsRepository,
    SongsService,
    { provide: TRACK_STORAGE, useFactory: () => createTrackStorageProvider() },
    SongNotesRepository,
    SongNotesService,
    SongCollaborationRepository,
    SongCollaborationService,
    SongActivityRepository,
    SongActivityService,
    SongRevisionsRepository,
    SongRevisionsService,
    SetlistsRepository,
    SetlistsService,
    SetlistItemsRepository,
    SetlistItemsService,
    SetlistParticipantsRepository,
    SetlistParticipantsService,
    SetlistAssignmentsRepository,
    SetlistAssignmentsService,
    SetlistRoleRequirementsRepository,
    SetlistRoleRequirementsService,
    OrganizationsService,
    MembershipsService,
    InvitationsService,
    PermissionsService,
  ],
})
export class AppModule {}
