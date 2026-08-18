import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UploadsController],
})
export class UploadsModule {}
