// eslint-disable-next-line import/no-extraneous-dependencies
import { BoneheadedError } from './Errors';
import { Moment } from 'moment';

export default class BuildVersionInfo {
  constructor(
    public readonly major: number,
    public readonly minor: number,
    public readonly patch: number,
    public readonly preReleaseLabel: string | null,
    public readonly sha: string,
    public readonly buildType: string,
    public readonly branchName: string,
    public readonly commitDate: Moment,
    public readonly commitsSinceVersionSource: number,
    public readonly versionSourceSha: string
  ) {
    if (!sha.match(/^[0-9a-f]{40}$/)) {
      throw new BoneheadedError('Invalid Git hash');
    }
    if (!versionSourceSha.match(/^[0-9a-f]{40}$/)) {
      throw new BoneheadedError('Invalid Git hash');
    }
  }

  public get majorMinor(): string {
    return `${this.major}.${this.minor}`;
  }

  public get majorMinorPatch(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }

  public get shortSha(): string {
    return this.sha.substring(0, 7);
  }

  public get semVer(): string {
    let semVer = this.majorMinorPatch;
    if (this.buildType !== 'release') {
      semVer += `-${this.preReleaseLabel}.${this.commitsSinceVersionSource}`;
    }
    return semVer;
  }

  public toJSON(): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clone: any = Object.assign({}, this);

    // Find the getter method descriptors
    // Get methods are on the prototype, not the instance
    const descriptors = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(this));

    //Check to see if each descriptior is a get method
    Object.keys(descriptors).forEach((key) => {
      if (descriptors[key] && descriptors[key].get) {
        // Copy the result of each getter method onto the clone as a field
        delete clone[key];
        clone[key] = this[<keyof BuildVersionInfo>key]; //Call the getter
      }
    });

    // Remove any left over private fields starting with '_'
    Object.keys(clone).forEach((key) => {
      if (key.indexOf('_') == 0) {
        delete clone[key];
      }
    });

    // toJSON requires that we return an object
    return clone;
  }
}
