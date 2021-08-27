import * as yaml from 'js-yaml';
import * as fs from 'fs';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ConfigurationError, BoneheadedError } from './Errors';
import {
  RepoOptions,
  DefaultOptions,
  StrategyOptions,
  DefaultMilestoneOptions,
  DefaultSemVerOptions,
} from './BuildCalculationOptions';

export class ConfigurationReader {
  public getOptionsFromFile(filePath: string): RepoOptions {
    const yamlText = fs.readFileSync(filePath).toString();
    return this.getOptions(yamlText);
  }

  /**
   * Reads the options from an options file.
   *
   * @param {string} filePath
   * @memberof ConfigurationFileReader
   */
  public getOptions(yamlText: string): RepoOptions {
    const data = yaml.load(yamlText);

    if (!this.isOptions(data)) {
      throw new BoneheadedError("Shouldn't get here, exception should already be thrown");
    }

    let strategyOptions: StrategyOptions;
    switch (data.strategy?.kind) {
      case 'Milestone':
        strategyOptions = { ...DefaultMilestoneOptions, ...data.strategy };
        break;

      case 'SemVer':
        strategyOptions = { ...DefaultSemVerOptions, ...data.strategy };
        break;

      default:
        throw new BoneheadedError('Valid data.strategy.kind should have been checked in isOptions');
    }

    const options = {
      ...DefaultOptions,
      ...data,
    };
    options.strategy = strategyOptions;
    return options;
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  private isOptions(maybeOptions: string | number | object | null | undefined): maybeOptions is Partial<RepoOptions> {
    if (maybeOptions === null || typeof maybeOptions !== 'object') {
      throw new ConfigurationError('Invalid configuration file');
    }

    const data = maybeOptions as RepoOptions;
    if (typeof data.strategy.kind !== 'string') {
      throw new ConfigurationError('Versioning strategy not specified in configuration');
    }

    const kind = data.strategy.kind;
    switch (kind) {
      case 'Milestone':
        if ('baseNumber' in data.strategy && typeof data.strategy.baseNumber !== 'number') {
          throw new ConfigurationError('Invalid data type for baseNumber in configuration');
        }
        break;

      case 'SemVer':
        if ('baseNumber' in data.strategy && typeof data.strategy.baseNumber !== 'string') {
          throw new ConfigurationError('Invalid data type for baseNumber in configuration');
        }
        break;

      default:
        throw new ConfigurationError(`Unsupported strategy kind '${data.strategy.kind}'`);
    }

    return true;
  }
}
