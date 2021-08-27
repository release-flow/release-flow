import Version from './Version';
import { GitCommitInfo } from './GitPrimitives';

export abstract class VersionSource {
  /**
   * @constructor
   */
  constructor(public readonly commit: GitCommitInfo) {}

  public abstract get version(): Version;

  public compare(other: VersionSource): number {
    return this.version.compare(other.version);
  }

  public abstract toString(): string;
}

export abstract class TagVersionSource extends VersionSource {}
