import type { FastifyInstance } from 'fastify';
import { userService, type CreateUserDTO, type LoginDTO } from './userService.js';
import { authenticate, requireAdmin, optionalAuth } from './middleware.js';

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  // ============================================================
  // 用户注册
  // ============================================================
  app.post('/api/auth/register', async (request, reply) => {
    // 检查是否允许注册
    if (!userService.isRegistrationAllowed()) {
      return reply.code(403).send({ 
        success: false, 
        error: '注册功能已关闭' 
      });
    }

    const body = request.body as CreateUserDTO;
    
    // 基本验证
    if (!body.username || !body.email || !body.password) {
      return reply.code(400).send({ 
        success: false, 
        error: '用户名、邮箱和密码都是必填项' 
      });
    }

    if (body.username.length < 3 || body.username.length > 50) {
      return reply.code(400).send({ 
        success: false, 
        error: '用户名长度必须在3-50个字符之间' 
      });
    }

    if (body.password.length < 6) {
      return reply.code(400).send({ 
        success: false, 
        error: '密码长度至少6个字符' 
      });
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return reply.code(400).send({ 
        success: false, 
        error: '邮箱格式不正确' 
      });
    }

    const result = await userService.register(body);
    
    if (!result.success) {
      return reply.code(400).send(result);
    }

    return reply.code(201).send(result);
  });

  // ============================================================
  // 用户登录
  // ============================================================
  app.post('/api/auth/login', async (request, reply) => {
    const body = request.body as LoginDTO;
    
    if (!body.username || !body.password) {
      return reply.code(400).send({ 
        success: false, 
        error: '用户名和密码都是必填项' 
      });
    }

    const result = await userService.login(body);
    
    if (!result.success) {
      return reply.code(401).send(result);
    }

    return result;
  });

  // ============================================================
  // 用户登出（客户端处理，服务端可选实现token黑名单）
  // ============================================================
  app.post('/api/auth/logout', { preHandler: [authenticate] }, async () => {
    // 在实际应用中，可以将token加入黑名单
    // 这里简单返回成功，客户端负责清除本地存储的token
    return { success: true, message: '已成功登出' };
  });

  // ============================================================
  // 获取当前用户信息
  // ============================================================
  app.get('/api/auth/me', { preHandler: [authenticate] }, async (request) => {
    return { 
      success: true, 
      user: request.user 
    };
  });

  // ============================================================
  // 修改密码
  // ============================================================
  app.put('/api/auth/password', { preHandler: [authenticate] }, async (request, reply) => {
    const body = request.body as { currentPassword: string; newPassword: string };
    
    if (!body.currentPassword || !body.newPassword) {
      return reply.code(400).send({ 
        success: false, 
        error: '当前密码和新密码都是必填项' 
      });
    }

    if (body.newPassword.length < 6) {
      return reply.code(400).send({ 
        success: false, 
        error: '新密码长度至少6个字符' 
      });
    }

    const result = await userService.changePassword(
      request.user!.id, 
      body.currentPassword, 
      body.newPassword
    );
    
    if (!result.success) {
      return reply.code(400).send(result);
    }

    return { success: true, message: '密码修改成功' };
  });

  // ============================================================
  // 获取用户列表（仅管理员）
  // ============================================================
  app.get('/api/auth/users', { preHandler: [requireAdmin] }, async () => {
    const users = await userService.getUsers();
    return { 
      success: true, 
      data: users 
    };
  });

  // ============================================================
  // 删除用户（仅管理员）
  // ============================================================
  app.delete('/api/auth/users/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return reply.code(400).send({ 
        success: false, 
        error: '无效的用户ID' 
      });
    }

    // 不允许删除自己
    if (request.user && request.user.id === userId) {
      return reply.code(400).send({ 
        success: false, 
        error: '不能删除当前登录的用户' 
      });
    }

    const result = await userService.deleteUser(userId);
    
    if (!result.success) {
      return reply.code(400).send(result);
    }

    return { success: true, message: '用户已删除' };
  });

  // ============================================================
  // 更新用户信息（仅管理员）
  // ============================================================
  app.put('/api/auth/users/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return reply.code(400).send({ 
        success: false, 
        error: '无效的用户ID' 
      });
    }

    const body = request.body as { username?: string; email?: string; role?: 'admin' | 'viewer' };
    
    const result = await userService.updateUser(userId, body);
    
    if (!result.success) {
      return reply.code(400).send(result);
    }

    return { success: true, user: result.user };
  });

  // ============================================================
  // 检查注册状态
  // ============================================================
  app.get('/api/auth/registration-status', async () => {
    return { 
      success: true, 
      allowed: userService.isRegistrationAllowed() 
    };
  });
}
