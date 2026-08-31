import { useState, useEffect, useCallback } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'viewer';
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // 检查token有效性
  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setState(prev => ({ ...prev, isLoading: false, isAuthenticated: false }));
      return;
    }

    try {
      const API_BASE = 'http://' + window.location.hostname + ':3001';
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setState({
            user: data.user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } else {
          // Token无效，清除
          localStorage.removeItem('token');
          setState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      } else {
        // Token无效或过期
        localStorage.removeItem('token');
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: '认证检查失败',
      });
    }
  }, []);

  // 初始化时检查认证状态
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 登录
  const login = async (username: string, password: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const API_BASE = 'http://' + window.location.hostname + ':3001';
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        setState({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: data.error || '登录失败',
        }));
        return false;
      }
    } catch (error) {
      console.error('Login failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: '登录失败，请检查网络连接',
      }));
      return false;
    }
  };

  // 注册
  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const API_BASE = 'http://' + window.location.hostname + ':3001';
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        setState({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: data.error || '注册失败',
        }));
        return false;
      }
    } catch (error) {
      console.error('Registration failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: '注册失败，请检查网络连接',
      }));
      return false;
    }
  };

  // 登出
  const logout = () => {
    localStorage.removeItem('token');
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  };

  // 清除错误
  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  return {
    ...state,
    login,
    register,
    logout,
    clearError,
    checkAuth,
  };
}
