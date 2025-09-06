import {
  IsArray,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageRole, TaskPriority, TaskType } from '@prisma/client';

export class TaskFileDto {
  @IsNotEmpty()
  @IsString()
  name!: string; // Definite assignment assertion for NestJS DTO validation

  @IsNotEmpty()
  @IsString()
  base64!: string; // Definite assignment assertion for NestJS DTO validation

  @IsNotEmpty()
  @IsString()
  type!: string; // Definite assignment assertion for NestJS DTO validation

  @IsNotEmpty()
  @IsNumber()
  size!: number; // Definite assignment assertion for NestJS DTO validation
}

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  description!: string; // Definite assignment assertion for NestJS DTO validation

  @IsOptional()
  @IsString()
  type?: TaskType;

  @IsOptional()
  @IsDate()
  scheduledFor?: Date;

  @IsOptional()
  @IsString()
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  createdBy?: Role;

  @IsOptional()
  model?: any;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskFileDto)
  files?: TaskFileDto[];
}
