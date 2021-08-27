import moment, { Moment } from 'moment';

import { ExogeneousError, BoneheadedError } from './Errors';
import { Logger } from './Logger';

import GitRunner from './GitRunner';
import { Branch } from './ReleaseBranch';

export interface GitCommitInfo {
  sha: string;
  date: Moment;
  tags: string[];
  branches: string[];
  isHead: boolean;
  isDetachedHead: boolean;
}

export const NullGitCommitInfo: GitCommitInfo = {
  sha: '',
  date: moment(),
  tags: [],
  branches: [],
  isHead: false,
  isDetachedHead: false,
};
/**
 * A mockable abstraction of the Git-derived primitives we need for version calculation.
 *
 * @export
 * @class GitPrimitives
 */
export class GitPrimitives {
  git: GitRunner;

  // The _gitPrettyArg format below will result in lines in the form (line split for readability):
  // '01c3b44c08b3793dea4bedbdd802c9b2c24bd19f 2020-02-07T15:52:51+00:00 (HEAD -> main, tag: mytag, tag: myothertag)'
  commitParseRegex = /^'(?<sha>[0-9a-f]{40})\s(?<date>\d+)\s*(?:\((?<tags>.*)\))?'$/;

  gitPrettyArg = "--pretty='%H %ct %d'";

  /**
   * @constructor
   */
  constructor(private readonly log: Logger, private readonly useOriginBranches: boolean) {
    this.git = new GitRunner(log);
  }

  /**
   * Lists local and remote branch names.
   *
   * @returns {Promise<string[]>}
   * @memberof GitPrimitives
   */
  public async listBranches(): Promise<string[]> {
    const args = ['branch', '--all', '--no-color'];
    const res = await this.git.execCommand(args);
    if (res.code) {
      throw new ExogeneousError(`Error calling 'git branch': ${res.stderr}`);
    }

    const lines = res.stdout.split('\n');
    const branches: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      let branch = lines[i].trim();

      // The current branch is indicated with a leading asterisk, which we remove
      if (branch[0] === '*') {
        branch = branch.substring(2);
      }

      const originPrefix = this.useOriginBranches ? 'remotes/origin/' : '';
      if (branch.length > 0 && !branch.startsWith(`${originPrefix}HEAD`)) {
        branches.push(branch);
      }
    }

