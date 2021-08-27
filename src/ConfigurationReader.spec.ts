import chai, { expect } from 'chai';
import assertArrays from 'chai-arrays';
chai.use(assertArrays);
import * as fs from 'fs';
import * as path from 'path';
import { ConfigurationReader } from './ConfigurationReader';

describe('ConfigurationReader tests', function () {
  it('reads a fully-specified YAML configuration (Milestone_full) @unit', async function () {
    const contents = fs.readFileSync(path.join(__dirname, 'tests/Milestone_full.yml'));
    const sut = new ConfigurationReader();
    const opts = sut.getOptions(contents.toString());

    expect(opts).to.not.be.null;
    expect(opts.trunkBranchName).to.equal('main');
    expect(opts.releaseBranchPrefix).to.equal('myrelease/');
    expect(opts.workingBranchPrefixes).to.be.equalTo(['feat-', 'bug-']);
    expect(opts.failOnUnknownPrefix).to.be.false;
    expect(opts.stripBranchPrefixFromLabel).to.be.false;
    expect(opts.strategy.kind).to.equal('Milestone');
    expect(opts.strategy.baseNumber).to.equal(2);
  });

  it('reads a partially-specified YAML configuration (Milestone_partial) @unit', async function () {
    const contents = fs.readFileSync(path.join(__dirname, 'tests/Milestone_partial.yml'));
    const sut = new ConfigurationReader();
    const opts = sut.getOptions(contents.toString());

    expect(opts).to.not.be.null;
    expect(opts.trunkBranchName).to.equal('master');
    expect(opts.releaseBranchPrefix).to.equal('release/');
    expect(opts.workingBranchPrefixes).to.be.equalTo(['feature/', 'bugfix/', 'hotfix/', 'merge/']);
    expect(opts.failOnUnknownPrefix).to.be.true;
    expect(opts.stripBranchPrefixFromLabel).to.be.true;
    expect(opts.strategy.kind).to.equal('Milestone');
    expect(opts.strategy.baseNumber).to.equal(0);
  });

  it('reads a fully-specified YAML configuration (SemVer_full) @unit', async function () {
    const contents = fs.readFileSync(path.join(__dirname, 'tests/SemVer_full.yml'));
    const sut = new ConfigurationReader();
    const opts = sut.getOptions(contents.toString());

    expect(opts).to.not.be.null;
    expect(opts.trunkBranchName).to.equal('main');
    expect(opts.releaseBranchPrefix).to.equal('myrelease/');
    expect(opts.workingBranchPrefixes).to.be.equalTo(['feat-', 'bug-']);
    expect(opts.failOnUnknownPrefix).to.be.false;
    expect(opts.stripBranchPrefixFromLabel).to.be.false;
    expect(opts.strategy.kind).to.equal('SemVer');
    expect(opts.strategy.baseNumber).to.equal('2.1');
  });

  it('reads a partially-specified YAML configuration (SemVer_partial) @unit', async function () {
    const contents = fs.readFileSync(path.join(__dirname, 'tests/SemVer_partial.yml'));
    const sut = new ConfigurationReader();
    const opts = sut.getOptions(contents.toString());

    expect(opts).to.not.be.null;
    expect(opts.trunkBranchName).to.equal('master');
    expect(opts.releaseBranchPrefix).to.equal('release/');
    expect(opts.workingBranchPrefixes).to.be.equalTo(['feature/', 'bugfix/', 'hotfix/', 'merge/']);
    expect(opts.failOnUnknownPrefix).to.be.true;
    expect(opts.stripBranchPrefixFromLabel).to.be.true;
    expect(opts.strategy.kind).to.equal('SemVer');
    expect(opts.strategy.baseNumber).to.equal('0.0');
  });

  it('throws for a badly-specified YAML configuration (SemVer_no_strategy) @unit', async function () {
    const contents = fs.readFileSync(path.join(__dirname, 'tests/SemVer_no_strategy.yml'));
    const sut = new ConfigurationReader();
    expect(() => {
      sut.getOptions(contents.toString());
    }).to.throw(/Versioning strategy not specified in configuration/);
  });

  it('throws for a badly-specified YAML configuration (SemVer_invalid_base_number) @unit', async function () {
    const contents = fs.readFileSync(path.join(__dirname, 'tests/SemVer_invalid_base_number.yml'));
    const sut = new ConfigurationReader();
    expect(() => {
      sut.getOptions(contents.toString());
    }).to.throw(/Invalid data type for baseNumber in configuration/);
  });

  it('throws for an empty YAML configuration (SemVer_empty_file) @unit', async function () {
    const contents = fs.readFileSync(path.join(__dirname, 'tests/SemVer_empty_file.yml'));
    const sut = new ConfigurationReader();
    expect(() => {
      sut.getOptions(contents.toString());
    }).to.throw(/Invalid configuration file/);
  });

  it('throws for a badly-specified YAML configuration (SemVer_invalid_strategy) @unit', async function () {
    const contents = fs.readFileSync(path.join(__dirname, 'tests/SemVer_invalid_strategy.yml'));
    const sut = new ConfigurationReader();
    expect(() => {
      sut.getOptions(contents.toString());
    }).to.throw(/Unsupported strategy kind/);
  });
});
