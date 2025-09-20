/**
 * Database Entity Type Definitions for Test Files
 *
 * Comprehensive TypeScript interfaces for database entities, repositories,
 * and query results to eliminate unsafe assignments and any types in test files.
 *
 * @author Claude Code
 * @version 1.0.0
 */

/**
 * Base database entity interface
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * User entity interface
 */
export interface UserEntity extends BaseEntity {
  email: string;
  passwordHash: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: Date;
}

/**
 * Task entity interface
 */
export interface TaskEntity extends BaseEntity {
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';priority: 'low' | 'medium' | 'high' | 'critical';assignedUserId?: string;metadata?: Record<string, unknown>;
}

/**
 * Session entity interface
 */
export interface SessionEntity extends BaseEntity {
  userId: string;
  token: string;
  expiresAt: Date;
  isActive: boolean;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit log entity interface
 */
export interface AuditLogEntity extends BaseEntity {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Database connection interface
 */
export interface DatabaseConnection {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction<T>(callback: (tx: DatabaseTransaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  isConnected(): boolean;
}

/**
 * Database transaction interface
 */
export interface DatabaseTransaction {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

/**
 * Repository interface for CRUD operations
 */
export interface Repository<T extends BaseEntity> {
  findById(id: string): Promise<T | null>;
  findMany(criteria: Partial<T>): Promise<T[]>;
  create(data: Omit<T, 'id' | 'createdAt'>): Promise<T>;update(id: string,
    data: Partial<Omit<T, 'id' | 'createdAt'>>,): Promise<T | null>;delete(id: string): Promise<boolean>;
  count(criteria?: Partial<T>): Promise<number>;
}

/**
 * Query result metadata
 */
export interface QueryResult<T = unknown> {
  data: T[];
  total: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
}

/**
 * Database migration interface
 */
export interface Migration {
  id: string;
  name: string;
  up(connection: DatabaseConnection): Promise<void>;
  down(connection: DatabaseConnection): Promise<void>;
}

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  poolSize?: number;
  timeout?: number;
}

/**
 * Database test utilities interface
 */
export interface DatabaseTestUtils {
  setupTestDatabase(): Promise<DatabaseConnection>;
  clearAllTables(): Promise<void>;
  seedTestData(): Promise<void>;
  teardownTestDatabase(): Promise<void>;
}

/**
 * Mock database service for testing
 */
export interface MockDatabaseService {
  users: Map<string, UserEntity>;
  tasks: Map<string, TaskEntity>;
  sessions: Map<string, SessionEntity>;
  auditLogs: Map<string, AuditLogEntity>;

  clear(): void;
  reset(): void;
  seed(): void;
}

/**
 * Database error types
 */
export interface DatabaseError extends Error {
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';query?: string;parameters?: unknown[];
  table?: string;
}

/**
 * Type-safe database query builder interface
 */
export interface QueryBuilder<T> {
  select(fields: (keyof T)[]): QueryBuilder<T>;
  where(criteria: Partial<T>): QueryBuilder<T>;
  orderBy(field: keyof T, direction: 'ASC' | 'DESC'): QueryBuilder<T>;limit(count: number): QueryBuilder<T>;offset(count: number): QueryBuilder<T>;
  execute(): Promise<T[]>;
  count(): Promise<number>;
}

/**
 * Type guards for database entities
 */
export function isUserEntity(entity: unknown): entity is UserEntity {
  return (
    typeof entity === 'object' &&entity !== null &&'email' in entity &&'passwordHash' in entity &&'role' in entity &&'isActive' in entity);}

export function isTaskEntity(entity: unknown): entity is TaskEntity {
  return (
    typeof entity === 'object' &&entity !== null &&'title' in entity &&'description' in entity &&'status' in entity &&'priority' in entity);}

export function isSessionEntity(entity: unknown): entity is SessionEntity {
  return (
    typeof entity === 'object' &&entity !== null &&'userId' in entity &&'token' in entity &&'expiresAt' in entity &&'isActive' in entity);}

/**
 * Type assertion helpers for test files
 */
export function assertUserEntity(
  entity: unknown,
): asserts entity is UserEntity {
  if (!isUserEntity(entity)) {
    throw new Error('Object is not a valid UserEntity');}}

export function assertTaskEntity(
  entity: unknown,
): asserts entity is TaskEntity {
  if (!isTaskEntity(entity)) {
    throw new Error('Object is not a valid TaskEntity');}}

export function assertSessionEntity(
  entity: unknown,
): asserts entity is SessionEntity {
  if (!isSessionEntity(entity)) {
    throw new Error('Object is not a valid SessionEntity');
  }
}
