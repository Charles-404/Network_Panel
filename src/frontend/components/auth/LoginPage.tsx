import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Shield, Eye, EyeOff } from 'lucide-react';

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const { login, error, isLoading, clearError } = useAuthContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    const success = await login(username, password);
    if (success && rememberMe) {
      // 记住我功能：在实际应用中，可以设置更长的token过期时间
      // 这里我们已经在useAuth中设置了token存储
    }
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
            <h1 className="text-2xl font-bold text-noc-text">FortiGate 网络监控面板</h1>
            <p className="text-noc-text-muted mt-2">请登录以继续</p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* 登录表单 */}
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
                  autoComplete="current-password"
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

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-noc-purple focus:ring-noc-purple border-noc-border rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-noc-text-muted">
                  记住我
                </label>
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
                  登录中...
                </div>
              ) : (
                '登录'
              )}
            </button>
          </form>

          {/* 注册链接 */}
          <div className="mt-6 text-center">
            <p className="text-noc-text-muted text-sm">
              还没有账号？{' '}
              <button
                onClick={onSwitchToRegister}
                className="text-noc-purple hover:text-noc-purple/80 font-medium"
              >
                立即注册
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
