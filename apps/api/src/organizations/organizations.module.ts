import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { PrismaModule } from '../prisma/prisma.module';
import { InvitationsController } from '../invitations/invitations.controller';
import { MyInvitationsController } from '../invitations/my-invitations.controller';
import { InvitationsService } from '../invitations/invitations.service';
import { MembershipsController } from '../memberships/memberships.controller';
import { MembershipsService } from '../memberships/memberships.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [AuthModule, PrismaModule, PermissionsModule],
  controllers: [OrganizationsController, MembershipsController, InvitationsController, MyInvitationsController],
  providers: [OrganizationsService, MembershipsService, InvitationsService],
})
export class OrganizationsModule {}
