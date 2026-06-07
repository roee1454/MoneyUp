import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { queryClient } from '@/lib/queryClient';
import { AppRouterProvider } from '@/router';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/ThemeProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AppRouterProvider />
        <Toaster position="bottom-left" />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
