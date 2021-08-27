import ReleaseBranch, { ReleaseBranchNumber } from './ReleaseBranch';
import { GitCommitInfo } from './GitPrimitives';
import { VersionSource } from './VersionSource';
import Version from './Version';

export default abstract class VersioningStrategy {
  public abstract tryParseReleaseBranchNumber(value: string): ReleaseBranchNumber | null;

  public abstract tryParseVersionSourceFromTag(tag: string, commitInfo: GitCommitInfo): VersionSource | null;

  public abstract getBaseVersion(): Version;

  public abstract createReleaseBranch(
    name: string,
    forkPoint: GitCommitInfo,
    number: ReleaseBranchNumber
  ): ReleaseBranch;

  public abstract compareVersionTags(left: VersionSource, right: VersionSource): number;

  public abstract nextPrimaryVersion(sourceVersion: Version): Version;

  public abstract nextPatchVersion(sourceVersion: Version): Version;
}
