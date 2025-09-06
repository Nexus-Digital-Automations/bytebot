import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleService } from './google.service';
import { SecretsService } from '../config/secrets.service';

@Module({
  imports: [ConfigModule],
  providers: [GoogleService, SecretsService],
  exports: [GoogleService, SecretsService],
})
export class GoogleModule {}
