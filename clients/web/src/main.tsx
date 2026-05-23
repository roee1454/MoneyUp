import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { queryClient } from '@/lib/queryClient';
import { AppRouterProvider } from '@/router';
import { Toaster } from '@/components/ui/sonner';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRouterProvider />
      <Toaster position='bottom-left' />
    </QueryClientProvider>
  </StrictMode>,
);
