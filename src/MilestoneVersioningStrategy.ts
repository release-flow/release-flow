import { GitCommitInfo } from './GitPrimitives';
import ReleaseBranch, { ReleaseBranchNumber } from './ReleaseBranch';
import { MilestoneOptions } from './BuildCalculationOptions';
import { BoneheadedError } from './Errors';
import { Logger } from './Logger';
import { VersionSource, TagVersionSource } from './VersionSource';
import VersioningStrategy from './VersioningStrategy';
import Version from './Version';

export class MilestoneTagVersionSource extends TagVersionSource {
  static releaseVersionRegex = /^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:\.(0|[1-9][0-9]*))?$/;

  /**
   * @constructor
   */
  constructor(
    commit: GitCommitInfo,
    public readonly prefix: string,
    public readonly milestone: number,
    public readonly patch: number
  ) {
    super(commit);
  }

  public get version(): Version {
    return new Version(this.milestone, this.patch, 0);
  }

  public toString(): string {
    return `release tag 'v${this.milestone}.${this.patch}', version = ${this.version.toString()}`;
  }

  public static tryParseVersionSourceFromTag(
    tag: string,
    commitInfo: GitCommitInfo,
    prefix: string
  ): MilestoneTagVersionSource | null {
    const match = MilestoneTagVersionSource.releaseVersionRegex.exec(tag);
    if (!match) {
      return null;
    }

    const [, milestone, patch] = match;
    return new MilestoneTagVersionSource(commitInfo, prefix, Number(milestone), Number(patch));
  }
}

export class MilestoneReleaseBranchNumber extends ReleaseBranchNumber {
  /**
   * @constructor
   */
  constructor(public readonly prefix: string, public readonly milestone: number) {
    super();
  }

  public compare(other: ReleaseBranchNumber): number {
    if (!(other instanceof MilestoneReleaseBranchNumber)) {
      throw new BoneheadedError('Invalid type passed to compare');
    }

    return this.milestone - other.milestone;
  }

  public toString(): string {
    return `${this.prefix}${this.milestone}`;
  }

  public get version(): Version {
    return new Version(this.milestone, 0, 0);
  }
}

export class MilestoneReleaseBranch extends ReleaseBranch {
  /**
   * @constructor
   */
  constructor(
    public readonly name: string,
    public readonly initialCommit: GitCommitInfo,
    public readonly number: MilestoneReleaseBranchNumber
  ) {
    super();
  }
}

export default class MilestoneVersioningStrategy extends VersioningStrategy {
  readonly _releaseBranchNumberRegex: RegExp;

  /**
   * @constructor
   */
  constructor(private readonly log: Logger, private readonly opts: MilestoneOptions) {
    super();

    if (this.opts.prefix !== '' && !this.opts.prefix) {
      this.opts.prefix = 'R';
    }

    this._releaseBranchNumberRegex = new RegExp(`^${this.opts.prefix}([1-9][0-9]*)$`);
    this.log.debug(`_releaseBranchNumberRegex = '${this._releaseBranchNumberRegex}'`);
  }

  public createReleaseBranch(
    name: string,
    forkPoint: GitCommitInfo,
    number: MilestoneReleaseBranchNumber
  ): ReleaseBranch {
    return new MilestoneReleaseBranch(name, forkPoint, number);
  }

  public get releaseBranchNumberRegex(): RegExp {
    return this._releaseBranchNumberRegex;
  }

  public get releaseVersionRegex(): RegExp {
    return /^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
  }

  public tryParseReleaseBranchNumber(value: string): MilestoneReleaseBranchNumber | null {
    const match = this._releaseBranchNumberRegex.exec(value);
    if (!match) {
      return null;
    }
    const [, n] = match;
    const number = Number(n);
    if (Number.isNaN(number)) {
      return null;
    }
    return new MilestoneReleaseBranchNumber(this.opts.prefix, number);
  }

  public tryParseVersionSourceFromTag(tag: string, commitInfo: GitCommitInfo): MilestoneTagVersionSource | null {
    return MilestoneTagVersionSource.tryParseVersionSourceFromTag(tag, commitInfo, this.opts.prefix);
  }

  public compareVersionTags(left: VersionSource, right: VersionSource): number {
    if (!(left instanceof MilestoneTagVersionSource)) {
      throw new BoneheadedError('Incorrect ReleaseTag type (left)');
    }
    if (!(right instanceof MilestoneTagVersionSource)) {
      throw new BoneheadedError('Incorrect ReleaseTag type (right)');
    }

    return left.compare(right);
  }

  public nextPrimaryVersion(sourceVersion: Version): Version {
    return new Version(sourceVersion.major + 1, 0, 0);
  }

  public nextPatchVersion(sourceVersion: Version): Version {
    return new Version(sourceVersion.major, sourceVersion.minor + 1, 0);
  }

  public getBaseVersion(): Version {
    return new Version(this.opts.baseNumber, 0, 0);
  }
}
