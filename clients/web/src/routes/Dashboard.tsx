import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';

const apiBase = 'http://localhost:3000';

export default function Dashboard() {
  const session = useAppStore((s) => s.session);
  const setSession = useAppStore((s) => s.setSession);
  const navigate = useNavigate();

  async function logout() {
    await fetch(`${apiBase}/auth/logout`, { method: 'POST', credentials: 'include' });
    setSession(null);
    navigate({ to: '/login' });
  }

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">דשבורד</h1>
      <p>מחובר בהצלחה: {session?.username}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border p-4">
          <h2 className="font-semibold">שווי נקי</h2>
          <p className="text-2xl font-bold">$248,120</p>
        </article>
        <article className="rounded-xl border p-4">
          <h2 className="font-semibold">סורקים פעילים</h2>
          <p>3</p>
        </article>
        <article className="rounded-xl border p-4">
          <h2 className="font-semibold">אירועים אחרונים</h2>
          <p>Sync completed</p>
        </article>
      </div>
      <Button variant="destructive" size="sm" onClick={() => void logout()}>
        התנתקות
      </Button>
    </section>
  );
}
