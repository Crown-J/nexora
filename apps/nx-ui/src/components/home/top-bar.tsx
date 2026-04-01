'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNxThemeMode } from '@/hooks/useNxThemeMode';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NavPlanetMenu } from '@/components/home/dock';

const HEADER_NOTIFICATION_ITEMS = [
  { title: '新訂單通知', desc: '客戶「大同汽車」下了一筆新訂單', time: '5 分鐘前', type: 'order' as const },
  { title: '庫存警示', desc: '「煞車來令片 B-201」庫存不足', time: '30 分鐘前', type: 'warning' as const },
  { title: '帳款提醒', desc: '「永昌汽材」有一筆應收帳款即將到期', time: '1 小時前', type: 'payment' as const },
];

export type HomeTopBarProps = {
  displayName: string;
  roleLabel?: string;
  onLogout: () => void;
  onOpenDashboard: () => void;
  /** 租戶中文名（nx99_tenant.name）；無則顯示預設 ERP 標語 */
  tenantNameZh?: string | null;
  /** 租戶英文名（nx99_tenant.name_en） */
  tenantNameEn?: string | null;
  /** 置中區（例如 Dashboard 主模組 Tabs）；與 /home 相同頂欄風格 */
  centerContent?: ReactNode;
};

type SettingsTab = 'personal' | 'system';

