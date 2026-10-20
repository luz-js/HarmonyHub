import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthRepository, AuthService, AuthGuard, JwtService],
  exports: [AuthGuard, JwtService, AuthService],
})
export class AuthModule {}
