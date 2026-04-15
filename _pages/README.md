# _pages/

This directory is the MkDocs source for the PiTH GitHub Pages site.

It is not the repo's documentation for developers — see CLAUDE.md and the repo README for that.

## How it works

The CI workflow (`.github/workflows/docs.yml`) copies the golden documentation markdowns from `_golden/documentation/markdowns/` into this directory, then runs `mkdocs build` to produce the `site/` output that gets deployed to GitHub Pages.

Do not edit the `.md` files here directly. They are overwritten on every docs deploy. Edit the source files in `_golden/documentation/markdowns/` instead.
