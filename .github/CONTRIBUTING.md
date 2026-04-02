# Contribution Guide

## Branch Naming

Use one branch per issue:

- `feat/<issue-number>-<short-kebab-name>`
- `fix/<issue-number>-<short-kebab-name>`
- `chore/<issue-number>-<short-kebab-name>`
- `docs/<issue-number>-<short-kebab-name>`

Examples:

- `feat/42-ajout-filtre-carte`
- `fix/57-crash-scan-arrivee`

## Commit Convention

Use concise commits and reference the issue number.

Examples:

- `feat: ajouter la recherche sur la carte (#42)`
- `fix: corriger le crash du scan QR (#57)`

## Pull Request Rules

- One PR per issue.
- Link the issue in the PR description using `Closes #<number>` when possible.
- Keep PRs small and reviewable.
- Add screenshots for UI changes.

## Workflow With GitHub Project

Recommended statuses in your project board:

- `Backlog`
- `Ready`
- `In Progress`
- `In Review`
- `Done`

When starting work:

1. Move the issue card to `In Progress`.
2. Create the branch with the naming convention above.
3. Open a PR early and link it to the issue.
