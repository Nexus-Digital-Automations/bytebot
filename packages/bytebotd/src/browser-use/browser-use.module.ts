import { Module } from '@nestjs/common';
import { BrowserUseService } from './browser-use.service';
import { BrowserInteractionService } from './browser-interaction.service';
import { BrowserSessionService } from './browser-session.service';

@Module({
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