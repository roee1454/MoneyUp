import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Shield, Zap, TrendingUp } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

export default function Introduction() {
  return (
    <section className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] px-4 select-none py-12" dir="rtl">
      <div className="max-w-4xl space-y-8 text-center">
        {/* Brand Wordmark */}
        <div className="flex justify-center pt-1 md:pt-2">
          <BrandLogo variant="hero" />
        </div>

        {/* Main Title */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-8xl font-black tracking-tight text-zinc-950 dark:text-white leading-tight">
            לשלוט בכסף שלך.<br />
            <span className="text-zinc-400 dark:text-zinc-500">בלי סיבוכים מיותרים.</span>
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg md:text-xl font-semibold text-zinc-500 dark:text-zinc-400 leading-relaxed">
            מרכזים את כל חשבונות הבנק שלך במקום אחד. ניתוח חכם בזמן אמת, תובנות מיידיות ומעקב שקוף ומאובטח לחלוטין.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button 
            size="lg" 
            className="group h-13 rounded-none px-10 font-black text-base bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 transition-all duration-300 shadow-xl flex items-center gap-3 border border-zinc-800 dark:border-zinc-200 cursor-pointer"
            asChild
          >
            <Link to="/login">
              <span>התחברות למערכת</span>
            </Link>
          </Button>
        </div>

        {/* Three Value Propositions */}
        <div className="grid gap-6 sm:grid-cols-3 pt-16 border-t border-zinc-200/80 dark:border-zinc-800/80 text-right">
          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white">
              <Zap className="h-5 w-5 stroke-2" />
            </div>
            <h3 className="font-bold text-lg text-zinc-950 dark:text-white">סנכרון אוטומטי מלא</h3>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 leading-relaxed">
              חיבור מהיר של חשבונות הבנק שלך. העסקאות מסתנכרנות ומסווגות לקטגוריות באופן שוטף ואוטומטי.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white">
              <Shield className="h-5 w-5 stroke-2" />
            </div>
            <h3 className="font-bold text-lg text-zinc-950 dark:text-white">אבטחה ברמה הגבוהה ביותר</h3>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 leading-relaxed">
              הנתונים שלך מוצפנים ומאובטחים, פרטי ההתחברות שלך לעולם אינם נשמרים אצלנו.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white">
              <TrendingUp className="h-5 w-5 stroke-2" />
            </div>
            <h3 className="font-bold text-lg text-zinc-950 dark:text-white">תובנות והמלצות חסכון</h3>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 leading-relaxed">
              ניתוח חכם של ההוצאות וההכנסות לצד התייעצות עם סוכנים שיעזרו לך להגדיל את החיסכון בדרכים נוחות.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
