// Utility functions for PDF adapter

export function createTempFileName(extension: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `temp-${timestamp}-${random}.${extension}`;
}

export function isNodeEnvironment(): boolean {
  return typeof window === 'undefined';
}

export function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined';
}
