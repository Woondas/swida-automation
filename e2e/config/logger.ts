/**
 * creates a simple console logger with the given prefix
 * - info: console.log
 * - warn: console.warn
 * - error: console.error
 */
export function createLogger(prefix: string) {
  const format = (message: string) => `${prefix} ${message}`;
  return {
    info: (message: string) => console.log(format(message)),
    warn: (message: string) => console.warn(format(message)),
    error: (message: string) => console.error(format(message)),
  };
}


