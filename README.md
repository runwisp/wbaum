# wbaum

> A delightful git worktree manager — spin up isolated branch workspaces with one command, run per-project setup automatically, and jump straight into a ready-to-code shell.

[![npm version](https://img.shields.io/npm/v/wbaum.svg?style=flat-square)](https://www.npmjs.com/package/wbaum)
[![license](https://img.shields.io/badge/license-GPL--3.0-blue.svg?style=flat-square)](./LICENSE)
[![node](https://img.shields.io/node/v/wbaum.svg?style=flat-square)](https://nodejs.org)

```sh
bunx wbaum open feature/login
# or
npx wbaum open feature/login
```

That's it. `wbaum` creates a `git worktree` based on your current branch, runs any setup commands you've defined, and drops you into a shell inside the new workspace. Exit the shell to come back — your original checkout is untouched.

---

## Why wbaum?

Git worktrees are one of the most underused superpowers in git. They let you check out multiple branches **at the same time**, each in its own directory, sharing the same `.git` — no stash juggling, no "let me just commit this wip" dance. But using them raw is clunky: you have to pick a path, remember to install dependencies, copy `.env` files, and then manually `cd` in.

**wbaum** turns worktrees into a first-class workflow:

- 🌳 **One command to go** — `wbaum open <branch>` creates the worktree, runs setup, and drops you in.
- ⚙️ **Zero-config, config-optional** — add a `.wbaum.yaml` and setup (install, link env files, seed DBs) runs automatically every time.
- 🧘 **Stays out of your way** — all worktrees live under `.wbaum/`, auto-added to `.gitignore`, never polluting your main checkout.
- 🧹 **Clean teardown** — `wbaum rm <branch>` removes the worktree *and* the branch in one step.
- 🪄 **Zero install** — works through `bunx` and `npx`. No global install needed.
- 🎨 **Cool, simple TUI** — colorful output, spinners, clean tables. No noise, no ceremony.

Perfect for: reviewing PRs, testing risky refactors in parallel, running multiple dev servers on different branches, AI coding agents that need isolated scratch spaces, monorepos with heavy install steps.

---

## Install

You don't have to. Just run it:

```sh
bunx wbaum open my-branch
npx  wbaum open my-branch
```

Or install globally:

```sh
npm i -g wbaum
pnpm add -g wbaum
bun add -g wbaum
```

Requires **Node 18+** and a working `git` in your `$PATH`.

---

## Quick start

From anywhere inside your git repo:

```sh
wbaum open feature/login
```

This will:

1. Create a new branch `feature/login` based on the current branch.
2. Add a git worktree at `./.wbaum/feature/login`.
3. Append `.wbaum/` to `.gitignore` (once, if missing).
4. Run every command in `.wbaum.yaml`'s `setup:` list inside the new worktree.
5. Launch your `$SHELL` in that directory so you can start working immediately.

When you're done, just `exit` the shell. You're back where you started.

### `.wbaum.yaml`

Optional, lives at the repo root. The only thing it needs is a `setup:` list of shell commands — they run sequentially in the fresh worktree:

```yaml
setup:
  - pnpm install
  - cp ../../.env .env
  - pnpm db:migrate
```

Inside each command you get two environment variables:

| Variable          | What it is                                 |
| ----------------- | ------------------------------------------ |
| `$WBAUM_BRANCH`   | The branch name you opened                 |
| `$WBAUM_WORKTREE` | The absolute path to the worktree         |

That's the entire config schema. It's meant to stay small.

---

## Commands

```
wbaum open <branch> [--from <base>] [--no-setup] [--no-shell]
wbaum list
wbaum cd <branch>
wbaum remove <branch> [--force] [--keep-branch]
wbaum prune [--dry-run] [--force] [--keep-branches]
wbaum --help | --version
```

### `open`

Create (or re-enter) a worktree and launch a shell in it.

| Flag          | Effect                                                                       |
| ------------- | ---------------------------------------------------------------------------- |
| `--from <b>`  | Base the new branch on `<b>` instead of the current branch                   |
| `--no-setup`  | Skip `.wbaum.yaml` setup commands                                            |
| `--no-shell`  | Don't spawn a subshell; in non-TTY mode prints the worktree path to stdout   |

Aliases: `wbaum enter`, `wbaum cd` for existing worktrees.

If the branch already exists locally, wbaum attaches to it. If the worktree already exists, wbaum skips creation and just enters it.

### `list` (`ls`)

Show every wbaum-managed worktree with branch, HEAD, path, and lock status.

### `cd <branch>` (`enter`)

Enter an existing worktree in a subshell. In a TTY, spawns `$SHELL`. In a non-TTY context, prints the path — handy for shell integrations:

```sh
cd "$(wbaum cd my-branch)"
```

### `remove <branch>` (`rm`)

Remove the worktree and delete the branch. Flags:

- `--force` — force-remove a dirty worktree and force-delete an unmerged branch
- `--keep-branch` — remove only the worktree, keep the branch around

### `prune`

Removes worktrees whose branches have been merged into the default branch, deletes those branches, and then runs `git worktree prune -v` to clean up stale administrative records.

Detects both regular merges (strict ancestor) **and** squash/rebase merges (the branch's cumulative patch is already upstream — the typical GitHub "Squash and merge" workflow). The default branch is resolved from `origin/HEAD`, falling back to a local or remote `main`/`master`. Locked worktrees and the default-branch worktree itself are never touched.

Flags:

- `--dry-run` (`-n`) — list what would be removed without changing anything
- `--force` (`-f`) — force-remove dirty worktrees and force-delete branches
- `--keep-branches` — remove the worktrees but keep the merged branches around

---

## Shell integration (optional)

Because wbaum runs in its own process, it can't change your parent shell's directory. That's why it spawns a subshell — it's the most robust cross-shell solution and works identically in bash, zsh, fish, and PowerShell.

If you'd rather change directory in-place, add this to your `.bashrc` / `.zshrc`:

```sh
wb() {
  if [ "$1" = "cd" ] || [ "$1" = "open" ]; then
    local path
    path="$(command wbaum "$@" --no-shell --no-setup 2>/dev/null)"
    [ -n "$path" ] && cd "$path"
  else
    command wbaum "$@"
  fi
}
```

Then `wb cd feature/login` cd's you in directly.

---

## How it compares

- **`git worktree add`**: the primitive wbaum wraps. wbaum adds convention (a predictable location), automation (setup commands), ergonomics (TUI, cleanup, defaults), and discoverability (`list`, `rm`).
- **`git-branchless`, `gh worktree`, `wt`**: more powerful, more opinions. wbaum intentionally does one thing.
- **Direnv / Nix shells**: complementary. Put `direnv allow` in your `.wbaum.yaml` setup list and they compose.

---

## Development

```sh
git clone https://github.com/runwisp/wbaum
cd wbaum
npm install
npm test
node bin/wbaum.js --help
```

Contributions welcome — the whole tool is a few hundred lines of plain ES modules with minimal dependencies (`picocolors`, `yaml`).

---

## License

[GPL-3.0-or-later](./LICENSE) © runwisp contributors
