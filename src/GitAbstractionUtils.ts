import { GitPrimitives, GitCommitInfo } from './GitPrimitives';
import VersioningStrategy from './VersioningStrategy';
import { Options } from './BuildCalculationOptions';
import { VersionSource } from './VersionSource';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Logger } from './Logger';
import ReleaseBranch, { Branch } from './ReleaseBranch';

/**
 * Git abstractions to enable unit testing of strategy logic.
 *
 * @export
 * @class GitAbstractionUtils
 */
export default class GitAbstractionUtils {
  readonly git: GitPrimitives;

  private releaseBranchCache: ReleaseBranch[] | null = null;

  constructor(
    private readonly log: Logger,
    private readonly strategy: VersioningStrategy,
    private readonly opts: Options
  ) {
    this.git = new GitPrimitives(log, this.opts.useOriginBranches);
  }

  public async getReleaseBranches(): Promise<ReleaseBranch[]> {
    if (this.releaseBranchCache) {
      return Promise.resolve(this.releaseBranchCache);
    }

    let allBranches = await this.git.listBranches();
    if (this.opts.useOriginBranches) {
      allBranches = allBranches.filter((b) => b.startsWith('remotes/')).map((b) => b.substring('remotes/'.length));
    }

    const originPrefix = this.opts.useOriginBranches ? 'origin/' : '';
    const releaseBranchPrefix = `${originPrefix}${this.opts.releaseBranchPrefix}`;
    this.log.debug(`Looking for branches with prefix ${releaseBranchPrefix}`);
    const branches = allBranches.filter((b) => b.startsWith(releaseBranchPrefix));

    this.log.debug('Release branches: <<<');
    branches.map((b) => this.log.debug(b));
    this.log.debug('<<<');

    const releaseBranches: ReleaseBranch[] = [];

    for (let i = 0; i < branches.length; i++) {
      const branch = branches[i];
      const releaseBranchName = branch.substring(releaseBranchPrefix.length);
      this.log.debug(`Attempting to parse branch '${releaseBranchName}' as release branch`);
      const releaseNumber = this.strategy.tryParseReleaseBranchNumber(releaseBranchName);
      if (releaseNumber === null) {
        // Unable to parse the release number - treat it as not a release branch
        this.log.warn(`Branch '${branch}' has an invalid release number`);
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const forkPoint = await this.git.getForkPoint(branch, `${originPrefix}${this.opts.trunkBranchName}`);

      if (forkPoint === null) {
        // Release branches must fork from trunk, ignore this one if it doesn't
        continue;
      }

      const releaseBranch = this.strategy.createReleaseBranch(branch, forkPoint, releaseNumber);
      releaseBranches.push(releaseBranch);
    }

    releaseBranches.sort((left: ReleaseBranch, right: ReleaseBranch): number => {
      return right.number.compare(left.number);
    });
    this.releaseBranchCache = releaseBranches;
    return releaseBranches;
  }

  public async getReleaseBranch(branchName: string): Promise<ReleaseBranch | null> {
    const branches = await this.getReleaseBranches();
    return branches.find((b) => b.name === branchName) || null;
  }

  public async tryGetHighestReachableReleaseBranch(ref: string): Promise<ReleaseBranch | null> {
    const releaseBranches = await this.getReleaseBranches();
    let reachable: ReleaseBranch | null = null;

    for (let i = 0; i < releaseBranches.length; i++) {
      const branch = releaseBranches[i];
      // eslint-disable-next-line no-await-in-loop
      const isAncestor = await this.git.isAncestor(branch.initialCommit.sha, ref);
      if (isAncestor) {
        reachable = branch;
        break;
      }
    }

    if (reachable === null) {
      this.log.debug(`No reachable release branches found from ${ref}`);
      return null;
    }

    return reachable;
  }

  public async getHighestTaggedVersion(branch: Branch): Promise<VersionSource | null> {
    const taggedCommits = await this.git.getTaggedCommitsOnBranch(branch);

    if (taggedCommits.length === 0) {
      return null;
    }
    const versionSources: VersionSource[] = [];
    taggedCommits.forEach((commitInfo) => {
      commitInfo.tags.forEach((tag) => {
        const releaseVersion = this.strategy.tryParseVersionSourceFromTag(tag, commitInfo);
        if (releaseVersion) {
          versionSources.push(releaseVersion);
        }
      });
    });

    versionSources.sort((a, b) => b.compare(a));
    return Promise.resolve(versionSources[0]);
  }

  public async getMergeParent(commit: GitCommitInfo, parent = 1): Promise<GitCommitInfo> {
    return await this.git.getCommit(commit.sha, parent);
  }
}
