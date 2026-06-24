import { Trash } from '@phosphor-icons/react';
import { useState, Suspense, lazy } from 'react';
import { useAppStore } from '@/store';
import { useUserProfile } from '@/hooks/useUsers';
import { AiConversation } from '@/features/ai/components/AiConversation';
import { Button } from '@/components/ui/button';
import { useConversations, useDeleteConversation } from '@/hooks/useAi';
import { Select, SelectItem } from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, useReducedMotion, type Variants } from 'motion/react';

const AddAiProviderDialog = lazy(() =>
  import('@/features/ai/components/AddAiProviderDialog').then((module) => ({
    default: module.AddAiProviderDialog,
  }))
);

const DeleteConversationDialog = lazy(() =>
  import('@/features/ai/components/DeleteConversationDialog').then((module) => ({
    default: module.DeleteConversationDialog,
  }))
);

// Removed local model mappings since AI selector is localized now.

export default function Agent() {
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
  const shouldReduceMotion = useReducedMotion();
  const isAnimated = !shouldReduceMotion;

  // Decoupled activeProvider. We now use configuredProviders list.

  if (isProfileLoading || isConversationsLoading) {
    return (
      <div
        className="w-full h-full flex-1 flex items-center justify-center text-center bg-background"
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

  const itemVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      },
    },
  };

  const ChatMotionContainer = isAnimated ? motion.div : 'div';

  return (
    <div className="text-right w-full h-full flex flex-col overflow-hidden" dir="rtl">
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 min-w-0 flex flex-col bg-background relative">
          {/* Unified Chat Header (Static) */}
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

          <ChatMotionContainer
            className="flex-1 min-h-0"
            {...(isAnimated ? { variants: itemVariants, initial: 'hidden', animate: 'visible' } : {})}
          >
            <AiConversation
              userProfile={userProfile}
              conversationId={activeConversationId}
              onConversationCreated={(newId) => setActiveConversationId(newId)}
              onConnectClick={() => setIsAiDialogOpen(true)}
            />
          </ChatMotionContainer>
        </div>
      </div>

      <Suspense fallback={null}>
        <AddAiProviderDialog
          open={isAiDialogOpen}
          onOpenChange={setIsAiDialogOpen}
          onSuccess={() => {
            void refetchProfile();
          }}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConversationDialog
          open={!!conversationToDelete}
          onOpenChange={(open) => {
            if (!open) setConversationToDelete(null);
          }}
          isPending={deleteMutation.isPending}
          onConfirm={() => void confirmDelete()}
        />
      </Suspense>
    </div>
  );
}
