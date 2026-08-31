import { useState } from 'react';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { Dashboard } from './components/layout/Dashboard';

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuthContext();

  // 临时跳过登录，直接显示 Dashboard
  return (
    <div className="min-h-screen bg-noc-bg">
      <Dashboard />
    </div>
  );

  // 以下是原始认证逻辑（暂时禁用）
  /*
  if (isLoading) {
    return (
      <div className="min-h-screen bg-noc-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-noc-purple"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPages />;
  }

  return (
    <div className="min-h-screen bg-noc-bg">
      <Dashboard />
    </div>
  );
  */
}

function AuthPages() {
  const [isLogin, setIsLogin] = useState(true);

  if (isLogin) {
    return <LoginPage onSwitchToRegister={() => setIsLogin(false)} />;
  }

  return <RegisterPage onSwitchToLogin={() => setIsLogin(true)} />;
}

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
