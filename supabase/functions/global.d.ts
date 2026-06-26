declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
  }
  export const env: Env;
  
  export interface ServeOptions {
    port?: number;
    hostname?: string;
    onListen?: (params: { port: number; hostname: string }) => void;
    onError?: (error: unknown) => Response | Promise<Response>;
  }

  export function serve(
    handler: (request: Request) => Response | Promise<Response>
  ): void;
  export function serve(
    options: ServeOptions,
    handler: (request: Request) => Response | Promise<Response>
  ): void;
}
