import { Logger } from '../Logger';

export default class SpyLogger implements Logger {
  _messages: string[];

  /**
   *
   */
  constructor() {
    this._messages = [];
  }

  debug(message: string): void {
    this.writeLog('debug', message);
  }

  warn(message: string): void {
    this.writeLog('warn', message);
  }

  info(message: string): void {
    this.writeLog('info', message);
  }

  error(message: string): void {
    this.writeLog('error', message);
  }

  public clear(): void {
    this._messages = [];
  }

  public get messages(): string[] {
    return this._messages;
  }

  private writeLog(level: string, message: string): void {
    this._messages.push(`${level}: ${message}`);
  }
}
