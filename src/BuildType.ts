/**
 * Supported build types - these drive certain behaviours in the tasks.
 */
export enum BuildType {
  /**
   * Build is from the main (trunk) branch.
   */
  Alpha = 'alpha',
  /**
   * Build is from a release/* branch.
   */
  Beta = 'beta',
  /**
   * Build is from a 'working' branch - i.e. feature/*, bugfix/*, hotfix/*, merge/*
   */
  WorkingBranch = 'working-branch',
  /**
   * Build is from a pull request.
   */
  PullRequest = 'pull-request',
  /**
   * Build is from a release tag.
   */
  Release = 'release',
}
