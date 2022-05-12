// eslint-disable-next-line import/no-extraneous-dependencies
import { Logger } from './Logger';
import { BuildType } from './BuildType';
import { InputError, BoneheadedError } from './Errors';
import BuildVersionInfo from './BuildVersionInfo';
import { GitPrimitives, GitCommitInfo } from './GitPrimitives';
import { VersionSource, TagVersionSource } from './VersionSource';
import VersioningStrategy from './VersioningStrategy';
import MilestoneVersioningStrategy from './MilestoneVersioningStrategy';
import SemVerVersioningStrategy from './SemVerVersioningStrategy';
import { Options } from './BuildCalculationOptions';
import GitAbstractionUtils from './GitAbstractionUtils';
import { ReleaseBranchNumber, Branch } from './ReleaseBranch';
import Version from './Version';

/**
 * A version source derived from the first commit on the main trunk branch.
 *
 * @class InitialCommitVersionSource
 * @extends {VersionSource}
 */
class InitialCommitVersionSource extends VersionSource {
  constructor(public readonly initialCommit: GitCommitInfo) {
    super(initialCommit);
  }

  public get version(): Version {
    return new Version(0, 0, 0);
  }

  public toString(): string {
    return `initial repository commit, version = ${this.version.toString()}`;
  }
}

/**
 * Represents a version source derived from the presence of a release branch.
 * The forkCommit is the commit on the trunk branch from which the release
 * branch was branched.
 *
 * @class ReleaseBranchVersionSource
 * @extends {VersionSource}
 */
class ReleaseBranchVersionSource extends VersionSource {
  _version: Version;
  /**
   *
   */
  constructor(forkCommit: GitCommitInfo, public readonly branchName: string, version: Version) {
    super(forkCommit);
    this._version = version;
  }

  public get version(): Version {
    return this._version;
  }

  public toString(): string {
    return `branch '${this.branchName}', version = ${this.version.toString()}`;
  }
}

/**
 * The type returned when matching a build context (branch / tag / PR / etc.).
 *
 * @interface BuildContext
 */
interface BuildContext {
  buildType: BuildType;
  versionSource: VersionSource;
  preReleaseLabel: string | null;
  shortSourceBranchName: string;
  isReleaseBranchTarget: boolean;
}

/**
 * Defines a delegate function type that attempts to match the supplied details against a
 * build context (branch / tag / PR / etc.).
 *
 * @returns {Promise<BuildContext | false>}
 *   Either the BuildContext derived from the matched details, or false if no match was found.
 */
type BuildContextMatcherDelegate = (
  sourceRef: string,
  currentCommit: GitCommitInfo,
  targetBranch: string | undefined
) => Promise<BuildContext | false>;

/**
 * Calculates the build version details based on the Git repository.
 *
 * @export
 * @class BuildVersionCalculator
 */
export default class BuildVersionCalculator {
  readonly git: GitPrimitives;

  readonly strategy: VersioningStrategy;

  readonly fullReleaseBranchPrefix: string;

  readonly gitUtils: GitAbstractionUtils;

  /**
   * @constructor
   */
  constructor(private readonly log: Logger, private readonly opts: Options) {
    this.log = log;

    log.info(`Using ${this.opts.strategy.kind} strategy`);
    log.debug('Options:' + JSON.stringify(this.opts));

    switch (this.opts.strategy.kind) {
      case 'Milestone':
        this.strategy = new MilestoneVersioningStrategy(this.log, this.opts.strategy);
        break;

      case 'SemVer':
        this.strategy = new SemVerVersioningStrategy(this.log, this.opts.strategy);
        break;

      default:
        throw new BoneheadedError('Unsupported options mode');
    }
    const originPrefix = this.opts.useOriginBranches ? 'origin/' : '';
    this.fullReleaseBranchPrefix = `${originPrefix}${this.opts.releaseBranchPrefix}`;
    this.git = new GitPrimitives(log, this.opts.useOriginBranches);
    this.gitUtils = new GitAbstractionUtils(this.log, this.strategy, this.opts);
  }

