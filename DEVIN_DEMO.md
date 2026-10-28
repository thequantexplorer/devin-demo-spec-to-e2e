# Devin demo: Spec to a recorded end-to-end feature

**What it shows:** Devin implements a feature from a written spec, writes a test for each acceptance criterion, records the UI in a browser, and maps each criterion to a test or video timestamp in the PR.

**Needs:** GitHub only

More demos: [devin-advanced-demos](https://github.com/thequantexplorer/devin-advanced-demos)

## Set it up

1. Click **Use this template → Create a new repository** (or fork it) into your own GitHub account or org.
2. In Devin, open [**Settings → Connections → GitHub**](https://app.devin.ai/settings/connections/github) and make sure Devin can access the new repository.

## Prompt

Start a new Devin session and paste this. Replace `<you>` with your GitHub user or org.

```text
Implement the spec in docs/specs/wip-limits.md on https://github.com/<you>/devin-demo-spec-to-e2e end to end: per-column WIP limits enforced by the API (409 when full), editable limits in the UI, toast feedback, and persistence.

Write API tests for every acceptance criterion in the spec, then test the real UI in a browser and record it: show setting a limit, hitting it by dragging a card, the toast, and the 409 being enforced. Open a PR that maps each acceptance criterion to the test or recording timestamp that proves it.
```
