import { GitCommitInfo } from './GitPrimitives';
import Version from './Version';

export abstract class ReleaseBranchNumber {
  public abstract compare(other: ReleaseBranchNumber): number;
  public abstract toString(): string;
  public abstract get version(): Version;
}

export interface Branch {
  /**
   * The branch name.
   *
   * @type {string}
   * @memberof Branch
   */
  readonly name: string;
  /**
   * The initial commit on the branch - this is the fork point between the current
   * instance and its parent (the commit is on both branches' history).
   *
   * @type {GitCommitInfo}
   * @memberof Branch
   */
  readonly initialCommit: GitCommitInfo;
}

export default abstract class ReleaseBranch implements Branch {
  public abstract readonly name: string;
  public abstract readonly initialCommit: GitCommitInfo;
  public abstract readonly number: ReleaseBranchNumber;

  public compareWith(other: ReleaseBranch): number {
    return this.number.compare(other.number);
  }
}
