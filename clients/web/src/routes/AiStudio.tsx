import { Link } from '@tanstack/react-router';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/store';
import { useUserProfile } from '@/hooks/useUsers';
import { AiConversation } from '@/components/AiConversation';
import { PremiumCard } from '@/components/ui/premium-card';
import { Button } from '@/components/ui/button';

export default function AiStudio() {
  const session = useAppStore((s) => s.session);
  const { data: userProfile, isLoading } = useUserProfile(session?.userId);

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-center" dir="rtl">
        <span className="text-sm font-semibold text-zinc-500">טוען הגדרות AI...</span>
      </div>
    );
  }

  const hasAiProvider = !!userProfile?.activeAiProvider;

  return (
    <div className="space-y-6 text-right animate-in fade-in-50 duration-300 min-h-[80vh] flex flex-col" dir="rtl">
      <div>
        <h1 className="text-3xl font-black text-zinc-950 dark:text-white leading-tight">ייעוץ עם סוכן</h1>
        <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          שאל שאלות פיננסיות, קבל ניתוח הוצאות חכם, ותכנן את העתיד הכלכלי שלך בעזרת סוכן AI חכם.
        </p>
      </div>

      {hasAiProvider && userProfile?.activeAiProvider ? (
        <div className="flex-1 flex flex-col min-h-0">
          <AiConversation
            provider={userProfile.activeAiProvider}
            preferredModel={userProfile.preferredModel}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <PremiumCard className="max-w-md p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-center flex flex-col items-center">
            <div className="h-12 w-12 rounded-none bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 animate-pulse">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">עדיין לא הוגדר מפתח AI</h3>
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 mt-2 max-w-sm">
              על מנת שתוכל להתייעץ עם סוכן ה-AI הפיננסי שלך, יש להגדיר מפתח API של OpenAI, Claude או Gemini בהגדרות החשבון.
            </p>
            <Button className="mt-6 text-xs font-bold rounded-none bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 h-10 px-6" asChild>
              <Link to="/settings">
                <span>לעמוד הגדרות</span>
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </PremiumCard>
        </div>
      )}
    </div>
  );
}
