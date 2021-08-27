/**
 * Defines the options that are used when versioning with Milestone strategy.
 *
 * @export
 * @interface MilestoneOptions
 */
export interface MilestoneOptions {
  /**
   * Discriminator value
   *
   * @type {'Milestone'}
   * @memberof MilestoneOptions
   */
  kind: 'Milestone';
  /**
   * The prefix part of a release branch version number. For example, with a prefix of 'M' a release branch might be
   * `release/M2`, where `2` is the release branch's milestone version.
   *
   * @type {string}
   * @memberof MilestoneOptions
   */
  prefix: string;
  /**
   * The base release number from which to start counting releases. Useful if there aren't yet any release branches.
   *
   * @type {number}
   * @memberof MilestoneOptions
   */
  baseNumber: number;
}

/**
 * Defines the options that are used when versioning with SemVer strategy.
 *
 * @export
 * @interface SemVerOptions
 */
export interface SemVerOptions {
  /**
   * Discriminator value
   *
   * @type {'SemVer'}
   * @memberof SemVerOptions
   */
  kind: 'SemVer';
  /**
   * The base release number from which to start counting releases. Useful if there aren't yet any release branches.
   * This should be in the form `major.minor`, for example `2.3`.
   *
   * @type {string}
   * @memberof SemVerOptions
   */
  baseNumber: string;
}

export type StrategyOptions = MilestoneOptions | SemVerOptions;

/**
 * Defines the options that are specified at repository level, i.e. within the `rfconfig.yml` configuration file.
 *
 * @export
 * @interface RepoOptions
 */
export interface RepoOptions {
  /**
   * The name of the trunk branch, for example `main` or `master`.
   *
   * @type {string}
   * @memberof RepoOptions
   */
  trunkBranchName: string;
  /**
   * The prefix used to identify a release branch, for example `release/`.
   *
   * @type {string}
   * @memberof RepoOptions
   */
  releaseBranchPrefix: string;
  /**
   * The known prefixes for working branch names.
   *
   * @type {string[]}
   * @memberof RepoOptions
   */
  workingBranchPrefixes: string[];
  /**
   * Indicates whether to strip any matched working branch prefixes from the generated prerelease label.
   *
   * @type {boolean}
   * @memberof RepoOptions
   */
  stripBranchPrefixFromLabel: boolean;
  /**
   * Indicates whether to fail when an unknown prefix is present on a working branch.
   *
   * @type {boolean}
   * @memberof RepoOptions
   */
  failOnUnknownPrefix: boolean;
  /**
   * The strategy-specific options.
   *
   * @type {StrategyOptions}
   * @memberof RepoOptions
   */
  strategy: StrategyOptions;
}

export const DefaultMilestoneOptions: MilestoneOptions = {
  kind: 'Milestone',
  prefix: 'R',
  baseNumber: 0,
};

export const DefaultSemVerOptions: SemVerOptions = {
  kind: 'SemVer',
  baseNumber: '0.0',
};

export const DefaultOptions: RepoOptions = {
  trunkBranchName: 'master',
  releaseBranchPrefix: 'release/',
  workingBranchPrefixes: ['feature/', 'bugfix/', 'hotfix/', 'merge/'],
  stripBranchPrefixFromLabel: true,
  failOnUnknownPrefix: true,
  strategy: DefaultSemVerOptions,
};

/**
 * Extends the repository options to add invocation-specific options required for version calculation.
 *
 * @export
 * @interface Options
 * @extends {RepoOptions}
 */
export interface Options extends RepoOptions {
  /**
   * By default, the build number is calculated based on local branches. In some cases (particularly on certain CI
   * servers), not all origin branches are not set up locally when the repo is cloned. This option forces the version
   * calculation engine to refer to `refs/heads/origin/xxx` instead of `refs/heads/xxx` to overcome this limitation.
   *
   * @type {boolean}
   * @memberof Options
   */
  useOriginBranches: boolean;
}
