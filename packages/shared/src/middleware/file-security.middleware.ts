/**
 * File Security Middleware - Advanced File Upload Protection
 *
 * This middleware provides comprehensive file upload security including
 * malware scanning, content validation, and threat detection for all
 * file upload endpoints in the Bytebot platform.
 *
 * @fileoverview Enterprise file upload security middleware
 * @version 1.0.0
 * @author File Security Specialist
 */

import {
  Injectable,
  NestMiddleware,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import {
  scanFileContent,
  createSecurityEvent,
  SecurityEventType,
} from "../utils/security.utils";
import multer from "multer";
import { promisify } from "util";

/**
 * File security configuration
 */
interface FileSecurityConfig {
  /** Maximum file size in bytes */
  maxFileSize: number;

  /** Maximum number of files per request */
  maxFiles: number;

  /** Allowed MIME types */
  allowedMimeTypes: string[];

  /** Blocked file extensions */
  blockedExtensions: string[];

  /** Enable malware scanning */
  enableMalwareScanning: boolean;

  /** Enable content analysis */
  enableContentAnalysis: boolean;

  /** Maximum risk score threshold */
  maxRiskScore: number;

  /** Quarantine suspicious files */
  quarantineFiles: boolean;
}

/**
 * Default file security configuration
 */
const DEFAULT_FILE_CONFIG: FileSecurityConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  allowedMimeTypes: [
    "text/plain",
    "text/csv",
    "application/json",
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "application/zip",
  ],
  blockedExtensions: [
    ".exe",
    ".bat",
    ".cmd",
    ".com",
    ".scr",
    ".pif",
    ".vbs",
    ".js",
    ".jar",
    ".class",
    ".php",
    ".asp",
    ".aspx",
    ".jsp",
    ".sh",
    ".ps1",
    ".py",
    ".rb",
    ".pl",
  ],
  enableMalwareScanning: true,
  enableContentAnalysis: true,
  maxRiskScore: 7,
  quarantineFiles: true,
};

/**
 * File upload security result
 */
interface FileSecurityResult {
  safe: boolean;
  threats: string[];
  riskScore: number;
  quarantined: boolean;
  recommendations: string[];
}

