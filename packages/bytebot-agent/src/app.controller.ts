import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  ParlantValidated,
  SecurityLevel,
} from '@bytebot/shared/dist/index-server';
import { AppService } from './app.service';

@ApiTags('Application')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Application health check',
    description:
      'Returns a simple greeting message to verify the application is running',
  })
  @ApiResponse({
    status: 200,
    description: 'Application greeting message',
    schema: { type: 'string', example: 'Hello World!' },
  })
  @ParlantValidated({
    intent: 'Get application status',
    securityLevel: SecurityLevel._MINIMAL,
    description: 'Basic application health check endpoint',
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
