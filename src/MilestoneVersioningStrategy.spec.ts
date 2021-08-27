import { expect } from 'chai';
import MilestoneVersioningStrategy from './MilestoneVersioningStrategy';
import SpyLogger from './tests/SpyLogger';
import { NullGitCommitInfo } from './GitPrimitives';
import Version from './Version';

describe('MilestoneVersioningStrategy tests', function () {
  const log = new SpyLogger();
  let sut: MilestoneVersioningStrategy;

  beforeEach('prepare fakes', function () {
    log.clear();
    sut = new MilestoneVersioningStrategy(log, { kind: 'Milestone', baseNumber: 0, prefix: 'R' });
  });

  it('parseReleaseNumber should parse a valid one-part release number @unit', function () {
    const res = sut.tryParseReleaseBranchNumber('R12');
    expect(res).to.not.be.null;
    expect(res!.milestone).to.equal(12);
  });

  it('parseReleaseNumber should return null for an invalid (two-part) release number @unit', function () {
    const res = sut.tryParseReleaseBranchNumber('12.05');
    expect(res).to.be.null;
  });

  it('parseReleaseNumber should return null for an invalid (bad prefix) release number @unit', function () {
    const res = sut.tryParseReleaseBranchNumber('X12');
    expect(res).to.be.null;
  });

  it('parseReleaseNumber should respect the prefix in options @unit', function () {
    sut = new MilestoneVersioningStrategy(log, { kind: 'Milestone', baseNumber: 0, prefix: 'M' });
    const res = sut.tryParseReleaseBranchNumber('M12');
    expect(res).to.not.be.null;
    expect(res!.milestone).to.equal(12);
  });

  it('parseReleaseNumber should handle an empty prefix in options @unit', function () {
    sut = new MilestoneVersioningStrategy(log, { kind: 'Milestone', baseNumber: 0, prefix: '' });
    const res = sut.tryParseReleaseBranchNumber('12');
    expect(res).to.not.be.null;
    expect(res!.milestone).to.equal(12);
  });

  const tests = [
    { arg: 'R1', expected: true },
    { arg: 'R102', expected: true },
    { arg: 'R0', expected: false },
    { arg: '', expected: false },
    { arg: 'R', expected: false },
    { arg: 'R05', expected: false },
    { arg: 'R1.2', expected: false },
    { arg: 'R1,000', expected: false },
    { arg: 'M1', expected: false },
  ];
  // eslint-disable-next-line mocha/no-setup-in-describe
  tests.forEach((test) => {
    it(`releaseBranchNumberRegex matches '${test.arg}' as ${test.expected}`, function () {
      const match = sut.releaseBranchNumberRegex.exec(test.arg);
      const result = match != null;
      expect(result).to.equal(test.expected);
    });
  });

  const tagTests = [
    // Valid - preferred format
    { arg: 'v0.0', valid: true, expected: new Version(0, 0, 0) },
    { arg: 'v0.1', valid: true, expected: new Version(0, 1, 0) },
    { arg: 'v102.10', valid: true, expected: new Version(102, 10, 0) },
    // Valid - backward compatibility
    { arg: 'v0.0.0', valid: true, expected: new Version(0, 0, 0) },
    { arg: 'v1.1.1', valid: true, expected: new Version(1, 1, 0) },
    // Invalid
    { arg: '', valid: false },
    { arg: 'v', valid: false },
    { arg: 'v1', valid: false },
    { arg: 'v1.', valid: false },
    { arg: 'v1.1.', valid: false },
    { arg: '1', valid: false },
    { arg: '001.0', valid: false },
    { arg: '123.01', valid: false },
  ];
  // eslint-disable-next-line mocha/no-setup-in-describe
  tagTests.forEach((test) => {
    it(`tryParseVersionSourceFromTag matches '${test.arg}' as ${test.valid}`, function () {
      const vs = sut.tryParseVersionSourceFromTag(test.arg, NullGitCommitInfo);
      const valid = vs != null;
      expect(valid).to.equal(test.valid);
      if (valid) {
        expect(vs!.version.compare(test.expected!)).to.equal(0);
      }
    });
  });
});
