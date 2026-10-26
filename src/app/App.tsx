import { useMemo } from 'react';
import { crearRepositorio } from '@/data';
import { DataProvider } from '@/data/DataProvider';
import { ToastProvider } from '@/ui/Toast';
import { AppRouter } from './Router';
import { AuthProvider } from '@/auth/AuthProvider';

export function App() {
  const repo = useMemo(crearRepositorio, []);
  return (
    <DataProvider repo={repo}>
      <AuthProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </AuthProvider>
    </DataProvider>
  );
}
