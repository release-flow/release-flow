# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- Update momentjs and yargs to latest versions.

## [0.1.2] - 2022-05-14

### Changed

- Updated some NPM packages to fix Snyk warnings.

### Fixed

- Support `refs/heads/tags/xxx' format for tag ref, since Azure DevOps sometimes checks out in this format.
  See [GH issue #9](https://github.com/release-flow/release-flow/issues/9).

## [0.1.1] - 2021-08-28

### Added
- Add badges to README like all the cool kids.

### Changed
- Change name of CI pipeline.
### Fixed
- Minor documentation fixes.

## [0.1.1-alpha.2] - 2021-08-28

### Added
- Make NPM package public.

## [0.1.1-alpha.1] - 2021-08-28

### Added
- More tweaks to the release process.

### Changed
- Rename NPM package.

## [0.1.1-alpha.0] - 2021-08-28

### Added
- CI build/publish support.

## [0.1.0] - 2021-08-27

### Added
- Initial revision.
