import { IsNumber, Min, Max } from 'class-validator';
import { IsValidScreenCoordinates } from '@bytebot/shared/decorators/security-validation.decorators';

/**
 * Data Transfer Object for screen coordinates with enhanced security validation
 * Properties are initialized by NestJS validation pipeline with advanced coordinate validation
 */
export class CoordinatesDto {
  @IsNumber({}, { message: 'X coordinate must be a valid number' })
  @Min(0, { message: 'X coordinate cannot be negative' })
  @Max(65535, { message: 'X coordinate exceeds maximum allowed value' })
  x!: number;

  @IsNumber({}, { message: 'Y coordinate must be a valid number' })
  @Min(0, { message: 'Y coordinate cannot be negative' })
  @Max(65535, { message: 'Y coordinate exceeds maximum allowed value' })
  y!: number;

  /**
   * Validate the entire coordinate object for security issues
   * This decorator checks both coordinates together for bounds and overflow attacks
   */
  @IsValidScreenCoordinates(undefined, {
    message: 'Coordinates contain invalid or potentially unsafe values',
  })
  validateCoordinates() {
    return { x: this.x, y: this.y };
  }
}

// Enum values are used by external validation and DTO classes
/**
 * Mouse button types with security validation
 * Restricts to safe, standard mouse button values
 */
export enum ButtonType {
  LEFT = 'left',
  RIGHT = 'right',
  MIDDLE = 'middle',
}

/**
 * Key/Mouse press types with security validation
 * Restricts to safe press action values
 */
export enum PressType {
  UP = 'up',
  DOWN = 'down',
}

/**
 * Scroll direction types with security validation
 * Restricts to safe directional values
 */
export enum ScrollDirection {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
}

/**
 * Allowed application names with security validation
 * Whitelist of approved applications for computer-use operations
 * Prevents arbitrary application launching for security
 */
export enum ApplicationName {
  FIREFOX = 'firefox',
  ONEPASSWORD = '1password',
  THUNDERBIRD = 'thunderbird',
  VSCODE = 'vscode',
  TERMINAL = 'terminal',
  DESKTOP = 'desktop',
  DIRECTORY = 'directory',
}
