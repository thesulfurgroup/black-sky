# Claude Code Instructions for thesulfurgroup/black-sky

## Security

NEVER include claude.ai session links, session IDs, or any claude.ai URLs in:
- Commit messages
- PR titles or descriptions
- Code comments
- Any files in this repository

This is a hard rule with no exceptions. The `.githooks/commit-msg` hook enforces this at the git level.

## Repository Setup

After cloning, run:
```
git config core.hooksPath .githooks
```
This activates the commit-msg hook that blocks session links.

## Architecture

- CSS/JS files are served via jsDelivr CDN at `cdn.jsdelivr.net/gh/thesulfurgroup/black-sky@main/`
- Squarespace pulls these in via code injection
- On push to main, `.github/workflows/purge-cdn.yml` automatically purges the CDN cache
