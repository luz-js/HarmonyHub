import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AvailabilityController, MyUnavailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';

@Module({
  imports: [AuthModule, PrismaModule, PermissionsModule],
  controllers: [MyUnavailabilityController, AvailabilityController],
  providers: [AvailabilityService],
})
export class AvailabilityModule {}
