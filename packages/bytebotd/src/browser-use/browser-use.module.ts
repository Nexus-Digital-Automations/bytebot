import { Module } from '@nestjs/common';
import { BrowserUseService } from './browser-use.service';
import { BrowserInteractionService } from './browser-interaction.service';
import { BrowserSessionService } from './browser-session.service';
import { BrowserUseController } from './browser-use.controller';

@Module({
  controllers: [
    BrowserUseController,
  ],
  providers: [
    BrowserUseService,
    BrowserInteractionService,
    BrowserSessionService,
  ],
  exports: [
    BrowserUseService,
    BrowserInteractionService,
    BrowserSessionService,
  ],
})
export class BrowserUseModule {}