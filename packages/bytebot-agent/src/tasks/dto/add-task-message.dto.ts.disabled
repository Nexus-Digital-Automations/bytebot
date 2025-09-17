import { IsNotEmpty, IsString } from 'class-validator';

export class AddTaskMessageDto {
  @IsNotEmpty()
  @IsString()
  message!: string; // Definite assignment assertion for NestJS DTO validation
}
