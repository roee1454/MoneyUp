import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { List, CaretDown, Plus, Trash, ChatCircle } from '@phosphor-icons/react';
import { Link, useRouterState } from '@tanstack/react-router';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { useConversations, useDeleteConversation } from '@/hooks/useAi';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { he } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import { useLogout } from '@/hooks/useAuth';
import { BrandLogo } from '@/components/BrandLogo';
import { useSyncAccounts } from '@/hooks/useAccounts';
import { UserProfileCard } from '@/components/UserProfileCard';
import { SyncStatusCard } from '@/components/SyncStatusCard';

const NAV_ITEMS = [
  { label: 'בית', to: '/dashboard' },
  { label: 'ייעוץ עם סוכן', to: '/ai-studio' },
  { label: 'ייצוא נתונים', to: '/export' },
];

const SETTINGS_SUB_ITEMS = [
  { label: 'חיבורי בנקים ואשראי', to: '/settings' },
  { label: 'הגדרות בינה מלאכותית', to: '/settings/ai' },
  { label: 'הגדרות סורקים', to: '/settings/scrapers' },
];

type SidebarContentProps = {
  pathname: string;
  username?: string;
  isSyncing: boolean;
  isSyncPending: boolean;
  onSync: () => void;
  onLogout: () => void;
};

