/* eslint-disable class-methods-use-this */
import { spawn } from 'child_process';

import { Logger } from './Logger';

export interface GitExecResults {
  code: number;
  stdout: string;
  stderr: string;
}
/**
 * A mockable abstraction of Git command execution.
 *
 * @export
 * @class GitRunner
 */
export default class GitRunner {
  /**
   * @constructor
   */
  constructor(private readonly log: Logger) {}

  public async execCommand(args: string[]): Promise<GitExecResults> {
    const cmd = ['git', ...args].join(' ');
    this.log.debug(`Running command ${cmd}`);

    return new Promise((resolve, reject) => {
      const commandExecuter = spawn('git', args);
      let stdOutData = '';
      let stderrData = '';
      commandExecuter.stdout.on('data', (data: string) => {
        stdOutData += data;
      });
      commandExecuter.stderr.on('data', (data: string) => {
        stderrData += data;
      });
      commandExecuter.on('close', (code: number) => {
        const res = {
          code,
          stdout: stdOutData.toString(),
          stderr: stderrData.toString(),
        };

        this.log.debug(`Command exit code ${res.code}`);
        this.log.debug(`Stdout: ${res.stdout}`);
        this.log.debug(`Stderr: ${res.stderr}`);
        resolve(res);
      });
      commandExecuter.on('error', (err: string) => {
        reject(err);
      });
    });
  }
}
