import VersioningStrategy from './VersioningStrategy';
import { BoneheadedError } from './Errors';
import { Logger } from './Logger';
import { VersionSource, TagVersionSource } from './VersionSource';
import { SemVerOptions } from './BuildCalculationOptions';
import { GitCommitInfo } from './GitPrimitives';
import ReleaseBranch, { ReleaseBranchNumber } from './ReleaseBranch';
import Version from './Version';

export class SemVerTagVersionSource extends TagVersionSource {
  static releaseVersionRegex = /^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;

  /**
   * @constructor
   */
  constructor(
    commit: GitCommitInfo,
    public readonly major: number,
    public readonly minor: number,
    public readonly patch: number
  ) {
    super(commit);
  }

  public get version(): Version {
    return new Version(this.major, this.minor, this.patch);
  }

  public toString(): string {
    return `release tag 'v${this.major}.${this.minor}.${this.patch}', version = ${this.version.toString()}`;
  }

  public static tryParseVersionSourceFromTag(tag: string, commitInfo: GitCommitInfo): SemVerTagVersionSource | null {
    const match = SemVerTagVersionSource.releaseVersionRegex.exec(tag);
    if (!match) {
      return null;
    }

    const [, major, minor, patch] = match;
    return new SemVerTagVersionSource(commitInfo, Number(major), Number(minor), Number(patch));
  }
}

export class SemVerReleaseBranchNumber extends ReleaseBranchNumber {
  /**
   *
   */
  constructor(public readonly major: number, public readonly minor: number) {
    super();
  }

  public compare(other: ReleaseBranchNumber): number {
    if (!(other instanceof SemVerReleaseBranchNumber)) {
      throw new BoneheadedError('Invalid type passed to compare');
    }
    return this.major === other.major ? this.minor - other.minor : this.major - other.major;
  }

  public toString(): string {
    return `${this.major}.${this.minor}`;
  }

  public get version(): Version {
    return new Version(this.major, this.minor, 0);
  }
}

export class SemVerReleaseBranch extends ReleaseBranch {
  /**
   * @constructor
   */
  constructor(
    public readonly name: string,
    public readonly initialCommit: GitCommitInfo,
    public readonly number: SemVerReleaseBranchNumber
  ) {
    super();
  }
}

export default class SemVerVersioningStrategy extends VersioningStrategy {
  /**
   * @constructor
   */
  constructor(private readonly log: Logger, private readonly opts: SemVerOptions) {
    super();
  }

  public createReleaseBranch(name: string, forkPoint: GitCommitInfo, number: SemVerReleaseBranchNumber): ReleaseBranch {
    return new SemVerReleaseBranch(name, forkPoint, number);
  }

  public getBaseVersion(): Version {
    const releaseNumber = this.tryParseReleaseBranchNumber(this.opts.baseNumber);
    if (releaseNumber === null) {
      throw new BoneheadedError(`Invalid baseNumber '${this.opts.baseNumber}' in options`);
    }

    return new Version(releaseNumber.major, releaseNumber.minor, 0);
  }

  public tryParseVersionSourceFromTag(tag: string, commitInfo: GitCommitInfo): SemVerTagVersionSource | null {
    const match = this.releaseVersionRegex.exec(tag);
    if (!match) {
      return null;
    }

    const [, major, minor, patch] = match;
    return new SemVerTagVersionSource(commitInfo, Number(major), Number(minor), Number(patch));
  }

  // eslint-disable-next-line class-methods-use-this
  public tryParseReleaseBranchNumber(value: string): SemVerReleaseBranchNumber | null {
    const match = this.releaseBranchNumberRegex.exec(value);
    if (!match) {
      return null;
    }
    const [, majorText, minorText] = match;
    const major = Number(majorText);
    const minor = minorText === undefined ? 0 : Number(minorText);
    return new SemVerReleaseBranchNumber(major, minor);
  }

  public compareVersionTags(left: VersionSource, right: VersionSource): number {
    if (!(left instanceof SemVerTagVersionSource)) {
      throw new BoneheadedError('Incorrect ReleaseTag type (left)');
    }
    if (!(right instanceof SemVerTagVersionSource)) {
      throw new BoneheadedError('Incorrect ReleaseTag type (right)');
    }

    return left.compare(right);
  }

  public nextPrimaryVersion(sourceVersion: Version): Version {
    return new Version(sourceVersion.major, sourceVersion.minor + 1, 0);
  }

  public nextPatchVersion(sourceVersion: Version): Version {
    return new Version(sourceVersion.major, sourceVersion.minor, sourceVersion.patch + 1);
  }

  public get releaseBranchNumberRegex(): RegExp {
    return /^(0|[1-9][0-9]*)(?:\.(0|[1-9][0-9]*))?$/;
  }

  public get releaseVersionRegex(): RegExp {
    return /^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
  }
}
