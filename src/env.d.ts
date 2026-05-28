/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Optional app display name for UI environments.
  readonly VITE_APP_NAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

