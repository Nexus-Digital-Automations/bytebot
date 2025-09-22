import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from '../asset/entities/asset.entity';
import { SemanticSearchService } from './services/semantic-search.service';

@Module({
  imports: [TypeOrmModule.forFeature([Asset])],
  controllers: [],
  providers: [SemanticSearchService],
  exports: [SemanticSearchService],
})
export class SearchModule {}