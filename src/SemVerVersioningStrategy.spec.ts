import { expect } from 'chai';
import SemVerVersioningStrategy from './SemVerVersioningStrategy';
import SpyLogger from './tests/SpyLogger';

describe('SemVerVersioningStrategy tests', function () {
  const log = new SpyLogger();
  let sut: SemVerVersioningStrategy;

  beforeEach('prepare fakes', function () {
    log.clear();
    sut = new SemVerVersioningStrategy(log, { kind: 'SemVer', baseNumber: '0.0' });
  });

  it('parseReleaseNumber should parse a valid one-part release number @unit', function () {
    const res = sut.tryParseReleaseBranchNumber('12');
    expect(res).to.not.be.null;
    expect(res!.major).to.equal(12);
    expect(res!.minor).to.equal(0);
  });

  it('parseReleaseNumber should return null for an invalid one-part release number (leading zero) @unit', function () {
    const res = sut.tryParseReleaseBranchNumber('012.5');
    expect(res).to.be.null;
  });

  it('parseReleaseNumber should parse a valid two-part release number @unit', function () {
    const res = sut.tryParseReleaseBranchNumber('12.5');
    expect(res).to.not.be.null;
    expect(res!.major).to.equal(12);
    expect(res!.minor).to.equal(5);
  });

  it('parseReleaseNumber should return null for an invalid two-part release number (leading zero) @unit', function () {
    const res = sut.tryParseReleaseBranchNumber('12.05');
    expect(res).to.be.null;
  });

  const releaseBranchNumberRegexTests = [
    { arg: '1.0', expected: true },
    { arg: '0.1', expected: true },
    { arg: '1', expected: true },
    { arg: '0', expected: true },
    { arg: '0.0', expected: true },
    { arg: '5.250', expected: true },
    { arg: '', expected: false },
    { arg: '05.2', expected: false },
    { arg: '1.02', expected: false },
  ];
  // eslint-disable-next-line mocha/no-setup-in-describe
  releaseBranchNumberRegexTests.forEach((test) => {
    it(`releaseBranchNumberRegex matches '${test.arg}' as ${test.expected}`, function () {
      const match = sut.releaseBranchNumberRegex.exec(test.arg);
      const result = match != null;
      expect(result).to.equal(test.expected);
    });
  });

  const releaseVersionRegexTests = [
    { arg: 'v0.0.0', expected: true },
    { arg: 'v1.0.0', expected: true },
    { arg: 'v0.1.0', expected: true },
    { arg: 'v12.13.14', expected: true },
    { arg: 'v1', expected: false },
    { arg: 'v1.', expected: false },
    { arg: 'v1.0', expected: false },
    { arg: 'v1.0.', expected: false },
    { arg: 'v00.00.00', expected: false },
    { arg: 'v01.0.0', expected: false },
    { arg: 'v0.01.0', expected: false },
    { arg: 'v0.0.01', expected: false },
    { arg: 'v00.00.00', expected: false },
  ];
  // eslint-disable-next-line mocha/no-setup-in-describe
  releaseVersionRegexTests.forEach((test) => {
    it(`releaseVersionRegex matches '${test.arg}' as ${test.expected}`, function () {
      const match = sut.releaseVersionRegex.exec(test.arg);
      const result = match != null;
      expect(result).to.equal(test.expected);
    });
  });
});
