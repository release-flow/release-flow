export default class Version {
  /**
   * @constructor
   */
  constructor(public readonly major: number, public readonly minor: number, public readonly patch: number) {}

  public compare(other: Version): number {
    if (this.major != other.major) {
      return this.major - other.major;
    }
    if (this.minor != other.minor) {
      return this.minor - other.minor;
    }
    return this.patch - other.patch;
  }

  public toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }
}
