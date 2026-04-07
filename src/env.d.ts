/// <reference types="vite/client" />

interface ImportMetaEnv {
  // UI-only mode currently requires no custom env variables.
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

