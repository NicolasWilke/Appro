import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Repository } from './repository';

const RepoContext = createContext<Repository | null>(null);

export function DataProvider({ repo, children }: { repo: Repository; children: ReactNode }) {
  return <RepoContext.Provider value={repo}>{children}</RepoContext.Provider>;
}

export function useRepo() {
  const r = useContext(RepoContext);
  if (!r) throw new Error('useRepo fuera de DataProvider');
  return r;
}

/**
 * Lectura de datos con refresco automático cuando el repositorio avisa cambios.
 * Mantiene el último dato mientras recarga, para que la vista no parpadee.
 * Reemplazable por TanStack Query sin tocar las pantallas.
 */
export function useQuery<T>(leer: (repo: Repository) => Promise<T>, deps: unknown[]) {
  const repo = useRepo();
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const leerRef = useRef(leer);
  leerRef.current = leer;

  const cargar = useCallback(() => {
    let vigente = true;
    leerRef.current(repo).then((d) => vigente && setData(d), (e) => vigente && setError(e));
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, ...deps]);

  useEffect(() => {
    let cancelar = cargar();
    const desuscribir = repo.suscribir(() => { cancelar(); cancelar = cargar(); });
    return () => { cancelar(); desuscribir(); };
  }, [cargar, repo]);

  return { data, error, cargando: data === undefined && !error };
}
