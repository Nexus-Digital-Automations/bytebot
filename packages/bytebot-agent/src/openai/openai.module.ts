import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAIService } from './openai.service';
import { SecretsService } from '../config/secrets.service';

@Module({
  imports: [ConfigModule],
  providers: [OpenAIService, SecretsService],
  exports: [OpenAIService, SecretsService],
})
export class OpenAIModule {}
