// eslint-disable-next-line max-classes-per-file
import moment from 'moment';
import { Commit, GitgraphCore } from '@gitgraph/core';
import { BoneheadedError } from '../Errors';
import { GitCommitInfo } from '../GitPrimitives';
import wu from 'wu';
import { Branch } from '../ReleaseBranch';

export default class FakeGitPrimitives {
  seedTime: number;

  /**
   * @constructor
   */
  constructor(private gitgraph: GitgraphCore) {
    this.seedTime = 1581068232;
  }

  public listBranches(): Promise<string[]> {
    const branches = wu(this.gitgraph.branches.entries())
      .map((b) => `${b[1].name}`)
      .toArray();
    return Promise.resolve(branches);
  }

  public async getCommit(ref: string, mergeParent = 0): Promise<GitCommitInfo> {
    let commit = this.findCommitFromRef(ref);
    if (!commit) {
      throw new BoneheadedError(`Ref '${ref}' not found`);
    }

    console.log(`Checking commit ${ref} mergeParent ${mergeParent}`);

    if (mergeParent > 0) {
      if (commit.parents?.length < mergeParent) {
        throw new BoneheadedError(`Expected at least ${mergeParent} parents, actually ${commit.parents?.length}`);
      }

      const parentHash = commit.parents[mergeParent - 1];
      commit = this.findCommitFromRef(parentHash);
      if (!commit) {
        throw new BoneheadedError(`Parent ${mergeParent} with hash ${parentHash} not found`);
      }
    }

    return Promise.resolve(this.getGitCommitInfo(commit));
  }

  public getForkPoint(ref1: string, ref2: string): Promise<GitCommitInfo> {
    // Lowest common ancestor algorithm, see https://en.wikipedia.org/wiki/Lowest_common_ancestor
    const ref1Commit = this.findCommitFromRef(ref1);
    const ref2Commit = this.findCommitFromRef(ref2);
    if (!ref1Commit) {
      throw new BoneheadedError(`Ref '${ref1}' not found`);
    }
    if (!ref2Commit) {
      throw new BoneheadedError(`Ref '${ref2}' not found`);
    }
    const ref1Parents = this.getParents(ref1Commit);
    const ref2Parents = this.getParents(ref2Commit);

    if (ref1Parents[0] !== ref2Parents[0]) {
      throw new BoneheadedError(`No common ancestor between ${ref1} and ${ref2}`);
    }

    let ancestor = ref1Parents[0];
    for (let i = 0; i < ref1Parents.length && i < ref2Parents.length; i++) {
      if (ref1Parents[i].hash !== ref2Parents[i].hash) {
        ancestor = ref1Parents[i - 1];
        break;
      }
      if (i === ref1Parents.length - 1 || i === ref2Parents.length - 1) {
        // Both on same branch, but one ref an ancestor of the other
        ancestor = ref1Parents[i];
        break;
      }
    }

    return Promise.resolve(this.getGitCommitInfo(ancestor));
  }

  public isAncestor(ancestor: string, descendant: string): Promise<boolean> {
    const ancestorCommit = this.findCommitFromRef(ancestor);
    const descendantCommit = this.findCommitFromRef(descendant);
    if (!ancestorCommit) {
      throw new BoneheadedError(`Ref '${ancestor}' not found`);
    }
    if (!descendantCommit) {
      throw new BoneheadedError(`Ref '${descendant}' not found`);
    }

    const descendantParents = this.getParents(descendantCommit);

    const found = descendantParents.find((c) => c.hash === ancestorCommit.hash) !== undefined;
    return Promise.resolve(found);
  }

  public countCommits(startRef: string, endRef: string): Promise<number> {
    const startRefCommit = this.findCommitFromRef(startRef);
    const endRefCommit = this.findCommitFromRef(endRef);
    if (!startRefCommit) {
      throw new BoneheadedError(`Ref '${startRef}' not found`);
    }
    if (!endRefCommit) {
      throw new BoneheadedError(`Ref '${endRef}' not found`);
    }

    const ancestry = this.getParents(startRefCommit).reverse();
    let count = NaN;
    for (let i = 0; i < ancestry.length; i++) {
      const element = ancestry[i];
      if (element.hash == endRefCommit.hash) {
        count = i;
        break;
      }
    }

    if (Number.isNaN(count)) {
      throw new BoneheadedError(`'${endRef}' is not an ancestor of '${startRef}'`);
    }

    return Promise.resolve(count);
  }

  public getTaggedCommitsOnBranch(branch: Branch): Promise<GitCommitInfo[]> {
    const branchHeadCommit = this.findCommitFromRef(branch.name);
    const originCommit = this.findCommitFromRef(branch.initialCommit.sha);
    if (!branchHeadCommit) {
      throw new BoneheadedError(`Ref '${branch.name}' not found`);
    }
    if (!originCommit) {
      throw new BoneheadedError(`Ref '${branch.initialCommit.sha}' not found`);
    }

    const commits: GitCommitInfo[] = [];

    const ancestry = this.getParents(branchHeadCommit).reverse();
    for (let i = 0; i < ancestry.length; i++) {
      const commit = ancestry[i];

      const tags = this.gitgraph.tags.getNames(commit.hash);

      if (tags.length) {
        const commitInfo = this.getGitCommitInfo(commit);
        commits.push(commitInfo);
      }
      if (commit.hash == originCommit.hash) {
        break;
      }
    }

    return Promise.resolve(commits);
  }

  public getInitialCommit(): Promise<GitCommitInfo> {
    const firstCommit = this.gitgraph.commits[0];
    return Promise.resolve(this.getGitCommitInfo(firstCommit));
  }

  private findCommitFromRef(ref: string): Commit | null {
    let hash = this.findCommitHashFromRef(ref);

    if (!hash) {
      hash = ref;
    }

    return this.gitgraph.commits.find((c) => c.hash === hash) || null;
  }

  private findCommitFromHash(hash: string): Commit | undefined {
    return this.gitgraph.commits.find((c) => c.hash === hash);
  }

  private findCommitHashFromRef(ref: string): string | undefined {
    let r = ref;
    if (r.startsWith('origin/')) {
      r = r.substring('origin/'.length);
    }
    return this.gitgraph.refs.getCommit(r);
  }

  private getParents(commit: Commit): Commit[] {
    let c = commit;
    const parents: Commit[] = [commit];
    while (c.parents.length > 0) {
      const x = c.parents[0];
      const parent: Commit | undefined = this.findCommitFromHash(x);
      if (!parent) {
        throw new BoneheadedError(`Parent hash '${x}' not found`);
      }
      parents.unshift(parent);
      c = parent;
    }
    return parents;
  }

  private getGitCommitInfo(commit: Commit): GitCommitInfo {
    let refs = this.gitgraph.refs.getNames(commit.hash);
    refs = refs.map((c) => (c.startsWith('origin/') ? c.substring('origin/'.length) : c));
    const tags = this.gitgraph.tags.getNames(commit.hash);
    const info: GitCommitInfo = {
      sha: commit.hash,
      branches: refs.filter((r) => r !== 'HEAD'),
      date: moment(commit.committer.timestamp, 'x'),
      isHead: refs.indexOf('HEAD') > 0,
      isDetachedHead: false,
      tags,
    };

    return info;
  }
}