export function HomeTopBar({
  displayName,
  roleLabel = '使用者',
  onLogout,
  onOpenDashboard,
  tenantNameZh,
  tenantNameEn,
  centerContent,
}: HomeTopBarProps) {
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const { themeMode, setThemeMode, cycleThemeMode } = useNxThemeMode();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('personal');

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarUrlRef = useRef<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [allNotificationsOpen, setAllNotificationsOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (avatarUrlRef.current) {
        URL.revokeObjectURL(avatarUrlRef.current);
      }
    };
  }, []);

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (avatarUrlRef.current) {
      URL.revokeObjectURL(avatarUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    avatarUrlRef.current = url;
    setAvatarUrl(url);
    e.target.value = '';
  };

  const openSettings = (tab: SettingsTab) => {
    setSettingsTab(tab);
    setSettingsOpen(true);
    setPasswordMsg(null);
  };

  const handleSavePersonal = () => {
    if (!newPassword && !confirmPassword) {
      setPasswordMsg(null);
      setSettingsOpen(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg('兩次輸入的密碼不一致');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg('密碼至少 6 字元（測試用規則）');
      return;
    }
    setPasswordMsg(null);
    setNewPassword('');
    setConfirmPassword('');
    setSettingsOpen(false);
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

  const themeRadios: { value: 'light' | 'dark' | 'system'; label: string }[] = [
    { value: 'light', label: '淺色' },
    { value: 'dark', label: '深色' },
    { value: 'system', label: '跟隨系統' },
  ];

  const zh = tenantNameZh?.trim() ?? '';
  const en = tenantNameEn?.trim() ?? '';
  const hasZh = zh.length > 0;
  const hasEn = en.length > 0;
  const showTenantBlock = hasZh || hasEn;

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 flex h-16 w-full items-center gap-3 border-x-0 border-t-0 border-b border-border/50 glass-card nx-glass-raised px-4 lg:px-6 rounded-none"
    >
      <div className="flex min-w-0 shrink-0 items-center gap-3 sm:gap-4">
        <NavPlanetMenu />

        <motion.button
          type="button"
          onClick={onOpenDashboard}
          title="回到首頁"
          aria-label="回到首頁"
          whileHover={{
            y: -2,
            transition: { type: 'spring', stiffness: 420, damping: 28, mass: 0.85 },
          }}
          whileTap={{
            y: 0,
            scale: 0.985,
            transition: { type: 'spring', stiffness: 550, damping: 35 },
          }}
          className={cn(
            'group/brand relative -my-0.5 overflow-hidden rounded-xl border border-transparent px-2.5 py-1.5 text-left',
            'transition-[border-color,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
            'hover:border-border/35 hover:bg-gradient-to-br hover:from-white/[0.06] hover:via-white/[0.02] hover:to-transparent',
            'hover:shadow-[0_12px_36px_-14px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.07)]',
            'dark:hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.06)]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-out',
              'bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent',
              'group-hover/brand:opacity-100',
            )}
          />
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-y-0 -left-2/3 w-[55%] skew-x-[-14deg]',
              'bg-gradient-to-r from-transparent via-white/20 to-transparent',
              'translate-x-0 opacity-0 transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
              'group-hover/brand:translate-x-[190%] group-hover/brand:opacity-100',
            )}
          />
          <div className="relative hidden sm:block">
            <h1
              className={cn(
                'gradient-text text-base font-bold tracking-[0.2em]',
                'transition-[letter-spacing,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                'group-hover/brand:tracking-[0.24em] group-hover/brand:brightness-110 group-hover/brand:saturate-110',
              )}
            >
              NEXORA
            </h1>
            <p
              className={cn(
                'mt-0.5 text-[10px] font-medium tracking-[0.3em] text-muted-foreground',
                'transition-[letter-spacing,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                'group-hover/brand:tracking-[0.36em] group-hover/brand:text-primary/65',
              )}
            >
              GRID
            </p>
          </div>
          <span
            className={cn(
              'relative gradient-text text-xs font-bold tracking-[0.15em] transition-[letter-spacing,filter] duration-500 sm:hidden',
              'ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/brand:tracking-[0.2em] group-hover/brand:brightness-110',
            )}
          >
            NEXORA
          </span>
        </motion.button>

        <div className="hidden lg:block w-px h-8 bg-gradient-to-b from-transparent via-border to-transparent" />
        {showTenantBlock ? (
          <div className="hidden lg:flex min-w-0 max-w-[min(28rem,40vw)] flex-col text-left leading-tight">
            {hasZh ? (
              <span className="truncate text-[11px] font-medium tracking-wide text-primary/90">{zh}</span>
            ) : null}
            {hasEn ? (
              <span
                className={cn(
                  'truncate text-muted-foreground',
                  hasZh ? 'mt-0.5 text-[10px] tracking-wide' : 'text-[11px] font-medium tracking-wide text-primary/90',
                )}
              >
                {en}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="hidden lg:inline-block text-[10px] font-medium uppercase tracking-widest text-primary/70">
            Enterprise Resource Planning
          </span>
        )}
      </div>

      {centerContent ? (
        <div className="flex min-w-0 flex-1 justify-center">
          <div className="max-w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {centerContent}
          </div>
        </div>
      ) : (
        <div className="min-w-0 flex-1" aria-hidden />
      )}

      <div className="flex shrink-0 items-center gap-3 lg:gap-4">
        <div className="hidden md:flex flex-col items-end">
          <span className="text-muted-foreground">
            {formatDate(currentTime)}
          </span>
          <motion.span
            key={currentTime.getSeconds()}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className="text-sm font-semibold gradient-text tabular-nums"
          >
            {formatTime(currentTime)}
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
              {HEADER_NOTIFICATION_ITEMS.map((item, i) => (
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
              <Button
                type="button"
                size="sm"
                className="w-full text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => setAllNotificationsOpen(true)}
              >
                查看全部通知
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={cycleThemeMode}
          className="relative text-foreground hover:bg-secondary/80 rounded-xl h-10 w-10"
          aria-label={
            themeMode === 'system'
              ? '目前：跟隨系統（點擊切換深色）'
              : themeMode === 'dark'
                ? '目前：深色（點擊切換淺色）'
                : '目前：淺色（點擊切換跟隨系統）'
          }
          title={themeMode === 'system' ? '跟隨系統' : themeMode === 'dark' ? '深色' : '淺色'}
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
              <div className="w-8 h-8 rounded-xl overflow-hidden bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-primary" />
                )}
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
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem
              className="gap-2 text-foreground cursor-pointer"
              onClick={() => openSettings('personal')}
            >
              <UserCircle className="w-4 h-4" />
              個人設定
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 text-foreground cursor-pointer"
              onClick={() => openSettings('system')}
            >
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

      <Dialog open={allNotificationsOpen} onOpenChange={setAllNotificationsOpen}>
        <DialogContent className="sm:max-w-md glass-card max-h-[min(520px,85vh)] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/50 shrink-0">
            <DialogTitle>全部通知</DialogTitle>
            <DialogDescription className="sr-only">通知列表（測試資料）</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0 max-h-[380px] px-2">
            <ul className="px-4 pb-2 space-y-0">
              {HEADER_NOTIFICATION_ITEMS.map((item, i) => (
                <li
                  key={i}
                  className="flex flex-col gap-1 rounded-lg px-2 py-3 -mx-1 border-b border-border/30 last:border-0 transition-colors duration-150 hover:bg-secondary/55"
                >
                  <div className="flex items-center gap-2 w-full">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        item.type === 'order'
                          ? 'bg-chart-4'
                          : item.type === 'warning'
                            ? 'bg-destructive'
                            : 'bg-primary'
                      }`}
                    />
                    <span className="font-medium text-foreground text-sm">{item.title}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{item.time}</span>
                  </div>
                  <span className="text-xs text-muted-foreground pl-4">{item.desc}</span>
                </li>
              ))}
            </ul>
          </ScrollArea>
          <DialogFooter className="px-6 py-4 border-t border-border/50 shrink-0">
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => setAllNotificationsOpen(false)}>
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>設定</DialogTitle>
            <DialogDescription>個人資料與外觀（目前為前端測試，未連接後端）。</DialogDescription>
          </DialogHeader>
          <Tabs
            value={settingsTab}
            onValueChange={(v) => setSettingsTab(v as SettingsTab)}
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="personal">個人設定</TabsTrigger>
              <TabsTrigger value="system">系統設定</TabsTrigger>
            </TabsList>
            <TabsContent value="personal" className="mt-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-border bg-secondary/40 flex items-center justify-center shrink-0">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="預覽" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="avatar-file">個人頭像</Label>
                  <Input id="avatar-file" type="file" accept="image/*" onChange={onAvatarChange} className="text-xs" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pw-new">新密碼</Label>
                <Input
                  id="pw-new"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="選填，測試用"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pw-confirm">確認密碼</Label>
                <Input
                  id="pw-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="選填"
                />
              </div>
              {passwordMsg ? <p className="text-sm text-destructive">{passwordMsg}</p> : null}
            </TabsContent>
            <TabsContent value="system" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">外觀主題</p>
              <div className="flex flex-col gap-2">
                {themeRadios.map((r) => (
                  <label
                    key={r.value}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2.5 cursor-pointer transition-colors',
                      themeMode === r.value ? 'border-primary/50 bg-primary/10' : 'hover:bg-secondary/50',
                    )}
                  >
                    <input
                      type="radio"
                      name="nx-theme"
                      className="accent-primary"
                      checked={themeMode === r.value}
                      onChange={() => setThemeMode(r.value)}
                    />
                    <span className="text-sm text-foreground">{r.label}</span>
                  </label>
                ))}
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setSettingsOpen(false)}>
              關閉
            </Button>
            {settingsTab === 'personal' ? (
              <Button type="button" onClick={handleSavePersonal}>
                儲存
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.header>
  );
}
