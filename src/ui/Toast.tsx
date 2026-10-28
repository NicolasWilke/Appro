import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Tono = 'ok' | 'error' | 'info';
const Ctx = createContext<(texto: string, tono?: Tono) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; texto: string; tono: Tono }[]>([]);
  const avisar = useCallback((texto: string, tono: Tono = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, texto, tono }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <Ctx.Provider value={avisar}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((x) => <div key={x.id} className={`toast toast--${x.tono}`}>{x.texto}</div>)}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
