/**
 * 统一错误处理系统
 * 自定义错误类、错误码定义和全局错误处理中间件
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import logger from './logger.js';

// ============================================================
// 错误码定义
// ============================================================
export enum ErrorCode {
  // 通用错误 (1xxx)
  UNKNOWN_ERROR = 'ERR_1000',
  VALIDATION_ERROR = 'ERR_1001',
  NOT_FOUND = 'ERR_1002',
  UNAUTHORIZED = 'ERR_1003',
  FORBIDDEN = 'ERR_1004',
  CONFLICT = 'ERR_1005',
  RATE_LIMITED = 'ERR_1006',

  // 数据库错误 (2xxx)
  DB_CONNECTION_ERROR = 'ERR_2000',
  DB_QUERY_ERROR = 'ERR_2001',
  DB_TIMEOUT = 'ERR_2002',

  // 外部服务错误 (3xxx)
  FORTIGATE_API_ERROR = 'ERR_3000',
  FORTIGATE_AUTH_ERROR = 'ERR_3001',
  FORTIGATE_TIMEOUT = 'ERR_3002',
  SNMP_ERROR = 'ERR_3003',

  // 系统错误 (4xxx)
  INTERNAL_ERROR = 'ERR_4000',
  SERVICE_UNAVAILABLE = 'ERR_4001',
  CONFIGURATION_ERROR = 'ERR_4002',
}

// HTTP 状态码映射
const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  [ErrorCode.UNKNOWN_ERROR]: 500,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.DB_CONNECTION_ERROR]: 503,
  [ErrorCode.DB_QUERY_ERROR]: 500,
  [ErrorCode.DB_TIMEOUT]: 504,
  [ErrorCode.FORTIGATE_API_ERROR]: 502,
  [ErrorCode.FORTIGATE_AUTH_ERROR]: 502,
  [ErrorCode.FORTIGATE_TIMEOUT]: 504,
  [ErrorCode.SNMP_ERROR]: 502,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.CONFIGURATION_ERROR]: 500,
};

// ============================================================
// 自定义错误类
// ============================================================

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    statusCode?: number,
    details?: unknown,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode || ERROR_HTTP_STATUS[code] || 500;
    this.isOperational = isOperational;
    this.details = details;

    // 保留正确的堆栈跟踪
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * 参数验证错误
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details);
  }
}

/**
 * 资源未找到错误
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number) {
    const msg = identifier
      ? `${resource} '${identifier}' not found`
      : `${resource} not found`;
    super(msg, ErrorCode.NOT_FOUND, 404);
  }
}

/**
 * 认证错误
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, ErrorCode.UNAUTHORIZED, 401);
  }
}

/**
 * 授权错误
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, ErrorCode.FORBIDDEN, 403);
  }
}

/**
 * 数据库错误
 */
export class DatabaseError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.DB_QUERY_ERROR, details?: unknown) {
    super(message, code, ERROR_HTTP_STATUS[code], details, false);
  }
}

/**
 * 外部服务错误 (FortiGate, SNMP 等)
 */
export class ExternalServiceError extends AppError {
  public readonly serviceName: string;

  constructor(serviceName: string, message: string, code: ErrorCode = ErrorCode.FORTIGATE_API_ERROR, details?: unknown) {
    super(`[${serviceName}] ${message}`, code, ERROR_HTTP_STATUS[code], details);
    this.serviceName = serviceName;
  }
}

/**
 * 速率限制错误
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number = 60) {
    super(`Rate limit exceeded. Try again in ${retryAfter} seconds.`, ErrorCode.RATE_LIMITED, 429);
    this.retryAfter = retryAfter;
  }
}

// ============================================================
// 全局错误处理中间件
// ============================================================

/**
 * 注册全局错误处理
 */
export function registerErrorHandler(app: FastifyInstance): void {
  // Fastify 的 onError 钩子
  app.setErrorHandler((error: Error, request: FastifyRequest, reply: FastifyReply) => {
    // 如果是已知的 AppError
    if (error instanceof AppError) {
      const logLevel = error.statusCode >= 500 ? 'error' : 'warn';

      logger[logLevel]({
        err: error,
        req: {
          method: request.method,
          url: request.url,
          requestId: request.id,
        },
        errorCode: error.code,
        statusCode: error.statusCode,
      }, error.message);

      return reply.code(error.statusCode).send(error.toJSON());
    }

    // Fastify 自身的验证错误
    if (error.validation) {
      const validationError = new ValidationError('Request validation failed', {
        validation: error.validation,
        validationContext: error.validationContext,
      });

      logger.warn({
        req: { method: request.method, url: request.url, requestId: request.id },
        validation: error.validation,
      }, 'Validation error');

      return reply.code(400).send(validationError.toJSON());
    }

    // 未知错误
    logger.error({
      err: error,
      req: {
        method: request.method,
        url: request.url,
        requestId: request.id,
      },
    }, 'Unhandled error');

    // 生产环境不暴露内部错误细节
    const internalError = new AppError(
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message,
      ErrorCode.INTERNAL_ERROR,
      500,
      process.env.NODE_ENV !== 'production' ? { stack: error.stack } : undefined,
      false
    );

    return reply.code(500).send(internalError.toJSON());
  });

  // 未捕获的 Promise 拒绝
  process.on('unhandledRejection', (reason: unknown) => {
    logger.fatal({ err: reason instanceof Error ? reason : new Error(String(reason)) }, 'Unhandled rejection');
  });

  // 未捕获的异常
  process.on('uncaughtException', (error: Error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    // 给日志系统时间写入后退出
    setTimeout(() => process.exit(1), 1000);
  });
}

/**
 * 创建标准 API 响应
 */
export function createSuccessResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    ...(message && { message }),
    timestamp: new Date().toISOString(),
  };
}

/**
 * 快捷抛出函数
 */
export function throwNotFound(resource: string, identifier?: string | number): never {
  throw new NotFoundError(resource, identifier);
}

export function throwValidation(message: string, details?: unknown): never {
  throw new ValidationError(message, details);
}
