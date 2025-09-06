import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnthropicService } from './anthropic.service';
import { SecretsService } from '../config/secrets.service';

@Module({
  imports: [ConfigModule],
  providers: [AnthropicService, SecretsService],
  exports: [AnthropicService, SecretsService],
})
export class AnthropicModule {}
