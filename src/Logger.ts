/**
 * Interface for logging to enable mocking etc.
 *
 * @export
 * @interface Logger
 */
export interface Logger {
  debug(message: string): void;
  warn(message: string): void;
  info(message: string): void;
  error(message: string): void;
}
