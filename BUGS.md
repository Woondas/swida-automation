## Found bug: Missing validation in the Waypoints step

- **Environment**: stage

### Reproduction steps
1. Go to [Request create](/request/create).
2. In the first "Waypoints" step, leave the **Earliest pickup time** or **Latest delivery time** field empty.
3. Try to proceed to the next step ("Next/Continue" button).

### Expected behavior
- The **Earliest pickup time** for the pickup point and **Latest delivery time** for the delivery point
  - is required; you cannot proceed until it is filled in.
- A validation message is displayed and the field is visually highlighted.

### Actual behavior
- The application allows proceeding even with an empty field (missing validation block).

### Impact
- **Degraded UX** – the user does not get immediate feedback about the missing value.

---

## Found bug: After deleting all waypoints and switching to "Round trip", a new waypoint is not added

- **Environment**: stage
- **Affected pages**: [Request create](/request/create)

### Reproduction steps
1. Go to [Request create](/request/create).
2. In the "Waypoints" step, delete all existing waypoints.
3. Switch the route toggle to "Round trip".
4. Click **Add waypoint**.

### Expected behavior
- Cannot strictly define the expected behavior without acceptance criteria.

### Actual behavior
- After clicking **Add waypoint**, no waypoint is added (no change on the screen).
- If we switch back to **One way**, we still cannot add a waypoint.

### Impact
- Blocks continuing the request creation flow when using "Round trip" after deleting waypoints.

## Found bug: Refresh while editing "New request" redirects to the list

- **Environment**: stage
- **Affected pages**: [Request create](/request/create), [Request list](/request/list)

### Reproduction steps
1. On the requests list page, click **New request** (you will navigate to [Request create](/request/create)).
2. Press **Back** in the browser.
3. A dialog "Do you really want to leave?" appears – click **Continue editing**.
4. Then perform a **refresh** of the page (F5 / Ctrl+R).

### Expected behavior
- Stay on [Request create](/request/create) and continue editing.

### Actual behavior
- After refresh, you are redirected to [Request list](/request/list), interrupting the editing.

