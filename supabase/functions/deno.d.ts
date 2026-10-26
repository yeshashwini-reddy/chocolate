// Ambient declarations for Supabase Edge Functions
// Provides TypeScript definitions for Deno runtime and HTTPS imports in editors using standard TypeScript tooling.

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    has(key: string): boolean;
    toObject(): Record<string, string>;
  }

  export const env: Env;

  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
    options?: { port?: number; onListen?: (params: { port: number; hostname: string }) => void }
  ): void;

  export function serve(
    options: { port?: number; onListen?: (params: { port: number; hostname: string }) => void },
    handler: (request: Request) => Response | Promise<Response>
  ): void;
}

declare module 'https://deno.land/std@0.177.0/http/server.ts' {
  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
    options?: { port?: number; onListen?: (params: { port: number; hostname: string }) => void }
  ): void;

  export function serve(
    options: { port?: number; onListen?: (params: { port: number; hostname: string }) => void },
    handler: (request: Request) => Response | Promise<Response>
  ): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js';
}
