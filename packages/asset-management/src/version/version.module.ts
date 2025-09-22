import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetVersion } from './entities/asset-version.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AssetVersion])],
  controllers: [],
  providers: [],
  exports: [],
})
export class VersionModule {}