function SidebarContent({
  pathname,
  username,
  isSyncing,
  isSyncPending,
  onSync,
  onLogout,
}: SidebarContentProps) {
  const isSyncBusy = isSyncing || isSyncPending;
  const isInSettings = pathname.startsWith('/settings');
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(isInSettings);

  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const setActiveConversationId = useAppStore((s) => s.setActiveConversationId);
  const { data: conversations = [] } = useConversations();
  const deleteMutation = useDeleteConversation();
  const queryClient = useQueryClient();

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('האם אתה בטוח שברצונך למחוק שיחה זו?')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('השיחה נמחקה בהצלחה');
        await queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
        if (activeConversationId === id) {
          setActiveConversationId(null);
        }
      } catch (err) {
        toast.error('מחיקת השיחה נכשלה');
      }
    }
  };

  return (
    <div className="flex h-full flex-col" dir="rtl">
      {/* Top Section: Main Navigation */}
      <div className="shrink-0 space-y-5 px-1">
        <div className="flex w-full justify-center py-1 mt-4">
          <BrandLogo
            variant="nav"
            to="/dashboard"
            className="text-2xl md:text-3xl"
          />
        </div>
        <Separator className="bg-border" />

        <nav aria-label="ניווט ראשי">
          <ul className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.to;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      'flex h-10 items-center justify-between border px-3 text-sm font-bold transition-colors',
                      active
                        ? 'border-border bg-primary text-primary-foreground'
                        : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <span>{item.label}</span>
                    {active ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    ) : null}
                  </Link>
                </li>
              );
            })}

            <li>
              <button
                onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                className={cn(
                  'flex h-10 w-full items-center justify-between border px-3 text-sm font-bold transition-colors outline-none cursor-pointer',
                  isInSettings && !isSettingsExpanded
                    ? 'border-border bg-primary text-primary-foreground'
                    : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground',
                )}
              >
                <div className="flex items-center gap-2">
                  <span>הגדרות</span>
                </div>
                <CaretDown
                  className={cn(
                    'h-3 w-3 transition-transform duration-200',
                    isSettingsExpanded && 'rotate-180',
                  )}
                />
              </button>

              {isSettingsExpanded && (
                <ul className="mt-1 space-y-1 pr-4 animate-in slide-in-from-top-2 fade-in duration-200">
                  {SETTINGS_SUB_ITEMS.map((subItem) => {
                    const active = pathname === subItem.to;
                    return (
                      <li key={subItem.to}>
                        <Link
                          to={subItem.to}
                          className={cn(
                            'flex h-9 items-center border px-3 text-[11px] font-black transition-all',
                            active
                              ? 'border-border/30 bg-primary/5 text-primary'
                              : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground',
                          )}
                        >
                          <span>{subItem.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          </ul>
        </nav>
      </div>

      {/* Middle Section: Scrollable Conversation List (Only on AI Studio) */}
      {pathname === '/ai-studio' ? (
        <div className="flex-1 min-h-0 flex flex-col space-y-2 pt-4 overflow-hidden">
          <Separator className="bg-border shrink-0" />
          <div className="flex items-center justify-between px-2 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              שיחות אחרונות
            </span>
            <Button
              onClick={() => setActiveConversationId(null)}
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
              title="שיחה חדשה"
            >
              <Plus className="h-3.5 w-3.5" weight="bold" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-1 space-y-1 min-h-0">
            {conversations.length === 0 ? (
              <div className="py-6 text-center px-3">
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide leading-relaxed">
                  אין שיחות קודמות.
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = activeConversationId === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={cn(
                      'w-full text-right px-2.5 py-2 flex items-center justify-between group transition-all cursor-pointer border text-xs font-bold',
                      isActive
                        ? 'bg-muted/50 border-border text-foreground'
                        : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/20 hover:border-border/50 hover:text-foreground',
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ChatCircle
                        className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          isActive ? 'text-primary' : 'text-muted-foreground/60',
                        )}
                        weight="duotone"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-[11px] font-bold leading-tight">
                          {conv.title}
                        </span>
                        <span className="truncate text-[9px] font-medium opacity-60">
                          {format(new Date(conv.updatedAt), 'dd MMM yyyy, HH:mm', {
                            locale: he,
                          })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        void handleDelete(conv.id, e);
                      }}
                      className={cn(
                        'shrink-0 h-5 w-5 flex items-center justify-center rounded-none text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors outline-none cursor-pointer',
                        isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                      )}
                      title="מחק שיחה"
                    >
                      <Trash className="h-3 w-3" weight="bold" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Empty space holder to push bottom section down naturally if not on AI Studio */
        <div className="flex-1" />
      )}

      {/* Bottom Section: System info */}
      <div className="shrink-0 px-1 pb-2 pt-4 space-y-3 bg-background/50 border-t border-border/50">
        <div className="px-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">
            מערכת
          </p>
        </div>
        <div className="space-y-2">
          <SyncStatusCard
            onSync={onSync}
            isSyncing={isSyncBusy}
            className="bg-muted/30"
          />
          <UserProfileCard
            username={username}
            onLogout={onLogout}
            className="bg-muted/30"
          />
        </div>
      </div>
    </div>
  );
}

export function Navbar() {
  const [isHydrated, setIsHydrated] = useState(false);
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const session = useAppStore((s) => s.session);
  const sync = useAppStore((s) => s.sync);
  const logoutMutation = useLogout();
  const syncMutation = useSyncAccounts();
  const isSyncing = sync.status === 'running' || sync.status === 'reconnecting';

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  async function logout() {
    await logoutMutation.mutateAsync();
  }

  async function syncToday() {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    await syncMutation.mutateAsync({
      startDate: todayStr,
      endDate: todayStr,
    });
  }

  if (!isHydrated || !session) return null;

  const sidebar = (
    <SidebarContent
      pathname={pathname}
      username={session.username}
      isSyncing={isSyncing}
      isSyncPending={syncMutation.isPending}
      onSync={() => void syncToday()}
      onLogout={() => void logout()}
    />
  );

  return (
    <>
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-72 border-l border-border bg-background p-5 shadow-sm lg:block">
        {sidebar}
      </aside>

      <header
        className="sticky top-0 z-50 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md lg:hidden"
        dir="rtl"
      >
        <div className="flex items-center justify-between">
          <BrandLogo variant="nav" to="/dashboard" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-md border border-border"
                  aria-label="פתיחת תפריט ניווט"
                >
                  <List className="h-4 w-4" weight="bold" />
                </Button>
              </SheetTrigger>

              <SheetContent
                showCloseButton={false}
                side="left"
                className="flex w-[280px] flex-col border-l border-border bg-background p-5"
                dir="rtl"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>תפריט ראשי</SheetTitle>
                </SheetHeader>
                {sidebar}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}
