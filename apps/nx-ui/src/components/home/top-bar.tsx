'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, User, ChevronDown, Settings, LogOut, UserCircle, Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export type HomeTopBarProps = {
  displayName: string;
  roleLabel?: string;
  onLogout: () => void;
  onOpenDashboard: () => void;
};

export function HomeTopBar({
  displayName,
  roleLabel = '使用者',
  onLogout,
  onOpenDashboard,
}: HomeTopBarProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [themeMode, setThemeMode] = useState<'dark' | 'light' | 'system'>('system');

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const saved = localStorage.getItem('nx-ui-theme-mode');
    const mode: 'dark' | 'light' | 'system' =
      saved === 'dark' || saved === 'light' || saved === 'system' ? saved : 'system';

    const apply = (m: 'dark' | 'light' | 'system') => {
      if (m === 'light') {
        root.classList.add('light');
        return;
      }
      if (m === 'dark') {
        root.classList.remove('light');
        return;
      }
      root.classList.toggle('light', media.matches);
    };

    setThemeMode(mode);
    apply(mode);
  }, []);

  useEffect(() => {
    if (themeMode !== 'system') return;
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      root.classList.toggle('light', media.matches);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [themeMode]);

  const toggleThemeMode = () => {
    const cycle: Array<'system' | 'dark' | 'light'> = ['system', 'dark', 'light'];
    const idx = cycle.indexOf(themeMode);
    const next = cycle[(idx + 1) % cycle.length];
    setThemeMode(next);
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    if (next === 'light') root.classList.add('light');
    else if (next === 'dark') root.classList.remove('light');
    else root.classList.toggle('light', media.matches);
    localStorage.setItem('nx-ui-theme-mode', next);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 lg:px-6 glass-card border-t-0 border-x-0 rounded-none"
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onOpenDashboard}
          className="flex items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-primary via-primary to-primary/70 shadow-lg glow-primary" />
            </div>
            <div className="absolute inset-1 border border-primary/40 rounded-full animate-orbit">
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary/80" />
            </div>
            <div className="absolute inset-0 border border-primary/20 rounded-full rotate-60 animate-orbit-reverse">
              <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/60" />
            </div>
            <div
              className="absolute -inset-0.5 border border-primary/10 rounded-full rotate-[-30deg] animate-orbit"
              style={{ animationDuration: '16s' }}
            >
              <div className="absolute top-1/2 -right-0.5 -translate-y-1/2 w-1 h-1 rounded-full bg-primary/50" />
            </div>
          </div>

          <div className="hidden sm:block text-left">
            <h1 className="text-base font-bold tracking-[0.2em] gradient-text">NEXORA</h1>
            <p className="text-[10px] tracking-[0.3em] text-muted-foreground font-medium">GRID</p>
          </div>
        </button>

        <div className="hidden lg:block w-px h-8 bg-gradient-to-b from-transparent via-border to-transparent" />
        <span className="hidden lg:inline-block text-[10px] tracking-widest text-primary/70 font-medium uppercase">
          Enterprise Resource Planning
        </span>
      </div>

      <div className="flex items-center gap-3 lg:gap-4">
        <div className="hidden md:flex flex-col items-end">
          <span className="text-muted-foreground">
            {currentTime ? formatDate(currentTime) : '載入中...'}
          </span>
          <motion.span
            key={currentTime?.getSeconds()}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className="text-sm font-semibold gradient-text tabular-nums"
          >
            {currentTime ? formatTime(currentTime) : '--:--'}
          </motion.span>
        </div>

        <div className="hidden md:block w-px h-8 bg-gradient-to-b from-transparent via-border to-transparent" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-foreground hover:bg-secondary/80 rounded-xl h-10 w-10"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary/40 animate-ping" />
                <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-[9px] font-bold text-primary-foreground">
                  3
                </span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 glass-card p-0 overflow-hidden">
            <DropdownMenuLabel className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
              <span className="font-semibold text-foreground">通知</span>
              <Badge variant="secondary" className="text-[10px]">
                3 則未讀
              </Badge>
            </DropdownMenuLabel>
            <div className="max-h-[300px] overflow-y-auto">
              {[
                { title: '新訂單通知', desc: '客戶「大同汽車」下了一筆新訂單', time: '5 分鐘前', type: 'order' },
                { title: '庫存警示', desc: '「煞車來令片 B-201」庫存不足', time: '30 分鐘前', type: 'warning' },
                { title: '帳款提醒', desc: '「永昌汽材」有一筆應收帳款即將到期', time: '1 小時前', type: 'payment' },
              ].map((item, i) => (
                <DropdownMenuItem
                  key={i}
                  className="flex flex-col items-start gap-1 px-4 py-3 cursor-pointer hover:bg-secondary/50 border-b border-border/30 last:border-0 rounded-none"
                >
                  <div className="flex items-center gap-2 w-full">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        item.type === 'order' ? 'bg-chart-4' : item.type === 'warning' ? 'bg-destructive' : 'bg-primary'
                      }`}
                    />
                    <span className="font-medium text-foreground text-sm">{item.title}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{item.time}</span>
                  </div>
                  <span className="text-xs text-muted-foreground pl-4">{item.desc}</span>
                </DropdownMenuItem>
              ))}
            </div>
            <div className="p-2 border-t border-border/50">
              <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground">
                查看全部通知
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleThemeMode}
          className="relative text-foreground hover:bg-secondary/80 rounded-xl h-10 w-10"
          aria-label={
            themeMode === 'system'
              ? '目前：跟隨系統（點擊切換深色）'
              : themeMode === 'dark'
                ? '目前：深色（點擊切換淺色）'
                : '目前：淺色（點擊切換跟隨系統）'
          }
          title={
            themeMode === 'system'
              ? '跟隨系統'
              : themeMode === 'dark'
                ? '深色'
                : '淺色'
          }
        >
          {themeMode === 'system' ? (
            <Monitor className="w-5 h-5" />
          ) : themeMode === 'dark' ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 h-10 rounded-xl hover:bg-secondary/80">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-semibold text-foreground">{displayName}</p>
                <p className="text-[10px] text-muted-foreground">{roleLabel}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground hidden lg:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass-card">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem className="gap-2 text-foreground cursor-pointer" onClick={onOpenDashboard}>
              <UserCircle className="w-4 h-4" />
              進入 Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-foreground cursor-pointer">
              <UserCircle className="w-4 h-4" />
              個人設定
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-foreground cursor-pointer">
              <Settings className="w-4 h-4" />
              系統設定
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem
              variant="destructive"
              className="gap-2 cursor-pointer focus:text-destructive"
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4" />
              登出系統
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  );
}
