/// <reference types="vite/client" />

interface ImportMetaEnv {
  // No Supabase variables here anymore
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
