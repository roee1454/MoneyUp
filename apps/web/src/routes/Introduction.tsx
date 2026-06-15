import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { premiumButtonVariants } from '@/components/ui/premium-button';
import { Shield, Lightning, TrendUp, CaretLeft } from '@phosphor-icons/react';
import { BrandLogo } from '@/components/BrandLogo';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { PremiumMotionCard } from '@/components/ui/premium-motion-card';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.08,
      staggerDirection: -1,
      when: 'afterChildren',
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function Introduction() {
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);

  return (
    <section
      className="relative flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 select-none py-6 md:py-8 lg:py-12 overflow-hidden bg-transparent"
      dir="rtl"
    >

      {/* Hero Content Section */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={isExiting ? 'exit' : 'visible'}
        onAnimationComplete={(definition) => {
          if (definition === 'exit') {
            void navigate({ to: '/login' });
          }
        }}
        className="relative z-10 max-w-5xl w-full flex flex-col items-center"
      >
        {/* Brand Logo Wordmark */}
        <motion.div variants={itemVariants} className="mb-[2.5vh] md:mb-[3vh]">
          <BrandLogo variant="hero" className="text-4xl md:text-5xl lg:text-6xl" />
        </motion.div>

        {/* Main Title & Subtitle */}
        <div className="text-center space-y-[1.5vh] max-w-3xl">
          <motion.h1
            variants={itemVariants}
            className="text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight text-foreground leading-[1.05]"
          >
            לשלוט בכסף שלך.
            <br />
            <span className="bg-gradient-to-l from-zinc-400 to-zinc-600 dark:from-zinc-500 dark:to-zinc-300 bg-clip-text text-transparent">
              בלי סיבוכים מיותרים.
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mx-auto max-w-xl text-xs md:text-sm lg:text-base font-medium text-muted-foreground leading-relaxed px-4"
          >
            מרכזים את כל חשבונות הבנק שלך במקום אחד. ניתוח חכם בזמן אמת, תובנות
            מיידיות ומעקב שקוף ומאובטח.
          </motion.p>
        </div>

        {/* Primary CTA */}
        <motion.div
          variants={itemVariants}
          whileHover={shouldReduceMotion ? {} : { scale: 1.03 }}
          whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="mt-[2.5vh] mb-[3.5vh] md:mb-[4vh]"
        >
          <button
            onClick={() => setIsExiting(true)}
            className={premiumButtonVariants({
              variant: 'default',
              size: 'default',
              className: 'group px-8 text-base shadow-lg flex items-center gap-2 cursor-pointer',
            })}
          >
            <span>התחברות למערכת</span>
            <CaretLeft
              className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
              weight="bold"
            />
          </button>
        </motion.div>

        {/* Feature Grid - Compact & Slick Cards */}
        <div className="grid gap-3 lg:gap-4 sm:grid-cols-3 w-full">
          <FeatureCard
            icon={<Lightning className="h-5 w-5 lg:h-6 lg:w-6" weight="duotone" />}
            title="סנכרון אוטומטי"
            description="חיבור מהיר של חשבונות הבנק. העסקאות מסתנכרנות ומסווגות באופן שוטף."
          />
          <FeatureCard
            icon={<Shield className="h-5 w-5 lg:h-6 lg:w-6" weight="duotone" />}
            title="אבטחה מקסימלית"
            description="הנתונים שלך מוצפנים. פרטי ההתחברות שלך לעולם אינם נשמרים אצלנו."
          />
          <FeatureCard
            icon={<TrendUp className="h-5 w-5 lg:h-6 lg:w-6" weight="duotone" />}
            title="תובנות חכמות"
            description="ניתוח חכם של הוצאות והכנסות שיעזרו לך להגדיל את החיסכון בדרכים נוחות."
          />
        </div>
      </motion.div>
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
    <PremiumMotionCard
      variants={itemVariants}
      asButton
      className="group p-4 lg:p-5 border border-border/40 hover:bg-accent/30 text-right select-none"
    >
      <div className="flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-none bg-muted text-foreground mb-3 lg:mb-4 border border-border/40 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
        {icon}
      </div>
      <h3 className="font-bold text-base lg:text-lg text-foreground mb-1 lg:mb-2">{title}</h3>
      <p className="text-xs lg:text-sm font-medium text-muted-foreground leading-relaxed">
        {description}
      </p>
    </PremiumMotionCard>
  );
}
