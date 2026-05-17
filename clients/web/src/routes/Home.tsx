import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Home() {
  return (
    <section className="flex min-h-[calc(100vh-80px)] items-center justify-center">
      <Card className="w-full max-w-2xl border-zinc-300 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <CardContent className="space-y-6 py-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight">MoneyUp</h1>
          <p className="text-base text-zinc-600 dark:text-zinc-300">
            Review and analyze income across multiple banking platforms using AI.
          </p>
          <Link to="/login">
            <Button className="px-8">התחל</Button>
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
