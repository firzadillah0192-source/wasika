declare namespace NodeJS {
  interface ProcessEnv {
    readonly NEXT_PUBLIC_SUPABASE_URL: string
    readonly NEXT_PUBLIC_SUPABASE_ANON_KEY: string
    readonly SUPABASE_SERVICE_ROLE_KEY: string
    readonly NEXT_PUBLIC_APP_URL: string
    readonly NEXT_PUBLIC_SENTRY_DSN: string
    readonly SENTRY_AUTH_TOKEN: string
    readonly NEXT_PUBLIC_NOMINATIM_URL: string
  }
}
