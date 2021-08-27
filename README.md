
# Release Flow

This package provides a library and command-line tool that generate a unique version number for a Git commit by
analysing a Git repository. The repo is assumed to follow [Release
Flow](https://devblogs.microsoft.com/devops/release-flow-how-we-do-branching-on-the-vsts-team/) conventions.

The command outputs version variables based on information in the repository.

## Installation

```shell
npm install release-flow-git-version
```

## Command-line usage

Example:

```shell
npx rfver --pretty
```

You can see a full list of command-line options as follows:

```shell
npx rfver --help
```

## Output

The command outputs properties that provide a unique version for the current commit:

```json
{
  "major": 2,
  "minor": 3,
  "patch": 1,
  "preReleaseLabel": "alpha",
  "sha": "67ebcd27627ed01760098f0f9779556b49ece66a",
  "buildType": "alpha",
  "branchName": "main",
  "commitDate": "2021-08-18T16:49:16.000Z",
  "commitsSinceVersionSource": 1,
  "versionSourceSha": "22443ada1ceee500b563645a2bf0bebf576028c9",
  "majorMinor": "0.0",
  "majorMinorPatch": "0.0.1",
  "shortSha": "67ebcd2",
  "semVer": "2.3.1-alpha.1"
}
```

### Property values

| Property              | Description                                                                   |
| --------------------- | ----------------------------------------------------------------------------- |
| major                 | Major version number |
| minor                 | Minor version number |
| patch                 | Patch version number |
| preReleaseLabel       | Pre-release label (can be empty for release versions) |
| semVer                | A unique semantic version number |
| sha                   | The Git SHA-1 hash of the commit |
| shortSha              | An abbreviated version of `sha` |
| commitDate            | The timestamp of the Git commit |
| buildType             | Denotes the type of branch the build (1) |
| branchName            | The abbreviated name of the branch |
| versionSourceSha      | The Git SHA-1 hash of the version source (2) |
| commitsSinceVersionSource | The number of commits between the version source and the current commit |
| majorMinor            | Major and minor version, joined with `.` |
| majorMinorPatch       | Major, minor, and patch version, joined with `.` |

#### Notes

##### 1. buildType

Possible values:

| Value | Meaning |
| ----- | ------- |
| `alpha` | Build is on the trunk branch |
| `beta` | Build is on a `release/*` branch |
| `release` | Build is from a release tag |
| `pull-request` | Build is from a `refs/pull/*` branch |
| `working-branch` | Build is from another branch, assumed to be a short-lived working branch |

##### 2. Version Source

The version source indicates the commit that the calculated version number is based on. The version source can be:

- The initial commit in the repo.

- The commit from which the closest reachable release branch was forked (if on trunk branch).

- The closest commit on the current branch that was tagged with a release number (if on a release branch).

## Configuration

A file (by default called `rfconfig.yml`) should be present in the repository root directory to configure the behavior
of the task, in particular the selection of which versioning strategy variant (see below) to use.

A basic file looks like this:

``` yaml
strategy:
  kind: SemVer # or Milestone
```

A few more options exist, but they are for unusual use cases:

``` yaml
strategy:

  # The version numbering strategy - see below for details.
  # Allowed values: 'SemVer' or 'Milestone', default 'SemVer'
  kind: SemVer

  # The initial seed version number if no version sources (release branches or tags)
  # are present in the repository. If using Milestone strategy, the baseNumber should
  # simply be the major version e.g. 2. Defaults to 0.0, or 0, depending on the
  # numbering strategy.
  baseNumber: 2.1

# The prefix that identifies a release branch. Default = 'release/'
releaseBranchPrefix: 'myrelease/'

# Prefixes for working branches (not release or trunk). Defaults to
# ['feature/', 'bugfix/', '- hotfix/', 'merge/']
workingBranchPrefixes:
- feat-
- bug-

# Whether to remove the working branch prefix from the branch name when generating the preReleaseLabel.
# Default: true
stripBranchPrefixFromLabel: false

# Whether to fail with an error if the branch is not recognised as release or trunk, and its prefix doesn't match
# a working branch prefix. Default: true
failOnUnknownPrefix: false

# The name of the trunk or long-running branch in Release Flow. Defaults to
# 'master' for backward compatibility.
trunkBranchName: 'main'

```

## Versioning variants

There are two supported variants of Release Flow:

- Semantic versioning

- Milestone versioning

Both variants output build numbers in a similar format, but there are subtle differences between them in terms of how
the version number increments.

### Semantic versioning

This variant assumes that you want to produce build version numbers that are compatible with [Semantic
Versioning](https://semver.org/), e.g. `1.2.3-beta.1`. It's most suitable for creating builds of packages that other
builds depend on, e.g. NuGet packages, where the semantic meaning of a breaking change is important.

In this variant, you create a release branch for each Minor version number, e.g. `release/2.1`. The Minor version of
non-release branches increments automatically based on the latest reachable release branch. On the release branch, the
Patch version increments by tagging.

If you want to increment the Major version, simply create a release branch with a changed Major version number e.g.
`release/3.0`. It's up to you to ensure that you create appropriately-numbered release branches, so don't go backwards
with your branch numbering.

### Milestone versioning

This variant is most suitable for creating builds of code that doesn't have any other code dependent on it, e.g. web
apps. In this variant, it's the Major version number that is incremented for each 'Milestone' (release branch), and the
Patch version number is always 0.

In Milestone versioning, you create a release branch for each Milestone in the form `release/M1` (the prefix is
configurable).

Note that this variant still produces version numbers that are syntactically identical to semantic version numbers - the
difference is that a change in Major version doesn't necessarily indicate a breaking change.

## Branch naming

The task makes various assumptions about the branching structure based on Release Flow conventions - for a deeper
understanding, consult the source code! - but basically it assumes that:

- A long-running branch exists. The branch name can be configured in `rfconfig.yml` - the default is `master` for
  backward compatibility. This long-lived branch is referred to as `trunk` within this documentation, although the
  modern standard name is `main`.

- Branches in the form `release/*` denote a release preparation branch. Commits to these branches produce beta
  prerelease builds. The exact form of the sub-branch is dependent on the type of versioning that is configured.

- Creating tags in the form `vX.Y[.Z]` triggers a full release build.

- Any other branches (e.g. `bugfix/*`, `hotfix/*`, and `feature/*`) are _working branches_ that are branched from
  `trunk` and intended to be merged back to `trunk`. The changes _might_*_ get cherry-picked onto a `release/*` branch.

## Other release flows

The releaseflow.org website describes a different form of release flow, which is (as the site admits) just a 'trendy
name for the Release Branching strategy'. This is unfortunate, as the form of Release Flow described on the Microsoft
blog, and implemented here, is different in one crucial way: in true Release Flow, hotfixes to a release are first
performed on the trunk branch then cherry-picked onto the release branch (with few exceptions). In the release branching
strategy, they suggest to fix the release branch and then cherry-pick onto the trunk.

Apart from practical reasons why hotfixing the trunk is preferable (see the [MS release flow
document](https://devblogs.microsoft.com/devops/release-flow-how-we-do-branching-on-the-vsts-team/#cherry-picking-changes-into-production)),
this library doesn't currently support branching from a release branch. In true Release Flow, this hardly ever happens,
so it's not a major limitation (though a fix is planned).
