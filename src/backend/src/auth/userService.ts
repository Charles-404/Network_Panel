import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, getOne, getAll } from '../database/index.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const SALT_ROUNDS = 10;

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'viewer';
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'viewer';
}

export interface UpdateUserDTO {
  username?: string;
  email?: string;
  role?: 'admin' | 'viewer';
}

export interface LoginDTO {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: Omit<User, 'password_hash'>;
  error?: string;
}

export class UserService {
  /**
   * 用户注册
   */
  async register(data: CreateUserDTO): Promise<AuthResponse> {
    try {
      // 检查用户名是否已存在
      const existingUsername = await getOne(
        'SELECT id FROM users WHERE username = $1',
        [data.username]
      );
      if (existingUsername) {
        return { success: false, error: '用户名已存在' };
      }

      // 检查邮箱是否已存在
      const existingEmail = await getOne(
        'SELECT id FROM users WHERE email = $1',
        [data.email]
      );
      if (existingEmail) {
        return { success: false, error: '邮箱已被注册' };
      }

      // 加密密码
      const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

      // 插入用户
      const result = await getOne(
        `INSERT INTO users (username, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, email, role, created_at, updated_at`,
        [data.username, data.email, passwordHash, data.role || 'viewer']
      );

      const user = result as User;

      // 生成JWT
      const token = this.generateToken(user);

      return {
        success: true,
        token,
        user: this.sanitizeUser(user)
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { success: false, error: '注册失败：' + error.message };
    }
  }

  /**
   * 用户登录
   */
  async login(data: LoginDTO): Promise<AuthResponse> {
    try {
      // 查找用户
      const user = await getOne(
        'SELECT * FROM users WHERE username = $1',
        [data.username]
      ) as User | undefined;

      if (!user) {
        return { success: false, error: '用户名或密码错误' };
      }

      // 验证密码
      const validPassword = await bcrypt.compare(data.password, user.password_hash);
      if (!validPassword) {
        return { success: false, error: '用户名或密码错误' };
      }

      // 生成JWT
      const token = this.generateToken(user);

      return {
        success: true,
        token,
        user: this.sanitizeUser(user)
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: '登录失败：' + error.message };
    }
  }

  /**
   * 验证Token
   */
  async verifyToken(token: string): Promise<{ valid: boolean; user?: Omit<User, 'password_hash'>; error?: string }> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string; role: string };
      
      // 从数据库获取最新用户信息
      const user = await getOne(
        'SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = $1',
        [decoded.userId]
      ) as User | undefined;

      if (!user) {
        return { valid: false, error: '用户不存在' };
      }

      return { valid: true, user: this.sanitizeUser(user) };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return { valid: false, error: 'Token已过期' };
      }
      if (error.name === 'JsonWebTokenError') {
        return { valid: false, error: '无效的Token' };
      }
      return { valid: false, error: 'Token验证失败' };
    }
  }

  /**
   * 生成JWT Token
   */
  private generateToken(user: User): string {
    return jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  /**
   * 移除密码哈希
   */
  private sanitizeUser(user: User): Omit<User, 'password_hash'> {
    const { password_hash, ...sanitized } = user;
    return sanitized;
  }

  /**
   * 修改密码
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await getOne(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      ) as { password_hash: string } | undefined;

      if (!user) {
        return { success: false, error: '用户不存在' };
      }

      // 验证当前密码
      const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!validPassword) {
        return { success: false, error: '当前密码错误' };
      }

      // 加密新密码
      const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // 更新密码
      await query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, userId]
      );

      return { success: true };
    } catch (error: any) {
      console.error('Change password error:', error);
      return { success: false, error: '修改密码失败：' + error.message };
    }
  }

  /**
   * 获取用户列表（管理员）
   */
  async getUsers(): Promise<Omit<User, 'password_hash'>[]> {
    try {
      const users = await getAll(
        'SELECT id, username, email, role, created_at, updated_at FROM users ORDER BY created_at DESC'
      );
      return users as Omit<User, 'password_hash'>[];
    } catch (error: any) {
      console.error('Get users error:', error);
      return [];
    }
  }

  /**
   * 获取单个用户
   */
  async getUserById(userId: number): Promise<Omit<User, 'password_hash'> | null> {
    try {
      const user = await getOne(
        'SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = $1',
        [userId]
      );
      return user ? this.sanitizeUser(user as User) : null;
    } catch (error: any) {
      console.error('Get user error:', error);
      return null;
    }
  }

  /**
   * 更新用户信息（管理员）
   */
  async updateUser(userId: number, data: UpdateUserDTO): Promise<{ success: boolean; user?: Omit<User, 'password_hash'>; error?: string }> {
    try {
      // 检查用户名是否已存在（排除当前用户）
      if (data.username) {
        const existingUsername = await getOne(
          'SELECT id FROM users WHERE username = $1 AND id != $2',
          [data.username, userId]
        );
        if (existingUsername) {
          return { success: false, error: '用户名已存在' };
        }
      }

      // 检查邮箱是否已存在（排除当前用户）
      if (data.email) {
        const existingEmail = await getOne(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [data.email, userId]
        );
        if (existingEmail) {
          return { success: false, error: '邮箱已被注册' };
        }
      }

      // 构建更新查询
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.username) {
        updates.push(`username = $${paramIndex++}`);
        values.push(data.username);
      }
      if (data.email) {
        updates.push(`email = $${paramIndex++}`);
        values.push(data.email);
      }
      if (data.role) {
        updates.push(`role = $${paramIndex++}`);
        values.push(data.role);
      }

      if (updates.length === 0) {
        return { success: false, error: '没有需要更新的字段' };
      }

      updates.push(`updated_at = NOW()`);
      values.push(userId);

      const result = await getOne(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}
         RETURNING id, username, email, role, created_at, updated_at`,
        values
      );

      return { success: true, user: result as Omit<User, 'password_hash'> };
    } catch (error: any) {
      console.error('Update user error:', error);
      return { success: false, error: '更新用户失败：' + error.message };
    }
  }

  /**
   * 删除用户（管理员）
   */
  async deleteUser(userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      // 检查用户是否存在
      const user = await getOne(
        'SELECT id FROM users WHERE id = $1',
        [userId]
      );
      if (!user) {
        return { success: false, error: '用户不存在' };
      }

      // 删除用户
      await query('DELETE FROM users WHERE id = $1', [userId]);

      return { success: true };
    } catch (error: any) {
      console.error('Delete user error:', error);
      return { success: false, error: '删除用户失败：' + error.message };
    }
  }

  /**
   * 检查是否允许注册
   */
  isRegistrationAllowed(): boolean {
    return process.env.ALLOW_REGISTRATION !== 'false';
  }
}

// 导出单例
export const userService = new UserService();
