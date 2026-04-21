# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- All commands now resolve the main worktree root via `git rev-parse --git-common-dir` instead of `--show-toplevel`, so wbaum works correctly when invoked from inside a linked worktree (e.g. after `wbaum open` drops you into `.wbaum/<branch>`).

## [0.1.0] - 2026-04-21

### Added

- `wbaum open <branch>` — create a worktree, run setup, and launch a subshell. Supports `--from`, `--no-setup`, and `--no-shell`.
- `wbaum list` (`ls`) — tabular view of all wbaum-managed worktrees with branch, HEAD, path, and lock status.
- `wbaum cd <branch>` (`enter`) — enter an existing worktree in a subshell; prints the path when stdout is not a TTY.
- `wbaum remove <branch>` (`rm`) — remove the worktree and delete its branch. Supports `--force` and `--keep-branch`.
- `wbaum prune` — run `git worktree prune -v` to clean up stale administrative records.
- `.wbaum.yaml` / `.wbaum.yml` config with a `setup:` list of shell commands; `$WBAUM_BRANCH` and `$WBAUM_WORKTREE` are injected into each command's environment.
- Worktrees are created under `.wbaum/<branch>` and the directory is automatically added to `.gitignore`.
- Shell integration snippet (`wb()`) documented for in-place `cd` without a subshell.

[Unreleased]: https://github.com/runwisp/wbaum/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/runwisp/wbaum/releases/tag/v0.1.0
