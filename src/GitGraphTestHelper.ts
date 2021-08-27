import { GitgraphUserApi, BranchUserApi, GitgraphCore, GitgraphBranchOptions } from '@gitgraph/core';
import { ImportMock, MockManager } from 'ts-mock-imports';
import * as gitPrimitivesModule from './GitPrimitives';
import FakeGitPrimitives from './tests/FakeGitPrimitives';
import { GitCommitInfo } from './GitPrimitives';

/**
 * NOTE
 * In case you're wondering why this file isn't in the ./test directory like all the other
 * test-only files, it's because of the way that ts-mock-imports works. Specifically, its
 * requirement that "Both the source file and test file need to use the same path to import
 * the mocked module." If we move this file into ,/test, it will mean that it needs to import
 * ../GitPrimitives rather than ./GitPrimitives.
 * See https://github.com/EmandM/ts-mock-imports
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalAny: any = global;
globalAny.window = {
  setTimeout,
  clearTimeout,
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = (): void => {};

export default class GitGraphTestHelper {
  public readonly graph: GitgraphCore;
  public readonly git: FakeGitPrimitives;
  public readonly gitApi: GitgraphUserApi<SVGElement>;
  readonly mockGit: MockManager<gitPrimitivesModule.GitPrimitives>;

  /**
   * @constructor
   */
  constructor() {
    this.graph = new GitgraphCore();
    this.git = new FakeGitPrimitives(this.graph);
    this.gitApi = new GitgraphUserApi(this.graph, noop);
    this.mockGit = ImportMock.mockClass(gitPrimitivesModule, 'GitPrimitives');

    let stub = this.mockGit.mock('listBranches', this.git.listBranches);
    stub.callsFake(() => this.git.listBranches());
    stub = this.mockGit.mock('getCommit', this.git.getCommit);
    stub.callsFake((...args) => this.git.getCommit(args[0], args[1]));
    stub = this.mockGit.mock('getForkPoint', this.git.getForkPoint);
    stub.callsFake((...args) => this.git.getForkPoint(args[0], args[1]));
    stub = this.mockGit.mock('countCommits', this.git.countCommits);
    stub.callsFake((...args) => this.git.countCommits(args[0], args[1]));
    stub = this.mockGit.mock('isAncestor', this.git.isAncestor);
    stub.callsFake((...args) => this.git.isAncestor(args[0], args[1]));
    stub = this.mockGit.mock('getTaggedCommitsOnBranch', this.git.getTaggedCommitsOnBranch);
    stub.callsFake((...args) => this.git.getTaggedCommitsOnBranch(args[0]));
    stub = this.mockGit.mock('getInitialCommit', this.git.getInitialCommit);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    stub.callsFake((..._args) => this.git.getInitialCommit());
  }

  public cleanup(): void {
    this.mockGit.restore();
    this.gitApi.clear();
  }

  public checkout(branch: BranchUserApi<SVGElement>): Promise<GitCommitInfo> {
    branch.checkout();
    return this.getCommitFromRef(branch.name);
  }

  public getCommitFromRef(ref: string): Promise<GitCommitInfo> {
    const hash = this.graph.refs.getCommit(ref);
    if (!hash) {
      throw new Error(`Ref '${ref}' not found`);
    }
    return this.git.getCommit(hash);
  }

  /**
   * Creates a branch, working around the problem (bug) in gitgraph that no ref is created
   * until a commit is made on a branch.
   * @param branch The branch from which to create the new branch.
   * @param name The name of the new branch.
   * @returns The user API for the new branch.
   */
  public createBranch(branch: BranchUserApi<SVGElement>, name: string): BranchUserApi<SVGElement> {
    const options: GitgraphBranchOptions<SVGElement> = {
      from: branch,
      name: name,
    };
    const b = this.graph.createBranch(options);
    if (b.parentCommitHash) {
      this.graph.refs.set(b.name, b.parentCommitHash);
    }
    return b.getUserApi();
  }

  /**
   * Creates a PR ref ready to merge.
   */
  public createPR(targetBranch: BranchUserApi<SVGElement>, prNum: number): BranchUserApi<SVGElement> {
    // const hash = this.graph.refs.getCommit(targetBranch.name);
    // if (!hash) {
    //   throw new Error(`Ref '${targetBranch.name}' not found`);
    // }
    // this.graph.refs.set(`pull/${prNum}/merge`, hash);
    return targetBranch.branch(`pull/${prNum}/merge`);
  }

  public createBasicSemVerGraph(trunkBranchName = 'master'): BranchUserApi<SVGElement> {
    this.gitApi.clear();
    const trunk = this.gitApi.branch(trunkBranchName);
    trunk.commit('Set up the project');

    const feature1 = this.gitApi.branch('feature/typescript');
    feature1.commit('Add TypeScript');
    trunk.merge(feature1);

    const bugfix1 = trunk.branch('bugfix/fix-it1');
    bugfix1.commit('Make it work').commit('Make it right').commit('Make it fast');

    trunk.merge(bugfix1);

    const release1 = trunk.branch('release/1.0');

    release1.commit('Release 1.0.0').tag('v1.0.0');
    release1.commit('Release 1.0 patch 1').tag('v1.0.1');

    trunk.commit('fix');
    const feature2 = trunk.branch('feature/feature2');
    feature2.commit('Add Golang');

    trunk.merge(feature2);
    trunk.commit('Another commit');

    return trunk;
  }

  createBasicMilestoneGraph(trunkBranchName = 'master'): BranchUserApi<SVGElement> {
    this.gitApi.clear();
    const trunk = this.gitApi.branch(trunkBranchName);
    trunk.commit('Set up the project');

    const feature1 = trunk.branch('feature/typescript');
    feature1.commit('Add TypeScript');
    trunk.merge(feature1);

    const bugfix1 = trunk.branch('bugfix/fix-it1');
    bugfix1.commit('Make it work').commit('Make it right').commit('Make it fast');

    trunk.merge(bugfix1);

    const release1 = trunk.branch('release/R1');

    release1.commit('Release 1.0.0').tag('v1.0.0');
    release1.commit('Release 1.0 patch 1').tag('v1.0.1');

    trunk.commit('fix');
    const feature2 = trunk.branch('feature/feature2');
    feature2.commit('Add Golang').commit('add another');

    trunk.merge(feature2);
    trunk.commit('Another commit');

    return trunk;
  }

  createGraphWithNoReleases(trunkBranchName = 'master'): BranchUserApi<SVGElement> {
    this.gitApi.clear();
    const trunk = this.gitApi.branch(trunkBranchName);
    trunk.commit('Set up the project');

    const feature1 = trunk.branch('feature/typescript');
    feature1.commit('Add TypeScript');
    trunk.merge(feature1);

    const bugfix1 = trunk.branch('bugfix/fix-it1');
    bugfix1.commit('Make it work').commit('Make it right').commit('Make it fast');

    trunk.merge(bugfix1);
    trunk.commit('fix');
    const feature2 = trunk.branch('feature/feature2');
    feature2.commit('Add Golang').commit('add another');

    trunk.merge(feature2);
    trunk.commit('Another commit');

    return trunk;
  }
}
