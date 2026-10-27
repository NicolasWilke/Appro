import { useEffect, useState } from 'react';
import { AuthProvider } from '@/auth/AuthProvider';
import { crearRepositorio, type Repository } from '@/data';
import { DataProvider } from '@/data/DataProvider';
import { ToastProvider } from '@/ui/Toast';
import { AppRouter } from './Router';

export function App() {
  const [repo, setRepo] = useState<Repository | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  useEffect(() => { crearRepositorio().then(setRepo, (e: Error) => setFallo(e.message)); }, []);
  if (fallo) return <div className="envoltura pagina"><p className="error">No se pudo conectar con los datos: {fallo}</p></div>;
  if (!repo) return <div className="arranque" aria-busy="true" />;
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
