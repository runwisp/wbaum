# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.2] - 2026-04-21

### Fixed

- `wbaum list` and `wbaum prune` now resolve the main repository root via
  `git worktree list --porcelain` instead of `git rev-parse --show-toplevel`,
  so they work correctly when invoked from inside a linked worktree (e.g. from
  within `.wbaum/<branch>`). Previously, `list` reported "No wbaum worktrees
  yet" and `prune`/`remove`/`cd`/`open` operated against the wrong root.
- Applied the same fix to `wbaum cd`, `wbaum open`, and `wbaum remove` for
  consistent behavior across commands.

## [0.1.1] - 2026-04-21

### Fixed
- `wbaum list` did not work correctly inside of a worktree

## [0.1.0] - 2026-04-21

### Added

- Initial release of `wbaum`, a CLI for managing git worktrees under a
  dedicated `.wbaum/` directory.
- `open`, `list`, `cd`, `remove`, and `prune` commands for creating,
  entering, listing, cleaning up, and removing worktrees.
- Optional `.wbaum.yaml` `setup:` hooks that run project-specific commands in
  newly created worktrees.
- Automatic `.gitignore` management for `.wbaum/`, shell handoff into opened
  worktrees, and a lightweight colored terminal UI.
- Initial automated tests covering argument parsing and `.wbaum.yaml`
  configuration loading.
