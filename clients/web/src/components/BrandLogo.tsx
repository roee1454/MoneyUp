import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  variant: 'nav' | 'hero';
  className?: string;
  to?: string;
  interactive?: boolean;
}

export function BrandLogo({
  variant,
  className,
  to,
  interactive = variant === 'nav',
}: BrandLogoProps) {
  const baseClasses = 'inline-flex items-baseline select-none leading-none whitespace-nowrap';
  const variantClasses =
    variant === 'hero'
      ? 'text-5xl md:text-7xl lg:text-8xl tracking-tight'
      : 'text-xl md:text-2xl tracking-tight';
  const rootClass = cn(baseClasses, variantClasses, className);

  const content = (
    <div className='underline underline-offset-4 decoration-zinc-600 decoration-dashed'>
      <span className="font-extrabold text-zinc-950 dark:text-white">MONEY</span>
      <span className="font-extrabold text-zinc-400 dark:text-zinc-500">UP</span>
    </div>
  );

  if (interactive && to) {
    return (
      <Link to={to} className={rootClass} aria-label="חזרה לדף הבית">
        {content}
      </Link>
    );
  }

  return <div className={rootClass}>{content}</div>;
}
