import { useState } from 'react';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { Dashboard } from './components/layout/Dashboard';

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuthContext();

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
