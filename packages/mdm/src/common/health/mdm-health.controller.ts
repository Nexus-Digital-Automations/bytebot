/**
 * MDM Health Check Controller
 * Provides comprehensive health monitoring and system status endpoints
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator
} from '@nestjs/terminus';

@ApiTags('Health')
@Controller('health')
export class MdmHealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, description: 'System health check results' })
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
      () => this.disk.checkStorage('storage', { thresholdPercent: 0.9, path: '/' })
    ]);
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Get service readiness status' })
  @ApiResponse({ status: 200, description: 'Service readiness check' })
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database')
    ]);
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Get service liveness status' })
  @ApiResponse({ status: 200, description: 'Service liveness check' })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }
}