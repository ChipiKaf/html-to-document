declare module 'zetajs' {
  export interface ZetaWorkerOptions {
    sofficeBaseUrl: string;
    headless?: boolean;
  }

  export interface UnoContext {
    com: {
      sun: {
        star: any;
      };
    };
  }

  export interface ZetaWorker {
    putFileIntoVFS(blob: Blob, filename: string): Promise<string>;
    getFileFromVFS(path: string): Promise<ArrayBuffer>;
    getUnoComponentContext(): any;
    uno: UnoContext;
    terminate(): Promise<void>;
  }

  export function createZetaWorker(
    options: ZetaWorkerOptions
  ): Promise<ZetaWorker>;
}
