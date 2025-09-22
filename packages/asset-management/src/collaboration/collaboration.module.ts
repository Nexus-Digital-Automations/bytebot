import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollaborationSession } from './entities/collaboration-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CollaborationSession])],
  controllers: [],
  providers: [],
  exports: [],
})
export class CollaborationModule {}