  /**
   *
   *
   * @param {string} sourceRef The full Git branch name on which the current build is taking place, e.g.
   *          refs/heads/main or refs/pull/1/merge. Corresponds to the $(Build.SourceBranch) pipeline variable in Azure
   *          Pipelines.
   * @param {string} targetBranch If the build is a PR build, this is the full Git branch name of the merge target for
   *          the PR, e.g. refs/heads/main or refs/heads/release/1.1. Corresponds to the
   *          $(System.PullRequest.TargetBranch) pipeline variable in Azure Pipelines.
   * @returns {Promise<BuildVersionInfo>}
   * @memberof BuildVersionCalculator
   */
  public async getBuildVersionInfo(sourceRef: string, targetBranch: string | undefined): Promise<BuildVersionInfo> {
    const currentCommit = await this.git.getCommit('HEAD');

    this.log.debug(`Current commit: ${currentCommit.sha}`);

    // Try to match the build context in the following order
    const matchers: BuildContextMatcherDelegate[] = [
      this.tryMatchReleaseBranch,
      this.tryMatchTrunkBranch,
      this.tryMatchPullRequest,
      this.tryMatchReleaseTag,
      this.tryMatchWorkingBranch,
    ];

    let buildContext: BuildContext | false = false;

    // Iterate through the matcher delegates until one matches (or we have tried all the delegates)
    for (const matcher of matchers) {
      if ((buildContext = await matcher.call(this, sourceRef, currentCommit, targetBranch))) {
        break;
      }
    }

    if (buildContext === false) {
      throw new InputError(`Unsupported source ref '${sourceRef}'`);
    }

    const nextVersion = this.getNextVersion(
      buildContext.buildType,
      buildContext.versionSource,
      buildContext.isReleaseBranchTarget
    );
    const commitsSinceVersionSource = await this.git.countCommits(
      currentCommit.sha,
      buildContext.versionSource.commit.sha
    );

    const versionInfo = new BuildVersionInfo(
      nextVersion.major,
      nextVersion.minor,
      nextVersion.patch,
      buildContext.preReleaseLabel,
      currentCommit.sha,
      buildContext.buildType,
      buildContext.shortSourceBranchName,
      currentCommit.date,
      commitsSinceVersionSource,
      buildContext.versionSource.commit.sha
    );
    return versionInfo;
  }

