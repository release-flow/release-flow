import { Moment } from 'moment';

export default class SemanticVersionInfo {
  constructor(
    public readonly major: number,
    public readonly minor: number,
    public readonly patch: number,
    public readonly preReleaseLabel: string | null,
    public readonly preReleaseNumber: number,
    public readonly sha: string,
    public readonly branchName: string,
    public readonly commitDate: Moment,
    public readonly commitsSinceVersionSource: number
  ) {
    if (!sha.match(/^[0-9a-f]{40}$/)) {
      throw new Error('Invalid Git hash');
    }
  }

  public get preReleaseTag(): string {
    return `${this.preReleaseLabel}.${this.preReleaseNumber}`;
  }

  public get preReleaseTagWithDash(): string {
    return `-${this.preReleaseTag}`;
  }

  public get preReleaseNumberPadded(): string {
    return this.preReleaseNumber.toLocaleString('en', {
      minimumIntegerDigits: 4,
      useGrouping: false,
    });
  }

  public get fullBuildMetaData(): string {
    return `${this.commitsSinceVersionSource}.Branch.${this.branchName}.Sha.${this.sha}`;
  }

  public get majorMinorPatch(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }

  public get semVer(): string {
    return `${this.majorMinorPatch}${this.preReleaseTagWithDash}`;
  }

  public get legacySemVer(): string {
    return `${this.majorMinorPatch}-${this.preReleaseLabel}${this.preReleaseNumber}`;
  }

  public get legacySemVerPadded(): string {
    return `${this.majorMinorPatch}-${this.preReleaseLabel}${this.preReleaseNumberPadded}`;
  }

  public get assemblySemVer(): string {
    return `${this.major}.${this.minor}.0.0`;
  }

  public get assemblySemFileVer(): string {
    return `${this.major}.${this.minor}.${this.patch}.0`;
  }

  public get informationalVersion(): string {
    return `${this.majorMinorPatch}-${this.fullBuildMetaData}`;
  }

  public get shortSha(): string {
    return this.sha.substring(0, 7);
  }

  public get commitsSinceVersionSourcePadded(): string {
    return this.commitsSinceVersionSource.toLocaleString('en', {
      minimumIntegerDigits: 4,
      useGrouping: false,
    });
  }

  public get nuGetVersion(): string {
    return `${this.majorMinorPatch}-${this.nuGetPreReleaseTag}`;
  }

  public get nuGetPreReleaseTag(): string {
    return `${this.preReleaseLabel}${this.preReleaseNumberPadded}`;
  }
}
