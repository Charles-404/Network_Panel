/**
 * 请求日志中间件
 * 记录所有 API 请求，包括请求方法、URL、响应时间、状态码等
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { apiLogger } from '../utils/logger.js';

// 不记录日志的路径（健康检查等忽略路径）
const IGNORED_PATHS = new Set([
  '/api/health',
  '/favicon.ico',
]);

/**
 * 注册请求日志中间件
 */
export async function registerRequestLogger(app: FastifyInstance): Promise<void> {
  // 请求开始时间追踪
  app.addHook('onRequest', async (request: FastifyRequest) => {
    // 为每个请求附加开始时间
    (request as any).__startTime = process.hrtime.bigint();
    (request as any).__requestId = request.id;
  });

  // 响应完成时记录日志
  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const path = request.url.split('?')[0];

    // 跳过忽略的路径
    if (IGNORED_PATHS.has(path)) {
      return;
    }

    const startTime = (request as any).__startTime as bigint;
    const responseTime = startTime
      ? Number(process.hrtime.bigint() - startTime) / 1e6 // 转换为毫秒
      : 0;

    const logData = {
      requestId: request.id,
      method: request.method,
      url: request.url,
      path,
      statusCode: reply.statusCode,
      responseTime: `${responseTime.toFixed(2)}ms`,
      userAgent: request.headers['user-agent'] || '-',
      ip: request.ip || request.headers['x-forwarded-for'] || '-',
      contentLength: reply.getHeader('content-length') || '-',
    };

    // 根据状态码选择日志级别
    if (reply.statusCode >= 500) {
      apiLogger.error(logData, `${request.method} ${path} ${reply.statusCode}`);
    } else if (reply.statusCode >= 400) {
      apiLogger.warn(logData, `${request.method} ${path} ${reply.statusCode}`);
    } else if (reply.statusCode >= 300) {
      apiLogger.info(logData, `${request.method} ${path} ${reply.statusCode}`);
    } else {
      apiLogger.info(logData, `${request.method} ${path} ${reply.statusCode}`);
    }
  });

  // 请求出错时记录
  app.addHook('onError', async (request: FastifyRequest, _reply: FastifyReply, error: Error) => {
    apiLogger.error({
      requestId: request.id,
      method: request.method,
      url: request.url,
      err: error,
    }, `Request error: ${error.message}`);
  });

  apiLogger.info('Request logger registered');
}

/**
 * 性能监控钩子
 * 当响应时间超过阈值时发出警告
 */
export async function registerPerformanceMonitor(
  app: FastifyInstance,
  thresholdMs: number = 1000
): Promise<void> {
  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = (request as any).__startTime as bigint;
    if (!startTime) return;

    const responseTime = Number(process.hrtime.bigint() - startTime) / 1e6;

    if (responseTime > thresholdMs) {
      apiLogger.warn({
        requestId: request.id,
        method: request.method,
        url: request.url,
        responseTime: `${responseTime.toFixed(2)}ms`,
        threshold: `${thresholdMs}ms`,
      }, 'Slow request detected');
    }
  });
}
