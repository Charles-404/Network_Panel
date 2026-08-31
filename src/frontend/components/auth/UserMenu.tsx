import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { User, LogOut, Settings, ChevronDown, Shield } from 'lucide-react';

export function UserMenu({ className }: { className?: string }) {
  const { user, logout, isAuthenticated } = useAuthContext();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated || !user) {
    return null;
  }

  const getRoleBadge = () => {
    if (user.role === 'admin') {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-noc-purple/20 text-noc-purple rounded">
          Admin
        </span>
      );
    }
    return null;
  };

  return (
    <div className={cn('relative', className)} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-noc-bg rounded-sm hover:bg-noc-border/50 transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-noc-purple/20 flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-noc-purple" />
        </div>
        <span className="text-xs text-noc-text">{user.username}</span>
        {getRoleBadge()}
        <ChevronDown className={cn('w-3 h-3 text-noc-text-muted transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-noc-card border border-noc-border rounded-sm shadow-lg z-50">
          <div className="px-3 py-2 border-b border-noc-border">
            <p className="text-xs text-noc-text-muted">登录为</p>
            <p className="text-sm text-noc-text font-medium">{user.username}</p>
            <p className="text-xs text-noc-text-muted">{user.email}</p>
          </div>
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: 打开设置页面
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-noc-text hover:bg-noc-bg transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              个人设置
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-noc-red hover:bg-noc-bg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
