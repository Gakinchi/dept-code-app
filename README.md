# Dept Case App

Demo code app for the recursion.no guide on team access, ALM and Git branches for Power Apps code apps.

- `pa app run` runs the app on your machine against the tables in the Dev environment.
- Only `main` is published to Dev, and only by the GitHub Actions job in `.github/workflows/publish.yml`.
- `power.config.json` and `src/generated/` change through the `pa` CLI, never by hand. See `.github/CODEOWNERS`.
