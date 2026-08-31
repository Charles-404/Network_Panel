import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Shield, Eye, EyeOff } from 'lucide-react';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const { register, error, isLoading, clearError } = useAuthContext();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const validateForm = () => {
    if (username.length < 3 || username.length > 50) {
      setValidationError('用户名长度必须在3-50个字符之间');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError('邮箱格式不正确');
      return false;
    }

    if (password.length < 6) {
      setValidationError('密码长度至少6个字符');
      return false;
    }

    if (password !== confirmPassword) {
      setValidationError('两次输入的密码不一致');
      return false;
    }

    setValidationError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError('');

    if (!validateForm()) {
      return;
    }

    await register(username, email, password);
  };

  return (
    <div className="min-h-screen bg-noc-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-noc-card rounded-lg shadow-lg border border-noc-border p-8">
          {/* 头部 */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Shield className="w-12 h-12 text-noc-purple" />
            </div>
            <h1 className="text-2xl font-bold text-noc-text">创建账号</h1>
            <p className="text-noc-text-muted mt-2">注册新的监控面板账号</p>
          </div>

          {/* 错误提示 */}
          {(error || validationError) && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error || validationError}</p>
            </div>
          )}

          {/* 注册表单 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-noc-text mb-2">
                用户名
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-lg text-noc-text placeholder-noc-text-muted focus:outline-none focus:ring-2 focus:ring-noc-purple focus:border-transparent"
                placeholder="请输入用户名"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-noc-text mb-2">
                邮箱
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-lg text-noc-text placeholder-noc-text-muted focus:outline-none focus:ring-2 focus:ring-noc-purple focus:border-transparent"
                placeholder="请输入邮箱地址"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-noc-text mb-2">
                密码
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-lg text-noc-text placeholder-noc-text-muted focus:outline-none focus:ring-2 focus:ring-noc-purple focus:border-transparent pr-12"
                  placeholder="请输入密码"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-noc-text-muted hover:text-noc-text"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-noc-text mb-2">
                确认密码
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-lg text-noc-text placeholder-noc-text-muted focus:outline-none focus:ring-2 focus:ring-noc-purple focus:border-transparent pr-12"
                  placeholder="请再次输入密码"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-noc-text-muted hover:text-noc-text"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-noc-purple hover:bg-noc-purple/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-noc-purple disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  注册中...
                </div>
              ) : (
                '注册'
              )}
            </button>
          </form>

          {/* 登录链接 */}
          <div className="mt-6 text-center">
            <p className="text-noc-text-muted text-sm">
              已有账号？{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-noc-purple hover:text-noc-purple/80 font-medium"
              >
                立即登录
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
