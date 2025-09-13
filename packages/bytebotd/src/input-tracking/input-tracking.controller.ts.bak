import { Controller, Post, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OperatorOrAdmin, CurrentUser, ByteBotdUser } from '../auth/decorators/roles.decorator';
import { InputTrackingService } from './input-tracking.service';

/**
 * Input Tracking Controller - Secured Input Monitoring API
 * 
 * Controls system input tracking operations with JWT authentication
 * and role-based authorization. Only OPERATOR and ADMIN users can
 * control input tracking to prevent unauthorized system monitoring.
 */
@ApiTags('Input Tracking')
@Controller('input-tracking')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer')
export class InputTrackingController {
  private readonly logger = new Logger(InputTrackingController.name);

  constructor(private readonly inputTrackingService: InputTrackingService) {}

  /**
   * Start input tracking
   * Requires OPERATOR or ADMIN role for security
   */
  @Post('start')
  @OperatorOrAdmin()
  @ApiOperation({
    summary: 'Start input tracking',
    description: 'Begin monitoring system input events. Requires OPERATOR or ADMIN role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Input tracking started successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'started' },
        timestamp: { type: 'string', format: 'date-time' },
        userId: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required'
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required'
  })
  start(@CurrentUser() user: ByteBotdUser) {
    const operationId = `input-tracking-start-${Date.now()}`;
    
    this.logger.log(`[${operationId}] Starting input tracking`, {
      operationId,
      userId: user.id,
      username: user.username,
      userRole: user.role,
      securityEvent: 'input_tracking_started',
    });

    this.inputTrackingService.startTracking();
    
    return { 
      status: 'started',
      timestamp: new Date().toISOString(),
      userId: user.id
    };
  }

  /**
   * Stop input tracking
   * Requires OPERATOR or ADMIN role for security
   */
  @Post('stop')
  @OperatorOrAdmin()
  @ApiOperation({
    summary: 'Stop input tracking',
    description: 'Stop monitoring system input events. Requires OPERATOR or ADMIN role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Input tracking stopped successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'stopped' },
        timestamp: { type: 'string', format: 'date-time' },
        userId: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required'
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required'
  })
  stop(@CurrentUser() user: ByteBotdUser) {
    const operationId = `input-tracking-stop-${Date.now()}`;
    
    this.logger.log(`[${operationId}] Stopping input tracking`, {
      operationId,
      userId: user.id,
      username: user.username,
      userRole: user.role,
      securityEvent: 'input_tracking_stopped',
    });

    this.inputTrackingService.stopTracking();
    
    return { 
      status: 'stopped',
      timestamp: new Date().toISOString(),
      userId: user.id
    };
  }
}
