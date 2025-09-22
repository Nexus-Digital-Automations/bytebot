/**
 * Notification Module
 * Handles system notifications, alerts, and communication
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Notification } from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationChannel } from './entities/notification-channel.entity';

// Controllers
import { NotificationController } from './controllers/notification.controller';

// Services
import { NotificationService } from './services/notification.service';
import { NotificationChannelService } from './services/notification-channel.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationTemplate,
      NotificationChannel
    ])
  ],
  controllers: [
    NotificationController
  ],
  providers: [
    NotificationService,
    NotificationChannelService
  ],
  exports: [
    NotificationService,
    NotificationChannelService
  ]
})
export class NotificationModule {}