@Injectable()
export class FileSecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(FileSecurityMiddleware.name);
  private readonly config: FileSecurityConfig;

  constructor(config?: Partial<FileSecurityConfig>) {
    this.config = { ...DEFAULT_FILE_CONFIG, ...config };

    this.logger.log("File Security Middleware initialized", {
      maxFileSize: this.config.maxFileSize,
      maxFiles: this.config.maxFiles,
      allowedMimeTypes: this.config.allowedMimeTypes.length,
      enableMalwareScanning: this.config.enableMalwareScanning,
      enableContentAnalysis: this.config.enableContentAnalysis,
      maxRiskScore: this.config.maxRiskScore,
    });
  }

  /**
   * Express middleware function
   */
  use(req: Request, res: Response, next: NextFunction): void {
    const operationId = `file-security-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] File security middleware activated`, {
      operationId,
      method: req.method,
      path: req.path,
      contentType: req.get("Content-Type"),
    });

    // Skip if no file upload
    if (!req.is("multipart/form-data")) {
      return next();
    }

    // Setup multer with security configuration
    const upload = multer({
      limits: {
        fileSize: this.config.maxFileSize,
        files: this.config.maxFiles,
      },
      fileFilter: (req, file, cb) => {
        this.validateFile(file, operationId)
          .then((result) => {
            if (result.safe) {
              cb(null, true);
            } else {
              cb(
                new BadRequestException({
                  message: "File security validation failed",
                  threats: result.threats,
                  riskScore: result.riskScore,
                  operationId,
                }),
              );
            }
          })
          .catch((error) => {
            this.logger.error(`[${operationId}] File validation error`, {
              operationId,
              error: error.message,
              fileName: file.originalname,
            });
            cb(error);
          });
      },
    }).any();

    // Promisify multer upload
    const uploadAsync = promisify(upload);

    uploadAsync(req, res)
      .then(async () => {
        // Perform additional security checks on uploaded files
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
          await this.performPostUploadSecurity(req.files, operationId);
        }

        const processingTime = Date.now() - startTime;

        this.logger.debug(
          `[${operationId}] File security validation completed`,
          {
            operationId,
            filesProcessed: req.files ? req.files.length : 0,
            processingTimeMs: processingTime,
          },
        );

        next();
      })
      .catch((error) => {
        const processingTime = Date.now() - startTime;

        this.logger.error(`[${operationId}] File security validation failed`, {
          operationId,
          error: error.message,
          processingTimeMs: processingTime,
        });

        // Log security event
        this.logSecurityEvent(
          req,
          "FILE_UPLOAD_BLOCKED",
          error.message,
          operationId,
        );

        next(error);
      });
  }

  /**
   * Validate individual file for security threats
   */
  private async validateFile(
    file: Express.Multer.File,
    operationId: string,
  ): Promise<FileSecurityResult> {
    const threats: string[] = [];
    let riskScore = 0;

    this.logger.debug(`[${operationId}] Validating file`, {
      operationId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });

    // Check file extension
    const fileExt = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf("."));
    if (this.config.blockedExtensions.includes(fileExt)) {
      threats.push(`Blocked file extension: ${fileExt}`);
      riskScore += 9;
    }

    // Check MIME type
    if (!this.config.allowedMimeTypes.includes(file.mimetype)) {
      threats.push(`Disallowed MIME type: ${file.mimetype}`);
      riskScore += 6;
    }

    // MIME type spoofing detection
    if (this.detectMimeTypeSpoofing(file.originalname, file.mimetype)) {
      threats.push("MIME type spoofing detected");
      riskScore += 8;
    }

    // File size validation
    if (file.size > this.config.maxFileSize) {
      threats.push(`File too large: ${file.size} bytes`);
      riskScore += 5;
    }

    // Content-based analysis if enabled
    if (this.config.enableContentAnalysis && file.buffer) {
      const contentScan = scanFileContent(
        file.buffer,
        file.originalname,
        file.mimetype,
      );

      if (!contentScan.isSafe) {
        threats.push(...contentScan.threats);
        riskScore += contentScan.riskScore;
      }
    }

    const safe = riskScore <= this.config.maxRiskScore;
    const quarantined = !safe && this.config.quarantineFiles;

    if (!safe) {
      this.logger.warn(`[${operationId}] File security threats detected`, {
        operationId,
        fileName: file.originalname,
        threats,
        riskScore,
        quarantined,
      });
    }

    return {
      safe,
      threats,
      riskScore,
      quarantined,
      recommendations: this.generateRecommendations(threats, riskScore),
    };
  }

  /**
   * Perform post-upload security analysis
   */
  private async performPostUploadSecurity(
    files: Express.Multer.File[],
    operationId: string,
  ): Promise<void> {
    this.logger.debug(
      `[${operationId}] Performing post-upload security analysis`,
      {
        operationId,
        fileCount: files.length,
      },
    );

    for (const file of files) {
      if (this.config.enableMalwareScanning && file.buffer) {
        // Advanced malware pattern detection
        await this.performMalwareScan(file, operationId);
      }

      // Check for embedded threats in seemingly safe files
      if (file.buffer) {
        await this.scanEmbeddedThreats(file, operationId);
      }
    }
  }

  /**
   * Perform malware scanning on file content
   */
  private async performMalwareScan(
    file: Express.Multer.File,
    operationId: string,
  ): Promise<void> {
    const malwarePatterns = [
      // PE executable signatures
      /^MZ/,
      /^\x7fELF/,

      // Script patterns in binary files
      /<script[^>]*>/gi,
      /eval\s*\(/gi,
      /document\.cookie/gi,

      // Command injection patterns
      /cmd\.exe|powershell|/gi,
      /wget|curl|nc\s/gi,

      // Suspicious encoding patterns
      /base64_decode/gi,
      /\x00+/g, // Null bytes
    ];

    const content = file.buffer.toString(
      "utf8",
      0,
      Math.min(file.buffer.length, 1024),
    );

    for (const pattern of malwarePatterns) {
      if (pattern.test(content)) {
        this.logger.error(`[${operationId}] Malware pattern detected in file`, {
          operationId,
          fileName: file.originalname,
          pattern: pattern.source,
          contentPreview: content.substring(0, 100),
        });

        throw new BadRequestException({
          message: "Malware detected in uploaded file",
          fileName: file.originalname,
          threat: "Malware Pattern",
          operationId,
        });
      }
    }
  }

  /**
   * Scan for embedded threats in files
   */
  private async scanEmbeddedThreats(
    file: Express.Multer.File,
    operationId: string,
  ): Promise<void> {
    // Check for polyglot files (files that are valid in multiple formats)
    const content = file.buffer.toString("binary");

    // Look for embedded HTML/JS in image files
    if (file.mimetype.startsWith("image/")) {
      const htmlPatterns = [
        /<html[^>]*>/gi,
        /<script[^>]*>/gi,
        /javascript:/gi,
      ];

      for (const pattern of htmlPatterns) {
        if (pattern.test(content)) {
          this.logger.warn(
            `[${operationId}] Embedded code detected in image file`,
            {
              operationId,
              fileName: file.originalname,
              mimeType: file.mimetype,
            },
          );

          throw new BadRequestException({
            message: "Embedded code detected in image file",
            fileName: file.originalname,
            threat: "Polyglot File",
            operationId,
          });
        }
      }
    }

    // Check for ZIP bombs
    if (file.mimetype === "application/zip") {
      const compressionRatio = file.buffer.length / file.size;
      if (compressionRatio < 0.1) {
        // Highly compressed
        this.logger.warn(`[${operationId}] Potential ZIP bomb detected`, {
          operationId,
          fileName: file.originalname,
          compressionRatio,
        });

        throw new BadRequestException({
          message: "Potential ZIP bomb detected",
          fileName: file.originalname,
          threat: "ZIP Bomb",
          operationId,
        });
      }
    }
  }

  /**
   * Detect MIME type spoofing
   */
  private detectMimeTypeSpoofing(fileName: string, mimeType: string): boolean {
    const extensionMimeMap: Record<string, string[]> = {
      ".jpg": ["image/jpeg"],
      ".jpeg": ["image/jpeg"],
      ".png": ["image/png"],
      ".gif": ["image/gif"],
      ".pdf": ["application/pdf"],
      ".txt": ["text/plain"],
      ".json": ["application/json"],
      ".csv": ["text/csv"],
      ".zip": ["application/zip"],
    };

    const fileExt = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
    const expectedMimeTypes = extensionMimeMap[fileExt];

    if (expectedMimeTypes && !expectedMimeTypes.includes(mimeType)) {
      return true;
    }

    return false;
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(
    threats: string[],
    riskScore: number,
  ): string[] {
    const recommendations: string[] = [];

    if (threats.length === 0) {
      recommendations.push("✅ File passed all security checks");
      return recommendations;
    }

    if (threats.some((t) => t.includes("extension"))) {
      recommendations.push("❌ Change file extension to allowed type");
    }

    if (threats.some((t) => t.includes("MIME"))) {
      recommendations.push("⚠️ Verify file format matches content");
    }

    if (threats.some((t) => t.includes("Malware"))) {
      recommendations.push("🚨 Scan file with antivirus software");
    }

    if (riskScore >= 8) {
      recommendations.push("🔥 High-risk file - manual review required");
    }

    recommendations.push("🛡️ Consider using file sandboxing");

    return recommendations;
  }

  /**
   * Log security events
   */
  private logSecurityEvent(
    request: Request,
    eventType: string,
    message: string,
    operationId: string,
  ): void {
    try {
      const securityEvent = createSecurityEvent(
        SecurityEventType.VALIDATION_FAILED,
        request.path,
        request.method,
        false,
        message,
        {
          operationId,
          middleware: "file-security-middleware",
          eventType,
          userAgent: request.get("User-Agent"),
          contentType: request.get("Content-Type"),
        },
        (request as any).user?.id,
        request.ip,
        request.get("User-Agent"),
      );

      this.logger.warn(`File security event: ${securityEvent.eventId}`, {
        eventId: securityEvent.eventId,
        eventType: securityEvent.type,
        riskScore: securityEvent.riskScore,
        operationId,
      });
    } catch (error) {
      this.logger.error("Failed to log file security event", {
        operationId,
        error: error.message,
        originalEventType: eventType,
      });
    }
  }
}

export default FileSecurityMiddleware;
