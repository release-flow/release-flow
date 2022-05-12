import chai, { expect } from 'chai';
import chaiMoment from 'chai-moment';
chai.use(chaiMoment);

import SpyLogger from './tests/SpyLogger';
import { MilestoneOptions, SemVerOptions, Options, DefaultOptions } from './BuildCalculationOptions';
import BuildVersionCalculator from './BuildVersionCalculator';
import GitGraphTestHelper from './GitGraphTestHelper';

describe('BuildVersionCalculator tests', function () {
  const log = new SpyLogger();
  let testHelper: GitGraphTestHelper;
  let sut: BuildVersionCalculator;

  beforeEach('mock out dependencies', function () {
    log.clear();
    testHelper = new GitGraphTestHelper();
  });

  afterEach('restore dependencies', function () {
    testHelper.cleanup();
  });

  it('detects correct build from trunk with releases (milestone) @unit', async function () {
    const strategyOptions: MilestoneOptions = { kind: 'Milestone', prefix: 'R', baseNumber: 0 };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createBasicMilestoneGraph();
    const release2 = master.branch('release/R2');
    release2.commit('Cherry-pick fix').tag('v2.0.0');
    master.commit('Next commit 1');
    master.commit('Next commit 2');

    const commit = await testHelper.checkout(master);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/heads/master', undefined);
    expect(res).to.not.be.null;
    expect(res.major).to.equal(3);
    expect(res.minor).to.equal(0);
    expect(res.patch).to.equal(0);
    expect(res.preReleaseLabel).to.equal('alpha');
    expect(res.sha).to.equal(commit.sha);
    expect(res.buildType).to.equal('alpha');
    expect(res.branchName).to.equal('master');
    expect(res.commitDate).to.be.sameMoment(commit.date);
    expect(res.commitsSinceVersionSource).to.equal(2);
  });

  it('detects correct build from trunk with no releases (milestone) @unit', async function () {
    const strategyOptions: MilestoneOptions = { kind: 'Milestone', prefix: 'R', baseNumber: 0 };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createGraphWithNoReleases();
    const commit = await testHelper.checkout(master);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/heads/master', undefined);
    expect(res).to.not.be.null;
    expect(res.major).to.equal(0);
    expect(res.minor).to.equal(0);
    expect(res.patch).to.equal(0);
    expect(res.preReleaseLabel).to.equal('alpha');
    expect(res.sha).to.equal(commit.sha);
    expect(res.buildType).to.equal('alpha');
    expect(res.branchName).to.equal('master');
    expect(res.commitDate).to.be.sameMoment(commit.date);
    expect(res.commitsSinceVersionSource).to.equal(5);
  });

  it('detects correct build from feature (milestone) @unit', async function () {
    const strategyOptions: MilestoneOptions = { kind: 'Milestone', prefix: 'R', baseNumber: 0 };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createBasicMilestoneGraph();
    const feature = master.branch('feature/my-special-feature');
    feature.commit('Make a special feature change');
    feature.commit('Make another feature change');
    master.commit('Next commit 1');
    master.commit('Next commit 2');

    const commit = await testHelper.checkout(feature);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/heads/feature/my-special-feature', undefined);
    expect(res).to.not.be.null;
    expect(res.major).to.equal(2);
    expect(res.minor).to.equal(0);
    expect(res.patch).to.equal(0);
    expect(res.preReleaseLabel).to.equal('my-special-feature');
    expect(res.sha).to.equal(commit.sha);
    expect(res.buildType).to.equal('working-branch');
    expect(res.branchName).to.equal('feature/my-special-feature');
    expect(res.commitDate).to.be.sameMoment(commit.date);
    expect(res.commitsSinceVersionSource).to.equal(5);
  });

  it('can not strip branch prefix (milestone) @unit', async function () {
    const strategyOptions: MilestoneOptions = { kind: 'Milestone', prefix: 'R', baseNumber: 0 };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        stripBranchPrefixFromLabel: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createBasicMilestoneGraph();
    const feature = master.branch('feature/my-special-feature');
    feature.commit('Make a special feature change');
    feature.commit('Make another feature change');
    master.commit('Next commit 1');
    master.commit('Next commit 2');

    await testHelper.checkout(feature);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/heads/feature/my-special-feature', undefined);
    expect(res.preReleaseLabel).to.equal('feature-my-special-feature');
  });

  it('handles multi-part branch names (milestone) @unit', async function () {
    const strategyOptions: MilestoneOptions = { kind: 'Milestone', prefix: 'R', baseNumber: 0 };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        stripBranchPrefixFromLabel: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createBasicMilestoneGraph();
    const feature = master.branch('merge/feature/my-special-feature');
    feature.commit('Make a special feature change');
    feature.commit('Make another feature change');
    master.commit('Next commit 1');
    master.commit('Next commit 2');

    await testHelper.checkout(feature);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/heads/merge/feature/my-special-feature', undefined);
    expect(res).to.not.be.null;
    expect(res.preReleaseLabel).to.equal('merge-feature-my-special-feature');
    expect(res.branchName).to.equal('merge/feature/my-special-feature');
  });

  it('detects correct build from release branch commit with no tags (milestone) @unit', async function () {
    const strategyOptions: MilestoneOptions = { kind: 'Milestone', prefix: 'R', baseNumber: 0 };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createBasicMilestoneGraph();
    const release2 = master.branch('release/R2');
    release2.commit('Cherry-pick fix');
    master.commit('Next commit 1');
    master.commit('Next commit 2');

    const commit = await testHelper.checkout(release2);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/heads/release/R2', undefined);
    expect(res).to.not.be.null;
    expect(res.major).to.equal(2, 'major');
    expect(res.minor).to.equal(0, 'minor');
    expect(res.patch).to.equal(0, 'patch');
    expect(res.preReleaseLabel).to.equal('beta');
    expect(res.sha).to.equal(commit.sha);
    expect(res.buildType).to.equal('beta');
    expect(res.branchName).to.equal('release/R2');
    expect(res.commitDate).to.be.sameMoment(commit.date);
    expect(res.commitsSinceVersionSource).to.equal(1, 'commitsSinceVersionSource');
  });

  it('detects correct build from release branch tag (milestone) @unit', async function () {
    const strategyOptions: MilestoneOptions = { kind: 'Milestone', prefix: 'R', baseNumber: 0 };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createBasicMilestoneGraph();
    const release2 = master.branch('release/R2');
    release2.commit('Cherry-pick fix').tag('v2.0');
    master.commit('Next commit 1');
    master.commit('Next commit 2');

    const commit = await testHelper.checkout(release2);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/tags/v2.0', undefined);
    expect(res).to.not.be.null;
    expect(res.major).to.equal(2, 'major');
    expect(res.minor).to.equal(0, 'minor');
    expect(res.patch).to.equal(0, 'patch');
    expect(res.preReleaseLabel).to.be.null;
    expect(res.sha).to.equal(commit.sha);
    expect(res.buildType).to.equal('release');
    expect(res.branchName).to.equal('tags/v2.0');
    expect(res.commitDate).to.be.sameMoment(commit.date);
    expect(res.commitsSinceVersionSource).to.equal(0, 'commitsSinceVersionSource');
  });

  it('detects correct build from release branch tag using refs/heads/tags (milestone) @unit', async function () {
    const strategyOptions: MilestoneOptions = { kind: 'Milestone', prefix: 'R', baseNumber: 0 };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createBasicMilestoneGraph();
    const release2 = master.branch('release/R2');
    release2.commit('Cherry-pick fix').tag('v2.0');
    master.commit('Next commit 1');
    master.commit('Next commit 2');

    const commit = await testHelper.checkout(release2);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/heads/tags/v2.0', undefined);
    expect(res).to.not.be.null;
    expect(res.major).to.equal(2, 'major');
    expect(res.minor).to.equal(0, 'minor');
    expect(res.patch).to.equal(0, 'patch');
    expect(res.preReleaseLabel).to.be.null;
    expect(res.sha).to.equal(commit.sha);
    expect(res.buildType).to.equal('release');
    expect(res.branchName).to.equal('tags/v2.0');
    expect(res.commitDate).to.be.sameMoment(commit.date);
    expect(res.commitsSinceVersionSource).to.equal(0, 'commitsSinceVersionSource');
  });

  it('detects correct build from release branch commit with tags (milestone) @unit', async function () {
    const strategyOptions: MilestoneOptions = { kind: 'Milestone', prefix: 'R', baseNumber: 0 };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createBasicMilestoneGraph();
    const release2 = master.branch('release/R2');
    release2.commit('Cherry-pick fix').tag('v2.0');
    release2.commit('Patch to release 2.0.0');

    master.commit('Next commit 1');
    master.commit('Next commit 2');

    const commit = await testHelper.checkout(release2);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/heads/release/R2', undefined);
    expect(res).to.not.be.null;
    expect(res.major).to.equal(2, 'major');
    expect(res.minor).to.equal(1, 'minor');
    expect(res.patch).to.equal(0, 'patch');
    expect(res.preReleaseLabel).to.equal('beta');
    expect(res.sha).to.equal(commit.sha);
    expect(res.buildType).to.equal('beta');
    expect(res.branchName).to.equal('release/R2');
    expect(res.commitDate).to.be.sameMoment(commit.date);
    expect(res.commitsSinceVersionSource).to.equal(1, 'commitsSinceVersionSource');
  });

  it('supports configuring the trunk branch name (milestone) @unit', async function () {
    const strategyOptions: MilestoneOptions = { kind: 'Milestone', prefix: 'R', baseNumber: 0 };
    const options: Options = {
      ...DefaultOptions,
      ...{
        trunkBranchName: 'main',
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };

    const main = testHelper.createBasicMilestoneGraph('main');
    const release2 = main.branch('release/R2');
    release2.commit('Cherry-pick fix').tag('v2.0.0');
    main.commit('Next commit 1');
    main.commit('Next commit 2');

    const commit = await testHelper.checkout(main);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/heads/main', undefined);
    expect(res).to.not.be.null;
    expect(res.major).to.equal(3);
    expect(res.minor).to.equal(0);
    expect(res.patch).to.equal(0);
    expect(res.preReleaseLabel).to.equal('alpha');
    expect(res.sha).to.equal(commit.sha);
    expect(res.buildType).to.equal('alpha');
    expect(res.branchName).to.equal('main');
    expect(res.commitDate).to.be.sameMoment(commit.date);
    expect(res.commitsSinceVersionSource).to.equal(2);
  });

  it('detects correct build from trunk with releases (semver) @unit', async function () {
    const strategyOptions: SemVerOptions = { kind: 'SemVer', baseNumber: '0.0' };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createBasicMilestoneGraph();
    const release2 = master.branch('release/1.1');
    release2.commit('Cherry-pick fix').tag('v1.1.0');
    master.commit('Next commit 1');
    master.commit('Next commit 2');

    const commit = await testHelper.checkout(master);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/heads/master', undefined);
    expect(res).to.not.be.null;
    expect(res.major).to.equal(1);
    expect(res.minor).to.equal(2);
    expect(res.patch).to.equal(0);
    expect(res.preReleaseLabel).to.equal('alpha');
    expect(res.sha).to.equal(commit.sha);
    expect(res.buildType).to.equal('alpha');
    expect(res.branchName).to.equal('master');
    expect(res.commitDate).to.be.sameMoment(commit.date);
    expect(res.commitsSinceVersionSource).to.equal(2);
  });

  it('detects correct build from trunk with no releases (semver) @unit', async function () {
    const strategyOptions: SemVerOptions = { kind: 'SemVer', baseNumber: '0.0' };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createGraphWithNoReleases();
    const commit = await testHelper.checkout(master);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/heads/master', undefined);
    expect(res).to.not.be.null;
    expect(res.major).to.equal(0);
    expect(res.minor).to.equal(0);
    expect(res.patch).to.equal(0);
    expect(res.preReleaseLabel).to.equal('alpha');
    expect(res.sha).to.equal(commit.sha);
    expect(res.buildType).to.equal('alpha');
    expect(res.branchName).to.equal('master');
    expect(res.commitDate).to.be.sameMoment(commit.date);
    expect(res.commitsSinceVersionSource).to.equal(5);
  });

  it('detects correct build from feature (semver) @unit', async function () {
    const strategyOptions: SemVerOptions = { kind: 'SemVer', baseNumber: '0.0' };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createBasicSemVerGraph();
    const feature = master.branch('feature/my-special-feature');
    feature.commit('Make a special feature change');
    feature.commit('Make another feature change');
    master.commit('Next commit 1');
    master.commit('Next commit 2');

    const commit = await testHelper.checkout(feature);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/heads/feature/my-special-feature', undefined);
    expect(res).to.not.be.null;
    expect(res.major).to.equal(1);
    expect(res.minor).to.equal(1);
    expect(res.patch).to.equal(0);
    expect(res.preReleaseLabel).to.equal('my-special-feature');
    expect(res.sha).to.equal(commit.sha);
    expect(res.buildType).to.equal('working-branch');
    expect(res.branchName).to.equal('feature/my-special-feature');
    expect(res.commitDate).to.be.sameMoment(commit.date);
    expect(res.commitsSinceVersionSource).to.equal(5);
  });

  it('can not strip branch prefix (semver) @unit', async function () {
    const strategyOptions: SemVerOptions = { kind: 'SemVer', baseNumber: '0.0' };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        stripBranchPrefixFromLabel: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createBasicSemVerGraph();
    const feature = master.branch('feature/my-special-feature');
    feature.commit('Make a special feature change');
    feature.commit('Make another feature change');
    master.commit('Next commit 1');
    master.commit('Next commit 2');

    await testHelper.checkout(feature);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/heads/feature/my-special-feature', undefined);
    expect(res).to.not.be.null;
    expect(res.preReleaseLabel).to.equal('feature-my-special-feature');
  });

  it('handles multi-part branch names (semver) @unit', async function () {
    const strategyOptions: SemVerOptions = { kind: 'SemVer', baseNumber: '0.0' };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createBasicSemVerGraph();
    const feature = master.branch('merge/feature/my-special-feature');
    feature.commit('Make a special feature change');
    feature.commit('Make another feature change');
    master.commit('Next commit 1');
    master.commit('Next commit 2');

    await testHelper.checkout(feature);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/heads/merge/feature/my-special-feature', undefined);
    expect(res).to.not.be.null;
    expect(res.preReleaseLabel).to.equal('feature-my-special-feature');
    expect(res.branchName).to.equal('merge/feature/my-special-feature');
  });

  it('handles dots in branch names (semver) @unit', async function () {
    const strategyOptions: SemVerOptions = { kind: 'SemVer', baseNumber: '0.0' };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createBasicSemVerGraph();
    const feature = master.branch('merge/feature.my-special-feature');
    feature.commit('Make a special feature change');
    feature.commit('Make another feature change');
    master.commit('Next commit 1');
    master.commit('Next commit 2');

    await testHelper.checkout(feature);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/heads/merge/feature.my-special-feature', undefined);
    expect(res).to.not.be.null;
    expect(res.preReleaseLabel).to.equal('feature.my-special-feature');
    expect(res.branchName).to.equal('merge/feature.my-special-feature');
  });

  it('removes leading zeroes and empty identifiers in branch names (semver) @unit', async function () {
    const strategyOptions: SemVerOptions = { kind: 'SemVer', baseNumber: '0.0' };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createBasicSemVerGraph();
    const feature = master.branch('merge/feature.012..my-special-feature.001');
    feature.commit('Make a special feature change');
    feature.commit('Make another feature change');
    master.commit('Next commit 1');
    master.commit('Next commit 2');

    await testHelper.checkout(feature);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/heads/merge/feature.012..my-special-feature.001', undefined);
    expect(res).to.not.be.null;
    expect(res.preReleaseLabel).to.equal('feature.12.my-special-feature.1');
    expect(res.branchName).to.equal('merge/feature.012..my-special-feature.001');
  });

  it('detects correct build from release branch commit with no tags (semver) @unit', async function () {
    const strategyOptions: SemVerOptions = { kind: 'SemVer', baseNumber: '0.0' };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createBasicSemVerGraph();
    const release2 = master.branch('release/2.0');
    release2.commit('Cherry-pick fix');
    master.commit('Next commit 1');
    master.commit('Next commit 2');

    const commit = await testHelper.checkout(release2);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/heads/release/2.0', undefined);
    expect(res).to.not.be.null;
    expect(res.major).to.equal(2, 'major');
    expect(res.minor).to.equal(0, 'minor');
    expect(res.patch).to.equal(0, 'patch');
    expect(res.preReleaseLabel).to.equal('beta');
    expect(res.sha).to.equal(commit.sha);
    expect(res.buildType).to.equal('beta');
    expect(res.branchName).to.equal('release/2.0');
    expect(res.commitDate).to.be.sameMoment(commit.date);
    expect(res.commitsSinceVersionSource).to.equal(1, 'commitsSinceVersionSource');
  });

  it('detects correct build from release branch tag (semver) @unit', async function () {
    const strategyOptions: SemVerOptions = { kind: 'SemVer', baseNumber: '0.0' };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createBasicSemVerGraph();
    const release2 = master.branch('release/2.0');
    release2.commit('Cherry-pick fix').tag('v2.0.0');
    master.commit('Next commit 1');
    master.commit('Next commit 2');

    const commit = await testHelper.checkout(release2);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/tags/v2.0.0', undefined);
    expect(res).to.not.be.null;
    expect(res.major).to.equal(2, 'major');
    expect(res.minor).to.equal(0, 'minor');
    expect(res.patch).to.equal(0, 'patch');
    expect(res.preReleaseLabel).to.be.null;
    expect(res.sha).to.equal(commit.sha);
    expect(res.buildType).to.equal('release');
    expect(res.branchName).to.equal('tags/v2.0.0');
    expect(res.commitDate).to.be.sameMoment(commit.date);
    expect(res.commitsSinceVersionSource).to.equal(0, 'commitsSinceVersionSource');
  });

  it('detects correct build from release branch tag using refs/heads/tags (semver) @unit', async function () {
    const strategyOptions: SemVerOptions = { kind: 'SemVer', baseNumber: '0.0' };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createBasicSemVerGraph();
    const release2 = master.branch('release/2.0');
    release2.commit('Cherry-pick fix').tag('v2.0.0');
    master.commit('Next commit 1');
    master.commit('Next commit 2');

    const commit = await testHelper.checkout(release2);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/heads/tags/v2.0.0', undefined);
    expect(res).to.not.be.null;
    expect(res.major).to.equal(2, 'major');
    expect(res.minor).to.equal(0, 'minor');
    expect(res.patch).to.equal(0, 'patch');
    expect(res.preReleaseLabel).to.be.null;
    expect(res.sha).to.equal(commit.sha);
    expect(res.buildType).to.equal('release');
    expect(res.branchName).to.equal('tags/v2.0.0');
    expect(res.commitDate).to.be.sameMoment(commit.date);
    expect(res.commitsSinceVersionSource).to.equal(0, 'commitsSinceVersionSource');
  });

  it('detects correct build from release branch commit with tags (semver) @unit', async function () {
    const strategyOptions: SemVerOptions = { kind: 'SemVer', baseNumber: '0.0' };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createBasicSemVerGraph();
    const release2 = master.branch('release/2.0');
    release2.commit('Cherry-pick fix').tag('v2.0.0');
    release2.commit('Patch to release 2.0.0');
    master.commit('Next commit 1');
    master.commit('Next commit 2');

    const commit = await testHelper.checkout(release2);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/heads/release/2.0', undefined);
    expect(res).to.not.be.null;
    expect(res.major).to.equal(2, 'major');
    expect(res.minor).to.equal(0, 'minor');
    expect(res.patch).to.equal(1, 'patch');
    expect(res.preReleaseLabel).to.equal('beta');
    expect(res.sha).to.equal(commit.sha);
    expect(res.buildType).to.equal('beta');
    expect(res.branchName).to.equal('release/2.0');
    expect(res.commitDate).to.be.sameMoment(commit.date);
    expect(res.commitsSinceVersionSource).to.equal(1, 'commitsSinceVersionSource');
  });

  it('increments version when building PR that targets master branch (semver) @unit', async function () {
    const strategyOptions: SemVerOptions = { kind: 'SemVer', baseNumber: '0.0' };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createBasicSemVerGraph();

    const feature = master.branch('feature/myfeature');

    const release11 = testHelper.createBranch(master, 'release/1.1');
    release11.tag('v1.1.0');

    feature.commit('Add a feature');
    feature.commit('Fix feature');

    const mergeBranch = testHelper.createPR(master, 43);
    mergeBranch.merge(feature);

    const commit = await testHelper.checkout(mergeBranch);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/pull/43/merge', 'refs/heads/master');
    expect(res).to.not.be.null;
    expect(res.major).to.equal(1, 'major');
    expect(res.minor).to.equal(2, 'minor');
    expect(res.patch).to.equal(0, 'patch');
    expect(res.preReleaseLabel).to.equal('pr.43');
    expect(res.sha).to.equal(commit.sha);
    expect(res.buildType).to.equal('pull-request');
    expect(res.branchName).to.equal('pull/43/merge');
    expect(res.commitDate).to.be.sameMoment(commit.date);
    expect(res.commitsSinceVersionSource).to.equal(1, 'commitsSinceVersionSource');
  });

  it('increments version when building PR that targets release branch (semver) @unit', async function () {
    const strategyOptions: SemVerOptions = { kind: 'SemVer', baseNumber: '0.0' };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };

    const master = testHelper.createBasicSemVerGraph();

    const feature = master.branch('feature/myfeature');

    const release11 = testHelper.createBranch(master, 'release/1.1');
    release11.tag('v1.1.0');

    feature.commit('Add a feature');
    feature.commit('Fix feature');

    const mergeBranch = testHelper.createPR(master, 43);
    mergeBranch.merge(feature);

    const commit = await testHelper.checkout(mergeBranch);

    sut = new BuildVersionCalculator(log, options);
    const res = await sut.getBuildVersionInfo('refs/pull/43/merge', 'refs/heads/release/1.1');
    expect(res).to.not.be.null;
    expect(res.major).to.equal(1, 'major');
    expect(res.minor).to.equal(1, 'minor');
    expect(res.patch).to.equal(1, 'patch');
    expect(res.preReleaseLabel).to.equal('pr.43');
    expect(res.sha).to.equal(commit.sha);
    expect(res.buildType).to.equal('pull-request');
    expect(res.branchName).to.equal('pull/43/merge');
    expect(res.commitDate).to.be.sameMoment(commit.date);
    expect(res.commitsSinceVersionSource).to.equal(1, 'commitsSinceVersionSource');
  });
});
