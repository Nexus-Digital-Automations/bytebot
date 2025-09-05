import { IsNotEmpty, IsString } from 'class-validator';

export class AddTaskMessageDto {
  @IsNotEmpty()
  @IsString()
  message!: string; // Definite assignment assertion - validated by class-validator decorators
}
