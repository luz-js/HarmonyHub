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
import { OrganizationsController } from './organizations/organizations.controller';
import { OrganizationsService } from './organizations/organizations.service';
import { MembershipsController } from './memberships/memberships.controller';
import { MembershipsService } from './memberships/memberships.service';
import { InvitationsController } from './invitations/invitations.controller';
import { InvitationsService } from './invitations/invitations.service';
import { PermissionsService } from './permissions/permissions.service';

@Module({
  controllers: [AuthController, SongsController, OrganizationsController, MembershipsController, InvitationsController],
  providers: [PrismaService, AuthRepository, AuthService, AuthGuard, JwtService, SongsRepository, SongsService, OrganizationsService, MembershipsService, InvitationsService, PermissionsService],
})
export class AppModule {}
