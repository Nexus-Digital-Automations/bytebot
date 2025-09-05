import { Module } from '@nestjs/common';
import { ComputerUseModule } from './computer-use/computer-use.module';
import { InputTrackingModule } from './input-tracking/input-tracking.module';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BytebotMcpModule } from './mcp';
import { CuaIntegrationModule } from './cua-integration/cua-integration.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Explicitly makes it globally available
    }),
    ServeStaticModule.forRoot({
      rootPath: '/opt/noVNC',
      serveRoot: '/novnc',
    }),
    ComputerUseModule,
    InputTrackingModule,
    BytebotMcpModule,
    CuaIntegrationModule, // C/ua Framework Integration
    HealthModule, // System health monitoring
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