    return branches;
  }

  /**
   * Returns a value indicating whether A is an ancestor of B.
   *
   * @param {string} ancestor The ref (commit hash or other ref) that might be an ancestor.
   * @param {string} descendant The ref (commit hash or other ref) that might be a descendant.
   * @returns {Promise<boolean>}
   * @memberof GitPrimitives
   */
  public async isAncestor(ancestor: string, descendant: string): Promise<boolean> {
    const args = ['merge-base', '--is-ancestor', ancestor, descendant];
    const res = await this.git.execCommand(args);
    return res.code === 0;
  }

  /**
   * Returns the number of commits between two refs.
   *
   * @param {string} startRef
   * @param {string} [endRef]
   * @returns {Promise<number>}
   * @memberof GitPrimitives
   */
  public async countCommits(startRef: string, endRef: string): Promise<number> {
    const args = ['rev-list', '--count', startRef, `^${endRef}`];

    const res = await this.git.execCommand(args);
    if (res.code) {
      throw new ExogeneousError(`Error calling 'git rev-list': ${res.stderr}`);
    }

    const value = Number(res.stdout.trim());
    if (Number.isNaN(value)) {
      throw new BoneheadedError(`Error parsing response from 'git rev-list': ${res.stdout}`);
    }

    return value;
  }

  /**
   * Gets the commit information about a specific ref.
   *
   * @param {string} ref The ref-spec about which to show information.
   * @returns {(Promise<GitCommitInfo>)}
   * @memberof GitPrimitives
   */
  public async getCommit(ref: string, mergeParent = 0): Promise<GitCommitInfo> {
    this.log.debug(`Getting commit for ref '${ref}'`);

    if (mergeParent === 1) {
      ref = `${ref}^`;
    } else if (mergeParent > 1) {
      ref = `${ref}^${mergeParent}`;
    }
    const args = ['show', '--no-patch', '--no-notes', this.gitPrettyArg, ref];
    const res = await this.git.execCommand(args);
    if (res.code) {
      throw new ExogeneousError(`Error calling 'git show': ${res.stderr}`);
    }

    const info = this.parseGitLog(res.stdout.trim());

    if (info === null) {
      throw new BoneheadedError(`Unable to get commit information for ${ref}`);
    }

    return info;
  }

  /**
   * Returns commit information about an inclusive range of commits.
   *
   * @param {string} revRange A Git range specification.
   * @param {boolean} [taggedOnly=false]
   * @returns {Promise<Array<GitCommitInfo>>}
   * @memberof GitPrimitives
   */
  public async getCommitRange(revRange: string, taggedOnly = false): Promise<Array<GitCommitInfo>> {
    const args = ['log', '--no-patch', '--boundary', this.gitPrettyArg];
    if (taggedOnly) {
      args.push('--simplify-by-decoration');
    }

    args.push(revRange);
    const res = await this.git.execCommand(args);
    if (res.code) {
      throw new ExogeneousError(`Error calling 'git log': ${res.stderr}`);
    }

    const lines = res.stdout.split('\n');
    const logs: Array<GitCommitInfo> = [];

    for (let index = 0; index < lines.length; index++) {
      const message = lines[index];
      const info = this.parseGitLog(message);
      if (info) {
        logs.push(info);
      }
    }

    return logs;
  }

  /**
   * Gets the fork point on parent from which ref was branched.
   *
   * @param {string} ref The ref (commit hash or other ref) from which to locate the fork point.
   * @param {string} parent
   * @returns {Promise<string>}
   * @memberof GitPrimitives
   */
  public async getForkPoint(ref: string, parent: string): Promise<GitCommitInfo> {
    const args = ['merge-base', parent, ref];
    const res = await this.git.execCommand(args);
    if (res.code) {
      throw new ExogeneousError(`Error calling 'git log': ${res.stderr}`);
    }

    return this.getCommit(res.stdout.trim());
  }

  public async getInitialCommit(): Promise<GitCommitInfo> {
    const args = ['rev-list', '--max-parents=0', 'HEAD'];
    const res = await this.git.execCommand(args);
    if (res.code) {
      throw new ExogeneousError(`Error calling 'git log': ${res.stderr}`);
    }

    return this.getCommit(res.stdout.trim());
  }

  public async getTaggedCommitsOnBranch(branch: Branch): Promise<GitCommitInfo[]> {
    const revRange = `${branch.initialCommit.sha}..${branch.name}`;
    return this.getCommitRange(revRange, true);
  }

  public async getCurrentBranchName(): Promise<string | null> {
    const args = ['symbolic-ref', '-q', 'HEAD'];
    const res = await this.git.execCommand(args);

    switch (res.code) {
      case 0:
        return res.stdout.trim();

      case 1:
        // Detached head
        return null;

      default:
        throw new ExogeneousError(`Error calling 'git log': ${res.stderr}`);
    }
  }

  private parseGitLog(message: string): GitCommitInfo | null {
    const match = this.commitParseRegex.exec(message);
    if (match === null) {
      return null;
    }

    const [, sha, date, decorations] = match;
    const tags: string[] = [];
    const branches: string[] = [];
    let isHead = false;
    let isDetachedHead = false;

    if (decorations) {
      // Decorations include branches and tags. Multiple items are separated by a
      // comma followed by a space (', '). The comma+space is not allowed in branch
      // or tag names, so it's safe to split on this.
      // Decorations are in the following formats (without quotes):
      // 1) 'tag: mytag' - commit is tagged with mytag
      // 2) <trunk> - commit is the trunk branch
      // 3) 'HEAD -> feature/myfeature' - commit is the last commit in the feature/myfeature branch
      // 4) 'HEAD' - commit is a detached head (no current branch)
      // So decorations of (HEAD, main) means a detached head that happens also to be the
      // latest commit of the main branch, whereas (HEAD -> main) means that the commit
      // is the head of the main branch, which is currently checked out.
      const tagList = decorations?.split(', ');
      for (let index = 0; index < tagList?.length; index++) {
        const element = tagList[index];
        if (element.startsWith('tag: ')) {
          tags.push(element.substring(5));
        } else {
          const headBranch = /HEAD -> (.*)/.exec(element);
          if (headBranch) {
            isHead = true;
            branches.push(headBranch[1]);
          } else if (element === 'HEAD') {
            isHead = true;
            isDetachedHead = true;
          } else {
            branches.push(element);
          }
        }
      }
    }

    const m = moment(date, 'X');
    const info = {
      sha,
      date: m,
      tags,
      branches,
      isHead,
      isDetachedHead,
    };
    return info;
  }
}
