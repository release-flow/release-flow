import chai, { expect } from 'chai';
import chaiMoment from 'chai-moment';

import { ImportMock, MockManager } from 'ts-mock-imports';
import { GitPrimitives, GitCommitInfo } from './GitPrimitives';
import * as gitRunnerModule from './GitRunner';
import moment from 'moment';
import SpyLogger from './tests/SpyLogger';

chai.use(chaiMoment);

describe('GitPrimitives test', function () {
  const log = new SpyLogger();
  let itemMock: MockManager<gitRunnerModule.default>;
  let sut: GitPrimitives;

  beforeEach('mock out dependencies', function () {
    itemMock = ImportMock.mockClass(gitRunnerModule, 'default');
    log.clear();
    sut = new GitPrimitives(log, true);
  });

  afterEach('restore dependencies', function () {
    itemMock.restore();
  });

  it('show should parse a command-line response correctly @unit', async function () {
    const lines = ["'01c3b44c08b3793dea4bedbdd802c9b2c24bd19f 1581090771 (origin/main)'", ''];
    const stdout = lines.join('\n');
    const execResponse = { code: 0, stdout, stderr: '' };
    itemMock.mock('execCommand', execResponse);

    const info = await sut.getCommit('01c3b44c');

    expect(info).to.not.be.null;
    expect(info!.sha).to.equal('01c3b44c08b3793dea4bedbdd802c9b2c24bd19f');
    expect(info!.date).to.be.sameMoment(new Date('2020-02-07T15:52:51+00:00'));
  });

  it('should parse branches @unit', async function () {
    const lines = ["'01c3b44c08b3793dea4bedbdd802c9b2c24bd19f 1581090771 (main, origin/main)'", ''];
    const stdout = lines.join('\n');
    const execResponse = { code: 0, stdout, stderr: '' };
    itemMock.mock('execCommand', execResponse);

    const info = await sut.getCommit('01c3b44c');

    expect(info).to.not.be.null;
    expect(info!.branches).to.include('origin/main').and.to.include('main');
  });

  it('should parse tags @unit', async function () {
    const lines = ["'01c3b44c08b3793dea4bedbdd802c9b2c24bd19f 1581090771 (tag: tag1, tag: tag2)'", ''];
    const stdout = lines.join('\n');
    const execResponse = { code: 0, stdout, stderr: '' };
    itemMock.mock('execCommand', execResponse);

    const info = await sut.getCommit('01c3b44c');

    expect(info).to.not.be.null;
    expect(info!.tags).to.include('tag1').and.to.include('tag2');
  });

  it('should parse attached HEAD @unit', async function () {
    const lines = ["'01c3b44c08b3793dea4bedbdd802c9b2c24bd19f 1581090771 (HEAD -> main, tag: tag2)'", ''];
    const stdout = lines.join('\n');
    const execResponse = { code: 0, stdout, stderr: '' };
    itemMock.mock('execCommand', execResponse);

    const info = await sut.getCommit('01c3b44c');

    expect(info).to.not.be.null;
    expect(info!.branches).to.include('main');
    expect(info!.isHead).to.equal(true);
    expect(info!.isDetachedHead).to.equal(false);
  });

  it('should parse detached HEAD @unit', async function () {
    const lines = ["'01c3b44c08b3793dea4bedbdd802c9b2c24bd19f 1581090771 (HEAD, main, tag: tag2)'", ''];
    const stdout = lines.join('\n');
    const execResponse = { code: 0, stdout, stderr: '' };
    itemMock.mock('execCommand', execResponse);

    const info = await sut.getCommit('01c3b44c');

    expect(info).to.not.be.null;
    expect(info!.branches).to.include('main');
    expect(info!.isHead).to.equal(true);
    expect(info!.isDetachedHead).to.equal(true);
  });

  it('log should parse multiple log entries @unit', async function () {
    const lines = [
      "'daac765842f1ce420d935c76b64e4223bbaf838f 1581344677 (HEAD -> main, tag: mytag)'",
      "'01c3b44c08b3793dea4bedbdd802c9b2c24bd19f 1581090771 (origin/main)'",
      "'d68ce6daf1ff1ea6a2dd3036be2bd713b6089f54 1581068232 '",
      '',
    ];
    const stdout = lines.join('\n');
    const execResponse = { code: 0, stdout, stderr: '' };
    itemMock.mock('execCommand', execResponse);

    const log = await sut.getCommitRange('d68ce6..daac765');
    expect(log.length).to.equal(3);

    // First should be head and main branch with tag
    expect(log[0].sha).to.equal('daac765842f1ce420d935c76b64e4223bbaf838f');
  });

  it('commitsCount should return count @unit', async function () {
    const execResponse = { code: 0, stdout: '4', stderr: '' };
    itemMock.mock('execCommand', execResponse);

    const count = await sut.countCommits('HEAD', 'd68ce6');
    expect(count).to.equal(4);
  });

  it('listBranches should return an array of branches @unit', async function () {
    const lines = [
      '* main',
      '  release/0.1',
      '  release/0.1',
      '  release/0.2',
      '  release/1.0',
      '  release/1.1',
      '  remotes/origin/HEAD -> origin/main',
      '  remotes/origin/main',
      '  remotes/origin/release/0.1',
      '  remotes/origin/release/0.2',
      '  remotes/origin/release/1.0',
      '  remotes/origin/release/1.1',
    ];
    const stdout = lines.join('\n');
    const execResponse = { code: 0, stdout, stderr: '' };
    itemMock.mock('execCommand', execResponse);

    const branches = await sut.listBranches();
    expect(branches.length).to.equal(11);

    // First should be head and main branch with tag
    expect(branches)
      .to.contain('main')
      .and.to.contain('remotes/origin/main')
      .and.not.to.contain('remotes/origin/HEAD -> origin/main');
  });

  it('isAncestor should return true if return code is zero', async function () {
    const execResponse = { code: 0, stdout: '', stderr: '' };
    itemMock.mock('execCommand', execResponse);

    const isAncestor = await sut.isAncestor('A', 'B');
    expect(isAncestor).to.equal(true);
  });

  it('isAncestor should return false if return code is non-zero', async function () {
    const execResponse = { code: 1, stdout: '', stderr: '' };
    itemMock.mock('execCommand', execResponse);

    const isAncestor = await sut.isAncestor('A', 'B');
    expect(isAncestor).to.equal(false);
  });

  it('getTaggedCommitsOnBranch should return the commit', async function () {
    const lines = [
      "'daac765842f1ce420d935c76b64e4223bbaf838f 1581344677 (HEAD -> main, tag: tag2)'",
      "'01c3b44c08b3793dea4bedbdd802c9b2c24bd19f 1581090771 (origin/main, tag: tag1)'",
      '',
    ];
    const stdout = lines.join('\n');
    const execResponse = { code: 0, stdout, stderr: '' };
    itemMock.mock('execCommand', execResponse);

    const commitInfo: GitCommitInfo = {
      sha: 'd68ce6daf1ff1ea6a2dd3036be2bd713b6089f54',
      date: moment(),
      branches: [],
      tags: [],
      isDetachedHead: false,
      isHead: false,
    };
    const branch = { initialCommit: commitInfo, name: 'main' };
    const commits = await sut.getTaggedCommitsOnBranch(branch);
    expect(commits.length).to.equal(2);
  });
});
