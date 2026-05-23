import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Shield, Lightning, TrendUp, CaretLeft } from '@phosphor-icons/react';
import { BrandLogo } from '@/components/BrandLogo';

export default function Introduction() {
  return (
    <section
      className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 select-none py-12 md:py-20"
      dir="rtl"
    >
      <div className="max-w-5xl w-full flex flex-col items-center">
        {/* Brand Wordmark - Slightly smaller for "slicker" feel */}
        <div className="mb-12">
          <BrandLogo variant="hero" className="text-4xl md:text-6xl" />
        </div>

        {/* Main Title & Subtitle */}
        <div className="text-center space-y-6 max-w-3xl">
          <h1 className="text-4xl md:text-7xl font-black tracking-tight text-foreground leading-[1.05]">
            לשלוט בכסף שלך.
            <br />
            <span className="bg-gradient-to-l from-zinc-400 to-zinc-600 dark:from-zinc-500 dark:to-zinc-300 bg-clip-text text-transparent">
              בלי סיבוכים מיותרים.
            </span>
          </h1>

          <p className="mx-auto max-w-xl text-base md:text-lg font-medium text-muted-foreground leading-relaxed">
            מרכזים את כל חשבונות הבנק שלך במקום אחד. ניתוח חכם בזמן אמת, תובנות
            מיידיות ומעקב שקוף ומאובטח.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="mt-10 mb-20">
          <Button
            size="lg"
            className="group h-12 rounded-full px-8 font-bold text-base bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 shadow-xl flex items-center gap-2 cursor-pointer"
            asChild
          >
            <Link to="/login">
              <span>התחברות למערכת</span>
              <CaretLeft
                className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
                weight="bold"
              />
            </Link>
          </Button>
        </div>

        {/* Feature Grid - Compact & Slick Cards */}
        <div className="grid gap-4 sm:grid-cols-3 w-full">
          <FeatureCard
            icon={<Lightning className="h-6 w-6" weight="duotone" />}
            title="סנכרון אוטומטי"
            description="חיבור מהיר של חשבונות הבנק. העסקאות מסתנכרנות ומסווגות באופן שוטף."
          />
          <FeatureCard
            icon={<Shield className="h-6 w-6" weight="duotone" />}
            title="אבטחה מקסימלית"
            description="הנתונים שלך מוצפנים. פרטי ההתחברות שלך לעולם אינם נשמרים אצלנו."
          />
          <FeatureCard
            icon={<TrendUp className="h-6 w-6" weight="duotone" />}
            title="תובנות חכמות"
            description="ניתוח חכם של הוצאות והכנסות שיעזרו לך להגדיל את החיסכון בדרכים נוחות."
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group p-6 rounded-2xl border border-border bg-card hover:bg-accent transition-all duration-300 text-right">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-foreground mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="font-bold text-lg text-foreground mb-2">{title}</h3>
      <p className="text-sm font-medium text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
