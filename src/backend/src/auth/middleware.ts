import type { FastifyRequest, FastifyReply } from 'fastify';
import { userService, type User } from './userService.js';

// 扩展FastifyRequest类型以包含用户信息
declare module 'fastify' {
  interface FastifyRequest {
    user?: Omit<User, 'password_hash'>;
  }
}

/**
 * JWT验证中间件
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    // 从Authorization头获取token
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ 
        success: false, 
        error: '未提供认证令牌' 
      });
    }

    const token = authHeader.substring(7); // 移除 'Bearer ' 前缀

    // 验证token
    const result = await userService.verifyToken(token);
    if (!result.valid || !result.user) {
      return reply.code(401).send({ 
        success: false, 
        error: result.error || '无效的认证令牌' 
      });
    }

    // 将用户信息附加到请求对象
    request.user = result.user;
  } catch (error: any) {
    console.error('Authentication error:', error);
    return reply.code(500).send({ 
      success: false, 
      error: '认证过程中发生错误' 
    });
  }
}

/**
 * 角色权限检查中间件
 */
export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // 先验证用户是否已认证
    if (!request.user) {
      return reply.code(401).send({ 
        success: false, 
        error: '用户未认证' 
      });
    }

    // 检查用户角色
    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({ 
        success: false, 
        error: '权限不足，需要以下角色之一：' + roles.join(', ') 
      });
    }
  };
}

/**
 * 管理员权限中间件
 */
export const requireAdmin = requireRole('admin');

/**
 * 路由保护装饰器（用于Fastify插件）
 */
export function protectedRoute(options: { roles?: string[] } = {}) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // 验证用户是否已认证
    await authenticate(request, reply);
    
    // 如果认证失败，reply.code()已经发送了响应
    if (reply.sent) return;

    // 如果指定了角色，检查权限
    if (options.roles && options.roles.length > 0) {
      await requireRole(...options.roles)(request, reply);
    }
  };
}

/**
 * 可选认证中间件（不强制要求认证，但如果提供了token则验证）
 */
export async function optionalAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const result = await userService.verifyToken(token);
      if (result.valid && result.user) {
        request.user = result.user;
      }
    }
  } catch (error) {
    // 忽略认证错误，继续处理请求
    console.warn('Optional auth failed:', error);
  }
}