  private async tryMatchReleaseBranch(sourceRef: string): Promise<BuildContext | false> {
    const shortSourceBranchName = sourceRef.replace(/^refs\/heads\//, '');
    if (!shortSourceBranchName.startsWith(this.opts.releaseBranchPrefix)) {
      return false;
    }

    const segment = shortSourceBranchName.slice(this.opts.releaseBranchPrefix.length);
    const releaseBranchNumber = this.strategy.tryParseReleaseBranchNumber(segment);

    if (!releaseBranchNumber) {
      throw new InputError(`Release branch '${sourceRef}' is in incorrect format`);
    }

    // *** Build triggered by a commit to a release branch ***
    this.log.debug(`Trigger is commit to release branch '${releaseBranchNumber}'`);
    const buildType = BuildType.Beta;
    const preReleaseLabel = 'beta';
    const isReleaseBranchTarget = true;
    const versionSource = await this.getVersionSourceFromReleaseBranch(releaseBranchNumber);
    return {
      buildType,
      preReleaseLabel,
      versionSource,
      isReleaseBranchTarget,
      shortSourceBranchName,
    };
  }

  private async tryMatchTrunkBranch(sourceRef: string, currentCommit: GitCommitInfo): Promise<BuildContext | false> {
    const shortSourceBranchName = sourceRef.replace(/^refs\/heads\//, '');
    if (shortSourceBranchName !== this.opts.trunkBranchName) {
      return false;
    }
    // *** Build triggered by a commit to trunk branch ***
    this.log.debug(`Trigger is commit to ${this.opts.trunkBranchName}`);
    const buildType = BuildType.Alpha;
    const preReleaseLabel = 'alpha';
    const isReleaseBranchTarget = false;
    const versionSource = await this.getVersionSourceFromNonReleaseBranch(currentCommit.sha);
    return {
      buildType,
      preReleaseLabel,
      versionSource,
      isReleaseBranchTarget,
      shortSourceBranchName,
    };
  }

  private async tryMatchPullRequest(
    sourceRef: string,
    currentCommit: GitCommitInfo,
    targetBranch: string | undefined
  ): Promise<BuildContext | false> {
    let match: RegExpExecArray | null = null;
    if ((match = /^refs\/pull\/(?<PR>\d+)\/merge$/.exec(sourceRef))) {
      // *** Build triggered by a pull request ***
      const [, prNumber] = match;
      this.log.debug(`Trigger is pull request, PR# = '${prNumber}'`);
      const buildType = BuildType.PullRequest;
      const preReleaseLabel = `pr.${prNumber}`;
      const mergeParent = await this.gitUtils.getMergeParent(currentCommit, 1);
      this.log.debug(`Merge parent is '${mergeParent.sha}'`);

      let releaseBranchNumber: ReleaseBranchNumber | null;
      if (targetBranch === undefined) {
        releaseBranchNumber = this.tryGetReleaseBranchNumberFromCommit(mergeParent);
      } else {
        const shortTargetBranchName = targetBranch?.replace(/^refs\/[^\/]+\//, '');

        if (shortTargetBranchName.startsWith(this.opts.releaseBranchPrefix)) {
          const releaseBranchSegment = shortTargetBranchName.slice(this.opts.releaseBranchPrefix.length);
          releaseBranchNumber = this.strategy.tryParseReleaseBranchNumber(releaseBranchSegment);

          if (!releaseBranchNumber) {
            throw new InputError(`Release branch ${targetBranch} is in incorrect format`);
          }
        } else {
          releaseBranchNumber = null;
        }
      }

      let isReleaseBranchTarget: boolean;
      let versionSource: VersionSource;
      if (releaseBranchNumber) {
        isReleaseBranchTarget = true;
        versionSource = await this.getVersionSourceFromReleaseBranch(releaseBranchNumber);
      } else {
        isReleaseBranchTarget = false;
        versionSource = await this.getVersionSourceFromNonReleaseBranch(mergeParent.sha);
      }

      this.log.debug(`isReleaseBranchTarget: ${isReleaseBranchTarget}, version source = ${versionSource.commit.sha}`);

      const shortSourceBranchName = `pull/${prNumber}/merge`;
      return {
        buildType,
        preReleaseLabel,
        versionSource,
        isReleaseBranchTarget,
        shortSourceBranchName,
      };
    }

    return false;
  }

  private async tryMatchReleaseTag(sourceRef: string, currentCommit: GitCommitInfo): Promise<BuildContext | false> {
    let match: RegExpExecArray | null = null;
    if (!(match = /^refs\/(heads\/)?tags\/(?<Version>v.*)$/.exec(sourceRef))) {
      return false;
    }
    // *** Build triggered by a tag in the (possible) format of a version ***
    const [,, version] = match;
    this.log.debug(`Trigger is release tag, version = '${version}'`);
    const buildType = BuildType.Release;
    const preReleaseLabel = null;
    const isReleaseBranchTarget = true;
    const vs = this.strategy.tryParseVersionSourceFromTag(version, currentCommit);
    if (!vs) {
      throw new InputError(`Release tag '${version} is not correctly formatted`);
    }
    const versionSource = vs;

    // tags/v1.0.0 makes more sense as a branch name than just v1.0.0
    const shortSourceBranchName = `tags/${version}`;

    return {
      buildType,
      preReleaseLabel,
      versionSource,
      isReleaseBranchTarget,
      shortSourceBranchName,
    };
  }

  private async tryMatchWorkingBranch(sourceRef: string, currentCommit: GitCommitInfo): Promise<BuildContext | false> {
    const shortSourceBranchName = sourceRef.replace(/^refs\/heads\//, '');
    this.log.debug(`Trigger is other branch '${sourceRef}'`);
    let preReleaseLabel = shortSourceBranchName;
    // Check branch prefixes
    let i;
    for (i = 0; i < this.opts.workingBranchPrefixes.length; i++) {
      const prefix = this.opts.workingBranchPrefixes[i];
      if (shortSourceBranchName.startsWith(prefix)) {
        if (this.opts.stripBranchPrefixFromLabel) {
          preReleaseLabel = shortSourceBranchName.slice(prefix.length);
        }
        break;
      }
    }

    if (i >= this.opts.workingBranchPrefixes.length) {
      // No matching prefix found
      if (this.opts.failOnUnknownPrefix) {
        return false;
      }
    }

    preReleaseLabel = this.sanitizeForPreReleaseLabel(preReleaseLabel);
    const buildType = BuildType.WorkingBranch;
    const isReleaseBranchTarget = false;
    const versionSource = await this.getVersionSourceFromNonReleaseBranch(currentCommit.sha);
    return {
      buildType,
      preReleaseLabel,
      versionSource,
      isReleaseBranchTarget,
      shortSourceBranchName,
    };
  }

  private tryGetReleaseBranchNumberFromCommit(commit: GitCommitInfo): ReleaseBranchNumber | null {
    let releaseNumber: ReleaseBranchNumber | null;
    for (let i = 0; i < commit.branches.length; i++) {
      const branchName = commit.branches[i];
      if ((releaseNumber = this.tryParseReleaseBranchNumber(branchName))) {
        return releaseNumber;
      }
    }

    return null;
  }

  private tryParseReleaseBranchNumber(branchName: string): ReleaseBranchNumber | null {
    const releaseBranchRegex = new RegExp(`^${this.fullReleaseBranchPrefix}(.*)$`);
    const match = releaseBranchRegex.exec(branchName);
    if (!match) {
      return null;
    }
    const [, releaseBranchSegment] = match;
    const releaseBranchNumber = this.strategy.tryParseReleaseBranchNumber(releaseBranchSegment);
    return releaseBranchNumber;
  }

  private async getVersionSourceFromReleaseBranch(releaseBranchNumber: ReleaseBranchNumber): Promise<VersionSource> {
    const releaseBranch = await this.gitUtils.getReleaseBranch(
      `${this.fullReleaseBranchPrefix}${releaseBranchNumber.toString()}`
    );
    if (!releaseBranch) {
      throw new BoneheadedError(`Unable to find release branch '${releaseBranchNumber}`);
    }

    let versionSource = await this.gitUtils.getHighestTaggedVersion(releaseBranch);
    if (!versionSource) {
      this.log.debug(`No release version tags found on branch ${releaseBranch.name}`);
      versionSource = new ReleaseBranchVersionSource(
        releaseBranch.initialCommit,
        releaseBranch.name,
        releaseBranch.number.version
      );
    }

    return versionSource;
  }

  private async getVersionSourceFromNonReleaseBranch(sha: string): Promise<VersionSource> {
    const lrb = await this.gitUtils.tryGetHighestReachableReleaseBranch(sha);

    let versionSource: VersionSource | null = null;
    if (lrb) {
      this.log.debug(`Highest reachable release branch is '${lrb.name}'`);
      versionSource = new ReleaseBranchVersionSource(lrb.initialCommit, lrb.name, lrb.number.version);
    } else {
      const trunkBranchName = this.opts.useOriginBranches
        ? `origin/${this.opts.trunkBranchName}`
        : this.opts.trunkBranchName;
      this.log.debug(`No reachable release branch found from ${sha}, using ${trunkBranchName}`);
      const initialCommit = await this.git.getInitialCommit();
      const trunk: Branch = { name: trunkBranchName, initialCommit };
      versionSource = await this.gitUtils.getHighestTaggedVersion(trunk);
      if (!versionSource) {
        this.log.debug(`No release version tags found on branch ${trunk.name}`);
        versionSource = new InitialCommitVersionSource(trunk.initialCommit);
      }
    }

    return versionSource;
  }

  private sanitizeForPreReleaseLabel(branchName: string): string {
    // See https://semver.org/#spec-item-9

    //  Identifiers MUST comprise only ASCII alphanumerics and hyphen
    const sanitizedLabel = branchName.replace(/[^0-9A-Za-z-.]/g, '-');

    // ... a series of dot separated identifiers ...
    const identifier = sanitizedLabel
      .split('.')
      .filter((id) => {
        //  Identifiers MUST NOT be empty
        return id.length > 0;
      })
      .map((id) => {
        // Numeric identifiers MUST NOT include leading zeroes.
        const numVal = Number(id);
        return isNaN(numVal) ? id : numVal.toString();
      })
      .join('.');
    return identifier;
  }

  private getNextVersion(buildType: BuildType, versionSource: VersionSource, isReleaseBranchTarget: boolean): Version {
    let version: Version;

    const baseVersion = this.strategy.getBaseVersion();
    this.log.debug(`Base release number: '${baseVersion}'`);

    switch (buildType) {
      case BuildType.Alpha:
        // We won't increment if baseVersion overrides the version source
        version = this.incrementNonReleaseBranch(versionSource, baseVersion);
        break;

      case BuildType.Beta:
        version = this.incrementReleaseBranch(versionSource, baseVersion);
        break;

      case BuildType.WorkingBranch:
        version = this.incrementNonReleaseBranch(versionSource, baseVersion);
        break;

      case BuildType.PullRequest:
        // For PR builds, the caller of this function has determined whether the PR is targeting a release branch or a
        // non-release branch (working branch or trunk). This is indicated by the isReleaseBranchTarget parameter
        if (isReleaseBranchTarget) {
          version = this.incrementReleaseBranch(versionSource, baseVersion);
        } else {
          version = this.incrementNonReleaseBranch(versionSource, baseVersion);
        }
        break;

      case BuildType.Release:
        version = versionSource.version;
        break;

      default:
        throw new BoneheadedError(`Build type '${buildType} not implemented`);
    }

    return version;
  }

  /**
   * Increments the version for a release branch.
   *
   * @private
   * @param {VersionSource} versionSource The version source on which to base the incremented version.
   * @returns {Version} The next version number to use.
   * @memberof BuildVersionCalculator
   */
  private incrementReleaseBranch(versionSource: VersionSource, baseVersion: Version): Version {
    this.log.info(`Using version source from ${versionSource.toString()}`);

    // If version source is a tag on a release branch then that minor number has already
    // been released, we need to increment. If version source is not a tag then there have
    // been no previous releases from this branch so we use the default branch version.
    // NOTE: We never override with baseVersion on a release branch (beta / release build) -
    //       the baseVersion parameter is only there so we can emit a warning.
    let version: Version;
    if (versionSource instanceof TagVersionSource) {
      version = this.strategy.nextPatchVersion(versionSource.version);
    } else {
      version = versionSource.version;
    }

    if (versionSource.version.compare(baseVersion) < 0) {
      this.log.warn(`Release version ${version.toString()} overrides higher base version ${baseVersion.toString()}`);
    }
    return version;
  }

  /**
   * Increments the version for a non-release branch (e.g. feature branch, trunk).
   *
   * @private
   * @param {Version} baseVersion The base version specified in an options file.
   * @param {VersionSource} versionSource The version source on which to base the incremented version.
   * @returns {Version} The next version number to use.
   * @memberof BuildVersionCalculator
   */
  private incrementNonReleaseBranch(versionSource: VersionSource, baseVersion: Version): Version {
    let version: Version;

    if (versionSource.version.compare(baseVersion) < 0) {
      version = baseVersion;
      this.log.info(
        `Version source from ${versionSource.toString()}) is behind base version ${baseVersion.toString()}`
      );
    } else {
      this.log.info(`Using version source from ${versionSource.toString()}`);
      if (versionSource instanceof ReleaseBranchVersionSource) {
        // We found a release branch, so we want to increment the primary number for the next
        // release
        version = this.strategy.nextPrimaryVersion(versionSource.version);
      } else {
        // No release branches found, so we don't want to increment
        version = versionSource.version;
      }
    }
    return version;
  }
}
