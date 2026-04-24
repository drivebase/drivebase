// Ambient augmentation so tsc can walk into `@drivebase/data/src/config.ts`
// which reads `import.meta.env.VITE_PUBLIC_API_URL`. `vite/client` isn't a
// dep of this package, so we inline the shape of what we actually read.
interface ImportMetaEnv {
  readonly VITE_PUBLIC_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
