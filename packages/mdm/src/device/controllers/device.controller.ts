/**
 * Device Controller
 * Main controller for device management operations
 *
 * Agent 3: Device Management - REST API Controller
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  HttpCode,
  Logger
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@bytebot/shared';
import { DeviceService } from '../services/device.service';
import { Device, DeviceStatus, DevicePlatform } from '../entities/device.entity';
import { DeviceOwnershipGuard } from '../guards/device-ownership.guard';
import { DeviceComplianceInterceptor } from '../interceptors/device-compliance.interceptor';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { UpdateDeviceDto } from '../dto/update-device.dto';
import { DeviceFilterDto } from '../dto/device-filter.dto';
import { DeviceResponseDto } from '../dto/device-response.dto';
import { MdmLogger } from '../../common/logger/mdm-logger.service';

/**
 * Device Management Controller
 * Handles all device-related REST API operations
 */
@ApiTags('Device Management')
@Controller('devices')
@UseGuards(JwtAuthGuard)
@UseInterceptors(DeviceComplianceInterceptor)
@ApiBearerAuth('JWT-auth')
export class DeviceController {
  private readonly logger = new Logger('DeviceController');

  constructor(
    private readonly deviceService: DeviceService,
    private readonly mdmLogger: MdmLogger
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new device',
    description: 'Register a new mobile device in the MDM system with comprehensive validation'
  })
  @ApiBody({ type: CreateDeviceDto })
  @ApiResponse({
    status: 201,
    description: 'Device registered successfully',
    type: DeviceResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid device data' })
  @ApiResponse({ status: 409, description: 'Device already exists' })
  async registerDevice(@Body() createDeviceDto: CreateDeviceDto): Promise<DeviceResponseDto> {
    this.logger.log(`Registering new device: ${createDeviceDto.serialNumber}`);

    try {
      const device = await this.deviceService.registerDevice(createDeviceDto);

      this.mdmLogger.logDeviceAction(
        device.id,
        'device_registration',
        createDeviceDto.userId,
        { platform: device.platform, model: device.model }
      );

      return new DeviceResponseDto(device);
    } catch (error) {
      this.logger.error(`Failed to register device: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Get all devices',
    description: 'Retrieve a paginated list of all managed devices with filtering and sorting'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'status', required: false, enum: DeviceStatus, description: 'Filter by device status' })
  @ApiQuery({ name: 'platform', required: false, enum: DevicePlatform, description: 'Filter by platform' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by user ID' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in device name or serial' })
  @ApiResponse({
    status: 200,
    description: 'Devices retrieved successfully',
    type: [DeviceResponseDto]
  })
  async getAllDevices(@Query() filterDto: DeviceFilterDto): Promise<{
    devices: DeviceResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.logger.log('Retrieving devices list', { filters: filterDto });

    const result = await this.deviceService.getAllDevices(filterDto);

    return {
      devices: result.devices.map(device => new DeviceResponseDto(device)),
      total: result.total,
      page: filterDto.page || 1,
      limit: filterDto.limit || 20,
      totalPages: Math.ceil(result.total / (filterDto.limit || 20))
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get device by ID',
    description: 'Retrieve detailed information about a specific device'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Device unique identifier' })
  @ApiResponse({
    status: 200,
    description: 'Device found',
    type: DeviceResponseDto
  })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @UseGuards(DeviceOwnershipGuard)
  async getDeviceById(@Param('id') id: string): Promise<DeviceResponseDto> {
    this.logger.log(`Retrieving device: ${id}`);

    const device = await this.deviceService.getDeviceById(id);
    return new DeviceResponseDto(device);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update device information',
    description: 'Update device details and configuration'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Device unique identifier' })
  @ApiBody({ type: UpdateDeviceDto })
  @ApiResponse({
    status: 200,
    description: 'Device updated successfully',
    type: DeviceResponseDto
  })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @UseGuards(DeviceOwnershipGuard)
  async updateDevice(
    @Param('id') id: string,
    @Body() updateDeviceDto: UpdateDeviceDto
  ): Promise<DeviceResponseDto> {
    this.logger.log(`Updating device: ${id}`);

    try {
      const device = await this.deviceService.updateDevice(id, updateDeviceDto);

      this.mdmLogger.logDeviceAction(
        device.id,
        'device_update',
        device.userId,
        { changes: updateDeviceDto }
      );

      return new DeviceResponseDto(device);
    } catch (error) {
      this.logger.error(`Failed to update device ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove device from management',
    description: 'Permanently remove a device from MDM management (soft delete)'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Device unique identifier' })
  @ApiResponse({ status: 204, description: 'Device removed successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @UseGuards(DeviceOwnershipGuard)
  async removeDevice(@Param('id') id: string): Promise<void> {
    this.logger.log(`Removing device: ${id}`);

    try {
      await this.deviceService.removeDevice(id);

      this.mdmLogger.logDeviceAction(
        id,
        'device_removal',
        undefined,
        { reason: 'manual_removal' }
      );
    } catch (error) {
      this.logger.error(`Failed to remove device ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post(':id/wipe')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Initiate remote device wipe',
    description: 'Send remote wipe command to device (requires elevated permissions)'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Device unique identifier' })
  @ApiResponse({ status: 202, description: 'Wipe command initiated' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @UseGuards(DeviceOwnershipGuard)
  async wipeDevice(@Param('id') id: string): Promise<{ message: string; wipeId: string }> {
    this.logger.log(`Initiating device wipe: ${id}`);

    try {
      const wipeResult = await this.deviceService.initiateDeviceWipe(id);

      this.mdmLogger.logSecurityEvent(
        'device_wipe_initiated',
        'high',
        { deviceId: id, wipeId: wipeResult.wipeId }
      );

      return {
        message: 'Device wipe initiated successfully',
        wipeId: wipeResult.wipeId
      };
    } catch (error) {
      this.logger.error(`Failed to wipe device ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post(':id/lock')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Lock device remotely',
    description: 'Send remote lock command to device'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Device unique identifier' })
  @ApiResponse({ status: 202, description: 'Lock command sent' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @UseGuards(DeviceOwnershipGuard)
  async lockDevice(@Param('id') id: string): Promise<{ message: string }> {
    this.logger.log(`Locking device: ${id}`);

    try {
      await this.deviceService.lockDevice(id);

      this.mdmLogger.logDeviceAction(
        id,
        'device_lock',
        undefined,
        { action: 'remote_lock' }
      );

      return { message: 'Device lock command sent successfully' };
    } catch (error) {
      this.logger.error(`Failed to lock device ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get(':id/status')
  @ApiOperation({
    summary: 'Get device status',
    description: 'Retrieve current device status and compliance information'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Device unique identifier' })
  @ApiResponse({ status: 200, description: 'Device status retrieved' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @UseGuards(DeviceOwnershipGuard)
  async getDeviceStatus(@Param('id') id: string): Promise<{
    status: DeviceStatus;
    isOnline: boolean;
    lastCheckIn: Date;
    complianceStatus: string;
    batteryLevel?: number;
    locationStatus: {
      latitude?: number;
      longitude?: number;
      lastUpdated?: Date;
    };
  }> {
    this.logger.log(`Getting device status: ${id}`);

    const device = await this.deviceService.getDeviceById(id);
    const statusInfo = await this.deviceService.getDeviceStatusInfo(id);

    return {
      status: device.status,
      isOnline: device.isOnline,
      lastCheckIn: device.lastCheckIn,
      complianceStatus: device.complianceStatus,
      batteryLevel: device.batteryLevel,
      locationStatus: {
        latitude: device.lastLatitude,
        longitude: device.lastLongitude,
        lastUpdated: device.lastCheckIn
      },
      ...statusInfo
    };
  }

  @Post(':id/checkin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Device check-in',
    description: 'Process device check-in with status updates'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Device unique identifier' })
  @ApiResponse({ status: 200, description: 'Check-in processed successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async deviceCheckIn(
    @Param('id') id: string,
    @Body() checkInData: {
      batteryLevel?: number;
      availableStorage?: number;
      location?: { latitude: number; longitude: number };
      installedApps?: string[];
      complianceInfo?: any;
    }
  ): Promise<{ message: string; policies?: any[]; commands?: any[] }> {
    this.logger.log(`Processing check-in for device: ${id}`);

    try {
      const result = await this.deviceService.processDeviceCheckIn(id, checkInData);

      this.mdmLogger.logDeviceAction(
        id,
        'device_checkin',
        undefined,
        { batteryLevel: checkInData.batteryLevel }
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to process check-in for device ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }
}