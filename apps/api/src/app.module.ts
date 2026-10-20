import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EventsModule } from './events/events.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PrismaModule } from './prisma/prisma.module';
import { SetlistsModule } from './setlists/setlists.module';
import { SongsModule } from './songs/songs.module';

@Module({
  imports: [PrismaModule, PermissionsModule, AuthModule, SongsModule, SetlistsModule, EventsModule, DashboardModule, OrganizationsModule],
})
export class AppModule {}
