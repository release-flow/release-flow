#!/usr/bin/env node

/**
 * Command-line interface for running the build version calculation.
 */
import yargs from 'yargs';
import * as fs from 'fs';
import { GitPrimitives } from './GitPrimitives';
import BuildVersionCalculator, {
  ConfigFileName,
  ConfigurationReader,
  BuildVersionInfo,
  Logger,
  InputError,
  Options,
} from './index';
import { Console } from 'console';

enum LogLevel {
  None = 0,
  Error = 1,
  Warn = 2,
  Info = 3,
  Debug = 4,
}

class ConsoleLogger implements Logger {
  console: Console;

  /**
   * @constructor
   */
  constructor(private logLevel: LogLevel) {
    this.console = new Console(process.stderr);
  }

  debug(message: string): void {
    if (this.logLevel >= LogLevel.Debug) {
      this.console.debug(message);
    }
  }

  warn(message: string): void {
    if (this.logLevel >= LogLevel.Warn) {
      this.console.warn(message);
    }
  }

  info(message: string): void {
    if (this.logLevel >= LogLevel.Info) {
      this.console.info(message);
    }
  }
  error(message: string): void {
    if (this.logLevel >= LogLevel.Error) {
      this.console.error(message);
    }
  }
}

function setOutputVariable(name: string, value: string | undefined | null): void {
  const OutputVariablePrefix = 'ReleaseFlowVersion';
  const varName = `${OutputVariablePrefix}.${name}`;
  const safeValue = value ? value : '';
  console.log(`##vso[task.setvariable variable=${varName};]${safeValue}`);
}

function setAzurePipelinesBuildVersion(version: BuildVersionInfo): void {
  let buildNumber = version.majorMinorPatch;
  if (version.buildType !== 'release') {
    buildNumber += `-${version.preReleaseLabel}.${version.commitsSinceVersionSource}`;
  }

  setOutputVariable('Major', version.major.toString());
  setOutputVariable('Minor', version.minor.toString());
  setOutputVariable('Patch', version.patch.toString());
  setOutputVariable('MajorMinorPatch', version.majorMinorPatch);
  setOutputVariable('BranchName', version.branchName);
  setOutputVariable('BuildType', version.buildType);
  setOutputVariable('PreReleaseLabel', version.preReleaseLabel);
  setOutputVariable('Sha', version.sha);
  setOutputVariable('ShortSha', version.shortSha);
  setOutputVariable('CommitDate', version.commitDate.toISOString());
  setOutputVariable('CommitsSinceVersionSource', version.commitsSinceVersionSource.toString());

  console.log(`##vso[build.updatebuildnumber]${buildNumber}`);
}

(async function (): Promise<void> {
  try {
    const argv = yargs(process.argv.slice(2))
      .options({
        'source-ref': {
          alias: 's',
          type: 'string',
          describe:
            'The full Git ref of the current branch/tag, e.g. refs/heads/main. Useful if building from a detached head',
        },
        'target-branch': {
          alias: 't',
          type: 'string',
          demandOption: false,
          describe: 'The full Git ref of the target branch, if the build is for a PR',
        },
        output: {
          alias: 'o',
          choices: ['json', 'azure-pipelines'],
          default: 'json',
          describe: 'The output format',
        },
        pretty: {
          alias: 'p',
          type: 'boolean',
          describe: 'Enable pretty-print of JSON output',
        },
        config: {
          alias: 'c',
          type: 'string',
          default: ConfigFileName,
          describe: 'The configuration file',
        },
        verbose: {
          alias: 'v',
          type: 'boolean',
          describe: 'Enable verbose output to stderr',
        },
        debug: {
          alias: 'd',
          type: 'boolean',
          describe: 'Enable debug (extremely verbose) output to stderr',
        },
        'use-origin-branches': {
          type: 'boolean',
          describe: 'Reference origin branches instead of local ones (can be useful for a CI build on some systems)',
          default: false,
        },
      })
      .parseSync();

    const logLevel: LogLevel = argv.debug ? LogLevel.Debug : argv.verbose ? LogLevel.Info : LogLevel.Warn;
    const log = new ConsoleLogger(logLevel);
    log.debug(`Node version: ${process.version}`);
    log.debug('Command-line options:' + JSON.stringify(argv));

    if (!fs.existsSync(argv.config)) {
      throw new InputError(`Config file '${argv.config}' not found`);
    }

    const config = new ConfigurationReader();

    log.debug(`Using options file '${argv.config}'`);

    const configContents = fs.readFileSync(argv.config).toString();
    const configOptions = config.getOptions(configContents);

    log.debug('Configuration options:' + JSON.stringify(configOptions));

    if (!argv['source-ref']) {
      const git = new GitPrimitives(log, argv['use-origin-branches']);
      const branch = await git.getCurrentBranchName();
      if (branch == null) {
        throw new InputError('No source ref specified, and unable to determine (detached head)');
      }
      log.info(`Source branch detected: ${branch}`);
      argv['source-ref'] = branch;
    }

    const options: Options = {
      ...configOptions,
      useOriginBranches: argv['use-origin-branches'],
    };
    const calculator = new BuildVersionCalculator(log, options);
    const version = await calculator.getBuildVersionInfo(argv['source-ref'], argv['target-branch']);

    switch (argv.output) {
      case 'azure-pipelines':
        setAzurePipelinesBuildVersion(version);
        break;

      default:
        console.log(JSON.stringify(version, null, <never>(argv.pretty ? 2 : null)));
        break;
    }
  } catch (err) {
    if (err instanceof InputError) {
      console.error(`ERROR: ${err.message}`);
      process.exit(-1);
    } else {
      console.error(err);
      process.exit(-2);
    }
  }
})();
