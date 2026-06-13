/** Marca general de la plataforma (UI fuera de un tenant). */
export const APP_NAME = 'RF FIT'

/** Versión de la app, inyectada desde package.json por Vite (ver vite.config.ts). */
declare const __APP_VERSION__: string
export const APP_VERSION = __APP_VERSION__
