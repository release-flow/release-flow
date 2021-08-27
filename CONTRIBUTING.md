# Contributing

First of all, thanks for thinking of contributing to this project! 👏

Following these guidelines helps to communicate that you respect the time of the maintainer and developing this open
source project. In return, they should reciprocate that respect in addressing your issue, assessing changes, and helping
you finalize your pull requests.

Please note we have a [code of conduct](./CODE_OF_CONDUCT.md), please follow it in all your interactions with the project.

## How can I contribute?

---

### Reporting bugs

Feel free to [open a ticket](https://github.com/release-flow/core/issues/new) with your bug report.

In case you've encountered a bug, please make sure:

- You are using the [latest version](https://github.com/release-flow/release-flow/releases).
- You have read the [documentation](./README.md) first, and double-checked your configuration.
- In your issue description, please include:
  - What you expected to see, and what happened instead.
  - Your operating system and other environment information.
  - As much information as possible, such as the command and configuration used.
  - Interesting logs from a verbose and/or debug run.
  - All steps to reproduce the issue.

### Suggest new features

Feature requests are also welcome. Describe the feature, why you need it, and how it should work. Please provide as much
detail and context as possible.

### Code contributions

When contributing to this repository, please first discuss the change you wish to make via issue,
email, or any other method with the owners of this repository before making a change.

### Pull Requests

Pull requests are welcome! If you never created a pull request before, here are some tutorials:

- [Creating a pull request](https://help.github.com/articles/creating-a-pull-request/)

- [How to Contribute to an Open Source Project on GitHub](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github)

Please keep the following in mind:

- Make sure the tests pass (run `npm test`). Your changes probably deserve new tests as well.
- Remember that this project is cross-platform compatible (macOS, Windows, Linux), and that it runs in different
  versions of Node. On PR submission, a [GitHub Action](https://github.com/release-flow/core/actions) will run the
  tests in multiple supported platforms and Node.js versions.

Unsure about whether you should open a pull request? Feel free to discuss it first in a ticket.

[Fork](https://help.github.com/articles/fork-a-repo/) the repository to get started, and set it up on your machine:

```bash
git clone https://github.com/<your-github-username>/release-flow
cd release-flow
npm install
```

Verify the tests are passing:

```bash
npm test
```

To use your modified version of release-flow in your project, [npm-link](https://docs.npmjs.com/cli/link.html) it:

```bash
# From your release-flow clone:
npm link

# From your project that uses release-flow:
npm link release-flow
```

## Style guide

---

### Git commit messages

- Use the present tense ("Add feature" not "Added feature")

- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")

- Limit the first line to 72 characters or less

- Reference issues and pull requests liberally after the first line

### Typescript style guide

All Typescript code is linted with [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/).

## Release process

---

(These are mainly notes for the maintainer, if you are contributing you won't need to worry about this)

The release process is driven by [release-it](https://github.com/release-it/release-it). First you create a draft
GitHub release locally by using `release-it`, then you publish the release through the GitHub web UI.

To create a draft release:

1. On your local computer, checkout the `master` branch.
2. Update the [changelog](./CHANGELOG.md).
3. Run `npm run release` with the options you want, then follow the prompts. The two most useful options are `--dry-run`
   and `--preRelease=alpha` (or whatever the pre-release version is). Note that you need to add `--` before any release-it
   arguments.

Example:

```shell
npm run release -- --dry-run --preRelease=alpha
```

The release-it settings are configured to create a draft release on GitHub. Once the release is published within GitHub,
an [automated workflow](.github/workflows/npmpublish.yml) publishes the package to the `npm` repository.

Note: in order to run the release process, you need to set up the `RELEASEMGMT_GITHUB_API_TOKEN` environment variable
on your local computer. This should contain a GitHub PAT with the appropriate permissions - see the
[release-it documentation](https://github.com/release-it/release-it/blob/master/docs/github-releases.md) for more details.
