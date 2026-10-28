/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_ROUTER?: 'browser' | 'memory';
  readonly VITE_DATA_SOURCE?: 'mock' | 'api';
  readonly VITE_API_URL?: string;
  readonly VITE_PUBLIC_URL?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }
