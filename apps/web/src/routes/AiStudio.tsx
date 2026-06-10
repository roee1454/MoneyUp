import { Trash, Plus, ChatCircle } from '@phosphor-icons/react';
import { useState } from 'react';
import { useAppStore } from '@/store';
import { useUserProfile } from '@/hooks/useUsers';
import { AiConversation } from '@/features/ai/components/AiConversation';
import { Button } from '@/components/ui/button';
import { AddAiProviderDialog } from '@/features/ai/components/AddAiProviderDialog';
import { useConversations, useDeleteConversation } from '@/hooks/useAi';
import { Select, SelectItem } from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

// Removed local model mappings since AI selector is localized now.

export default function AiStudio() {
  const session = useAppStore((s) => s.session);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const setActiveConversationId = useAppStore((s) => s.setActiveConversationId);
  const [conversationToDelete, setConversationToDelete] = useState<
    string | null
  >(null);

  const queryClient = useQueryClient();

  const {
    data: userProfile,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useUserProfile(session?.userId);

  const { data: conversations = [], isLoading: isConversationsLoading } =
    useConversations();
  const deleteMutation = useDeleteConversation();

  // Decoupled activeProvider. We now use configuredProviders list.

  if (isProfileLoading || isConversationsLoading) {
    return (
      <div
        className="h-[60vh] flex items-center justify-center text-center"
        dir="rtl"
      >
        <span className="text-sm font-semibold text-muted-foreground animate-pulse">
          טוען הגדרות AI ושיחות...
        </span>
      </div>
    );
  }

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConversationToDelete(id);
  };

  const confirmDelete = async () => {
    if (!conversationToDelete) return;
    try {
      await deleteMutation.mutateAsync(conversationToDelete);
      toast.success('השיחה נמחקה בהצלחה');
      await queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });

      if (activeConversationId === conversationToDelete) {
        setActiveConversationId(null);
      }
    } catch (e) {
      toast.error('מחיקת השיחה נכשלה');
    } finally {
      setConversationToDelete(null);
    }
  };

  const hasAiProvider = (userProfile?.configuredProviders?.length ?? 0) > 0;

  return (
    <div
      className="text-right animate-in fade-in-50 duration-300 w-full h-full flex flex-col overflow-hidden"
      dir="rtl"
    >
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        {/* Sidebar: Conversation History (Desktop Only) */}
        {hasAiProvider && (
          <div className="w-64 hidden md:flex flex-col border-l border-border bg-card/45 backdrop-blur-md shrink-0">
            <div className="p-4 border-b border-border">
              <Button
                onClick={() => setActiveConversationId(null)}
                className="w-full h-10 rounded-none font-black text-xs uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="h-4 w-4" weight="bold" />
                <span>שיחה חדשה</span>
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {conversations.length === 0 ? (
                <div className="py-8 text-center px-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
                    אין שיחות קודמות. התחל שיחה חדשה כדי לקבל תובנות פיננסיות.
                  </p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = activeConversationId === conv.id;
                  return (
                    <div
                      key={conv.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveConversationId(conv.id)}
                      className={cn(
                        'w-full text-right px-3 py-3 flex items-center justify-between group transition-all cursor-pointer border outline-none',
                        isActive
                          ? 'bg-muted/50 border-border text-foreground'
                          : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/20 hover:border-border/50 hover:text-foreground',
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ChatCircle
                          className={cn(
                            'h-4 w-4 shrink-0',
                            isActive
                              ? 'text-primary'
                              : 'text-muted-foreground/60',
                          )}
                          weight="duotone"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-xs font-black leading-tight">
                            {conv.title}
                          </span>
                          <span className="truncate text-[9px] font-semibold opacity-60">
                            {format(
                              new Date(conv.updatedAt),
                              'dd MMM yyyy, HH:mm',
                              { locale: he },
                            )}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteClick(e, conv.id)}
                        className={cn(
                          'shrink-0 h-6 w-6 flex items-center justify-center rounded-none text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors outline-none cursor-pointer',
                          isActive
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100',
                        )}
                        title="מחק שיחה"
                      >
                        <Trash className="h-3.5 w-3.5" weight="bold" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 min-w-0 flex flex-col bg-background relative">
          {/* Unified Chat Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card/45 backdrop-blur-md gap-2 shrink-0 select-none">
            {/* Right: Title on Desktop / Conversation Select on Mobile */}
            <div className="flex-1 min-w-0">
              <div className="hidden md:block">
                <h3 className="text-sm font-black text-foreground">
                  {activeConversationId
                    ? conversations.find((c) => c.id === activeConversationId)
                        ?.title || 'שיחת ייעוץ'
                    : 'שיחה חדשה'}
                </h3>
              </div>
              <div className="md:hidden">
                {conversations.length > 0 ? (
                  <Select
                    value={activeConversationId || 'new'}
                    onValueChange={(val) => {
                      setActiveConversationId(val === 'new' ? null : val);
                    }}
                  >
                    <SelectItem value="new">➕ שיחה חדשה...</SelectItem>
                    {conversations.map((conv) => (
                      <SelectItem key={conv.id} value={conv.id}>
                        💬 {conv.title}
                      </SelectItem>
                    ))}
                  </Select>
                ) : (
                  <span className="text-xs font-black text-muted-foreground uppercase">
                    שיחה חדשה
                  </span>
                )}
              </div>
            </div>

            {/* Left: Extra Actions (e.g. Delete conversation) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {activeConversationId && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) =>
                    handleDeleteClick(e as any, activeConversationId)
                  }
                  className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 rounded-none border-border"
                  title="מחק שיחה"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <AiConversation
            userProfile={userProfile}
            conversationId={activeConversationId}
            onConversationCreated={(newId) => setActiveConversationId(newId)}
            onConnectClick={() => setIsAiDialogOpen(true)}
          />
        </div>
      </div>

      <AddAiProviderDialog
        open={isAiDialogOpen}
        onOpenChange={setIsAiDialogOpen}
        onSuccess={() => {
          void refetchProfile();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!conversationToDelete}
        onOpenChange={(open) => !open && setConversationToDelete(null)}
      >
        <DialogContent
          className="max-w-md bg-card border border-border rounded-none p-6 shadow-2xl"
          dir="rtl"
        >
          <DialogHeader className="text-right space-y-1 pb-4 border-b border-border">
            <DialogTitle className="text-lg font-black text-foreground uppercase tracking-tight">
              מחיקת שיחה
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-widest leading-relaxed">
              האם אתה בטוח שברצונך למחוק שיחה זו? פעולה זו היא סופית ולא ניתן
              לבטלה.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex flex-row justify-end gap-3">
            <Button
              variant="outline"
              className="rounded-none font-bold text-xs h-10 border-border cursor-pointer uppercase tracking-widest"
              onClick={() => setConversationToDelete(null)}
            >
              ביטול
            </Button>
            <Button
              className="rounded-none font-black text-xs h-10 bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer uppercase tracking-widest px-6 shadow-lg shadow-destructive/20"
              onClick={() => void confirmDelete()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'מוחק...' : 'מחק לצמיתות'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
