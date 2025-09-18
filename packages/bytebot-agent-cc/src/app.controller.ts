import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ParlantValidated, SecurityLevel } from '@bytebot/shared/server';
import { AppService } from './app.service';

@ApiTags('Application - Creative Coding')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Creative Coding Agent health check',
    description:
      'Returns a greeting message to verify the Creative Coding Agent is running',
  })
  @ApiResponse({
    status: 200,
    description: 'Creative Coding Agent greeting message',
    schema: { type: 'string', example: 'Hello World!' },
  })
  @ParlantValidated({
    intent: 'Get Creative Coding Agent status',
    securityLevel: SecurityLevel._MINIMAL,
    description:
      'Basic health check endpoint for Creative Coding Agent service',
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
