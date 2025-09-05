import { Module } from '@nestjs/common';
import { ComputerUseService } from './computer-use.service';
import { ComputerUseController } from './computer-use.controller';
import { NutModule } from '../nut/nut.module';
import { CuaIntegrationModule } from '../cua-integration/cua-integration.module';

@Module({
  imports: [
    NutModule,
    CuaIntegrationModule, // Import C/ua integration for enhanced capabilities
  ],
  controllers: [ComputerUseController],
  providers: [ComputerUseService],
  exports: [ComputerUseService],
})
export class ComputerUseModule {}
