# Spec: WIP limits per column

**Why:** "In progress" keeps filling up. We want to enforce work-in-progress limits like a real kanban team.

## Requirements
1. Each column can have an optional `wipLimit` (positive integer). Seed defaults: In progress = 3, Review = 2. To do and Done are unlimited.
2. The column header shows `count / limit` (e.g. `3 / 3`) when a limit is set; just the count otherwise.
3. When a column is **at** its limit the header turns amber; it can never go over.
4. Moving or adding a card into a full column is rejected by the API with `409 {"error":"WIP limit reached for In progress (3)"}`; the UI shows that message in a dismissible toast and the card snaps back to its original column.
5. Each column header has a small "Edit limit" control (pencil) that opens an inline number input; Enter saves via `PATCH /api/columns/:id {"wipLimit": n}`, empty clears the limit. Setting a limit below the current count is allowed but blocks new cards until it drains.
6. Limits persist in `data/board.json` like cards.

## Acceptance
- API tests for 409 on move/add into a full column, and for PATCH /api/columns.
- A recorded browser run that: drags a card into a full "In progress" column and sees the toast + snap-back; raises the limit to 4 via the pencil control; drags again and it succeeds; header reads `4 / 4` in amber.
