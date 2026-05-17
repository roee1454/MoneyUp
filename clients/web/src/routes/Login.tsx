import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store';

type User = {
  id: string;
  username: string;
  email: string;
};

type SessionResponse = {
  isAuthenticated: boolean;
  user: {
    userId: string;
    username: string;
    isAuthenticated: boolean;
    loginTime: string;
  };
};

const apiBase = 'http://localhost:3000';
const avatarColors = ['bg-red-600', 'bg-blue-600', 'bg-emerald-600', 'bg-orange-600', 'bg-violet-600'];

async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${apiBase}/users`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed loading users');
  return res.json() as Promise<User[]>;
}

export default function Login() {
  const [selectedId, setSelectedId] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const setSession = useAppStore((s) => s.setSession);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const profiles = usersQuery.data ?? [];
  const shouldShowForm = showForm || profiles.length === 0;

  async function createProfile() {
    setError('');
    const res = await fetch(`${apiBase}/users`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email }),
    });
    if (!res.ok) {
      setError('יצירת פרופיל נכשלה');
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['users'] });
    setUsername('');
    setEmail('');
    setShowForm(false);
  }

  async function login(profileId?: string) {
    const effectiveId = profileId ?? selectedId;
    const user = profiles.find((u) => u.id === effectiveId);
    if (!user) {
      setError('בחר פרופיל');
      return;
    }

    const loginRes = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, username: user.username }),
    });
    if (!loginRes.ok) {
      setError('התחברות נכשלה');
      return;
    }

    const sessionRes = await fetch(`${apiBase}/auth/session`, {
      credentials: 'include',
    });
    if (!sessionRes.ok) {
      setError('לא נמצאה סשן פעילה');
      return;
    }

    const sessionData = (await sessionRes.json()) as SessionResponse;
    setSession(sessionData.user);
    navigate({ to: '/dashboard' });
  }

  if (usersQuery.isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center text-sm text-zinc-500">טוען פרופילים...</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <section className="flex min-h-[calc(100vh-80px)] items-center justify-center">
      <div className="w-full">
      {error ? <p className="mb-4 text-center text-sm text-red-500">{error}</p> : null}

      {shouldShowForm ? (
        <div className="mx-auto flex max-w-md items-center justify-center">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-center text-2xl">הוסף פרופיל חדש</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">שם משתמש</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="שם משתמש"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">אימייל</Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="אימייל"
                />
              </div>
              <Button className="w-full" onClick={() => void createProfile()}>
                שמור פרופיל
              </Button>
              {profiles.length > 0 ? (
                <>
                  <Separator />
                  <Button variant="outline" className="w-full" onClick={() => setShowForm(false)}>
                    חזור לבחירת פרופיל
                  </Button>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center space-y-10">
          <h1 className="text-5xl font-bold tracking-tight">מי צופה?</h1>
          <div className="flex flex-wrap items-start justify-center gap-8">
            {profiles.map((user, index) => (
              <div key={user.id} className="space-y-3 text-center">
                <Button
                  variant="ghost"
                  className="h-auto p-0 hover:bg-transparent"
                  onClick={() => {
                    setSelectedId(user.id);
                    void login(user.id);
                  }}
                >
                  <Avatar className={`h-24 w-24 rounded-md ${avatarColors[index % avatarColors.length]}`}>
                    <AvatarFallback className="rounded-md bg-transparent text-2xl font-bold text-white">
                      {user.username.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
                <p className={`text-sm ${selectedId === user.id ? 'font-semibold' : 'text-zinc-500'}`}>{user.username}</p>
              </div>
            ))}
            <div className="space-y-3 text-center">
              <Button variant="ghost" className="h-auto p-0 hover:bg-transparent" onClick={() => setShowForm(true)}>
                <Avatar className="h-24 w-24 rounded-md bg-zinc-700">
                  <AvatarFallback className="rounded-md bg-transparent text-white">
                    <Plus className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
              </Button>
              <p className="text-sm text-zinc-500">הוסף</p>
            </div>
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
