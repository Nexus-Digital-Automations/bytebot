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
import { Role, TaskPriority, TaskType } from '@prisma/client';

export class TaskFileDto {
  @IsNotEmpty()
  @IsString()
  name!: string; // Definite assignment assertion - validated by class-validator decorators

  @IsNotEmpty()
  @IsString()
  base64!: string; // Definite assignment assertion - validated by class-validator decorators

  @IsNotEmpty()
  @IsString()
  type!: string; // Definite assignment assertion - validated by class-validator decorators

  @IsNotEmpty()
  @IsNumber()
  size!: number; // Definite assignment assertion - validated by class-validator decorators
}

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  description!: string; // Definite assignment assertion - validated by class-validator decorators

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
  @IsString()
  model?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskFileDto)
  files?: TaskFileDto[];
}
