import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SongActivityRepository } from './activity/song-activity.repository';
import { SongActivityService } from './activity/song-activity.service';
import { SongCollaborationController } from './collaboration/song-collaboration.controller';
import { FilesController } from './files.controller';
import { SongCollaborationRepository } from './collaboration/song-collaboration.repository';
import { SongCollaborationService } from './collaboration/song-collaboration.service';
import { SongHistoryController } from './history/song-history.controller';
import { SongRevisionsRepository } from './history/song-revisions.repository';
import { SongRevisionsService } from './history/song-revisions.service';
import { SongNotesController } from './notes/song-notes.controller';
import { SongNotesRepository } from './notes/song-notes.repository';
import { SongNotesService } from './notes/song-notes.service';
import { SongsAccessService } from './songs-access.service';
import { SongsController } from './songs.controller';
import { SongsFilesService } from './songs-files.service';
import { SongsLinksService } from './songs-links.service';
import { SongsRepository } from './songs.repository';
import { SongFilesRepository } from './files/song-files.repository';
import { SongLinksRepository } from './links/song-links.repository';
import { SongTracksRepository } from './tracks/song-tracks.repository';
import { SongVersionsRepository } from './versions/song-versions.repository';
import { SongsService } from './songs.service';
import { SongsTracksService } from './songs-tracks.service';
import { SongsVersionsService } from './songs-versions.service';
import { createTrackStorageProvider } from './storage/track-storage.factory';
import { TRACK_STORAGE } from './storage/track-storage.interface';

@Module({
  imports: [AuthModule, PrismaModule, PermissionsModule],
  controllers: [SongsController, SongNotesController, SongCollaborationController, SongHistoryController, FilesController],
  providers: [
    SongsRepository,
    SongVersionsRepository,
    SongLinksRepository,
    SongTracksRepository,
    SongFilesRepository,
    SongsService,
    SongsAccessService,
    SongsVersionsService,
    SongsLinksService,
    SongsTracksService,
    SongsFilesService,
    { provide: TRACK_STORAGE, useFactory: () => createTrackStorageProvider() },
    SongNotesRepository,
    SongNotesService,
    SongCollaborationRepository,
    SongCollaborationService,
    SongActivityRepository,
    SongActivityService,
    SongRevisionsRepository,
    SongRevisionsService,
  ],
})
export class SongsModule {}
