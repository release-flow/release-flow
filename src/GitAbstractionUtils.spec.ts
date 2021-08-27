import { expect } from 'chai';

import GitAbstractionUtils from './GitAbstractionUtils';
import SpyLogger from './tests/SpyLogger';
import { MilestoneOptions, SemVerOptions, Options, DefaultOptions } from './BuildCalculationOptions';
import MilestoneVersioningStrategy from './MilestoneVersioningStrategy';
import SemVerVersioningStrategy from './SemVerVersioningStrategy';
import GitGraphTestHelper from './GitGraphTestHelper';

describe('GitAbstractionUtils tests', function () {
  const log = new SpyLogger();
  let sut: GitAbstractionUtils;
  let testHelper: GitGraphTestHelper;

  beforeEach('mock out dependencies', function () {
    log.clear();

    testHelper = new GitGraphTestHelper();
  });

  afterEach('restore dependencies', function () {
    //mockGitHelper.restore();
    testHelper.cleanup();
  });

  it('getReleaseBranches returns multiple matching branches (milestone) @unit', async function () {
    const strategyOptions: MilestoneOptions = { kind: 'Milestone', prefix: 'R', baseNumber: 0 };
    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };
    const strategy = new MilestoneVersioningStrategy(log, strategyOptions);

    const master = testHelper.createBasicMilestoneGraph();
    const release2 = master.branch('release/R2');
    release2.commit('Cherry-pick fix').tag('v2.0.0');

    sut = new GitAbstractionUtils(log, strategy, options);
    const res = await sut.getReleaseBranches();
    expect(res).to.not.be.null;
    expect(res.length).to.equal(2);
  });

  it('getReleaseBranches supports configurable trunk (milestone) @unit', async function () {
    const strategyOptions: MilestoneOptions = { kind: 'Milestone', prefix: 'R', baseNumber: 0 };
    const options: Options = {
      ...DefaultOptions,
      ...{
        trunkBranchName: 'main',
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };
    const strategy = new MilestoneVersioningStrategy(log, strategyOptions);

    const main = testHelper.createBasicMilestoneGraph('main');
    const release2 = main.branch('release/R2');
    release2.commit('Cherry-pick fix').tag('v2.0.0');

    sut = new GitAbstractionUtils(log, strategy, options);
    const res = await sut.getReleaseBranches();
    expect(res).to.not.be.null;
    expect(res.length).to.equal(2);
  });

  it('getHighestReachableReleaseBranch returns correct branch from master (milestone) @unit', async function () {
    const strategyOptions: MilestoneOptions = { kind: 'Milestone', prefix: 'R', baseNumber: 0 };
    const strategy = new MilestoneVersioningStrategy(log, strategyOptions);

    const master = testHelper.createBasicMilestoneGraph();
    const release2 = master.branch('release/R2');
    release2.commit('Cherry-pick fix').tag('v2.0.0');
    master.checkout();

    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };
    sut = new GitAbstractionUtils(log, strategy, options);
    const res = await sut.tryGetHighestReachableReleaseBranch('HEAD');
    expect(res).to.not.be.null;
    expect(res!.name).to.equal('release/R2');
  });

  // eslint-disable-next-line max-len
  it('getHighestReachableReleaseBranch returns correct branch from configured trunk (milestone) @unit', async function () {
    const strategyOptions: MilestoneOptions = { kind: 'Milestone', prefix: 'R', baseNumber: 0 };
    const strategy = new MilestoneVersioningStrategy(log, strategyOptions);

    const main = testHelper.createBasicMilestoneGraph('main');
    const release2 = main.branch('release/R2');
    release2.commit('Cherry-pick fix').tag('v2.0.0');
    main.checkout();

    const options: Options = {
      ...DefaultOptions,
      ...{
        trunkBranchName: 'main',
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };
    sut = new GitAbstractionUtils(log, strategy, options);
    const res = await sut.tryGetHighestReachableReleaseBranch('HEAD');
    expect(res).to.not.be.null;
    expect(res!.name).to.equal('release/R2');
  });

  it('getHighestReachableReleaseBranch returns correct branch from feature (milestone) @unit', async function () {
    const strategyOptions: MilestoneOptions = { kind: 'Milestone', prefix: 'R', baseNumber: 0 };
    const strategy = new MilestoneVersioningStrategy(log, strategyOptions);

    const master = testHelper.createBasicMilestoneGraph();
    const feature = master.branch('feature/my-feature');
    feature.commit('Add F#');
    master.commit('Some change');

    const release2 = master.branch('release/R2');
    release2.commit('Cherry-pick fix').tag('v2.0.0');

    feature.checkout();

    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };
    sut = new GitAbstractionUtils(log, strategy, options);
    const res = await sut.tryGetHighestReachableReleaseBranch('HEAD');
    expect(res).to.not.be.null;
    expect(res!.name).to.equal('release/R1');
  });

  it('getHighestReachableReleaseBranch returns correct branch from master (semver) @unit', async function () {
    const strategyOptions: SemVerOptions = { kind: 'SemVer', baseNumber: '0.0' };
    const strategy = new SemVerVersioningStrategy(log, strategyOptions);

    const master = testHelper.createBasicSemVerGraph();
    const release2 = master.branch('release/1.1');
    release2.commit('Cherry-pick fix').tag('v1.1.0');

    master.checkout();

    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };
    sut = new GitAbstractionUtils(log, strategy, options);
    const res = await sut.tryGetHighestReachableReleaseBranch('HEAD');
    expect(res).to.not.be.null;
    expect(res!.name).to.equal('release/1.1');
  });

  it('getHighestReachableReleaseBranch returns correct branch from configured trunk (semver) @unit', async function () {
    const strategyOptions: SemVerOptions = { kind: 'SemVer', baseNumber: '0.0' };
    const strategy = new SemVerVersioningStrategy(log, strategyOptions);

    const master = testHelper.createBasicSemVerGraph('main');
    const release2 = master.branch('release/1.1');
    release2.commit('Cherry-pick fix').tag('v1.1.0');

    master.checkout();

    const options: Options = {
      ...DefaultOptions,
      ...{
        trunkBranchName: 'main',
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };
    sut = new GitAbstractionUtils(log, strategy, options);
    const res = await sut.tryGetHighestReachableReleaseBranch('HEAD');
    expect(res).to.not.be.null;
    expect(res!.name).to.equal('release/1.1');
  });

  it('getHighestReachableReleaseBranch returns correct branch from feature (semver) @unit', async function () {
    const strategyOptions: SemVerOptions = { kind: 'SemVer', baseNumber: '0.0' };
    const strategy = new SemVerVersioningStrategy(log, strategyOptions);

    const master = testHelper.createBasicSemVerGraph();
    const feature = master.branch('feature/my-feature');
    feature.commit('Add F#');
    master.commit('Some change');

    const release2 = master.branch('release/1.1');
    release2.commit('Cherry-pick fix').tag('v1.1.0');

    feature.checkout();

    const options: Options = {
      ...DefaultOptions,
      ...{
        useOriginBranches: false,
        strategy: strategyOptions,
      },
    };
    sut = new GitAbstractionUtils(log, strategy, options);
    const res = await sut.tryGetHighestReachableReleaseBranch('HEAD');
    expect(res).to.not.be.null;
    expect(res!.name).to.equal('release/1.0');
  });
});
