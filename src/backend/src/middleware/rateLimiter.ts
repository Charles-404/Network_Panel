/**
 * 速率限制中间件
 * 基于 @fastify/rate-limit 实现，防止 API 滥用和暴力攻击
 */

import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { RateLimitError } from '../utils/errors.js';
import { apiLogger } from '../utils/logger.js';

/**
 * 注册速率限制中间件
 */
export async function registerRateLimiter(app: FastifyInstance): Promise<void> {
  // 速率限制配置
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX || '100');
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'); // 默认 1 分钟

  await app.register(rateLimit, {
    // 全局默认：每分钟 100 次请求
    max: maxRequests,
    timeWindow: windowMs,

    // 使用 IP 地址作为 key
    keyGenerator: (request) => {
      return request.ip || request.headers['x-forwarded-for'] as string || 'unknown';
    },

    // 自定义错误响应
    errorResponseBuilder: (_request, context) => {
      return {
        success: false,
        error: {
          code: 'ERR_1006',
          message: `Rate limit exceeded, retry in ${Math.ceil(context.after / 1000)} seconds`,
          retryAfter: Math.ceil(context.after / 1000),
        },
        timestamp: new Date().toISOString(),
      };
    },

    // 添加速率限制信息到响应头
    addHeadersOnExceeding: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },

    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },

    // 当达到限制时的回调
    onExceeding: (request) => {
      apiLogger.debug({
        ip: request.ip,
        url: request.url,
      }, 'Rate limit approaching');
    },

    onExceeded: (request) => {
      apiLogger.warn({
        ip: request.ip,
        url: request.url,
        method: request.method,
      }, 'Rate limit exceeded');
    },
  });

  apiLogger.info({
    maxRequests,
    windowMs,
  }, 'Rate limiter registered');
}

/**
 * 严格的速率限制（用于敏感端点）
 * 例如：登录、认证相关的 API
 */
export async function registerStrictRateLimiter(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    max: 10,           // 每窗口 10 次
    timeWindow: '15 min', // 15 分钟窗口

    keyGenerator: (request) => {
      return request.ip || 'unknown';
    },

    errorResponseBuilder: (_request, context) => {
      return {
        success: false,
        error: {
          code: 'ERR_1006',
          message: `Too many attempts. Try again in ${Math.ceil(context.after / 60000)} minutes.`,
          retryAfter: Math.ceil(context.after / 1000),
        },
        timestamp: new Date().toISOString(),
      };
    },
  });
}
