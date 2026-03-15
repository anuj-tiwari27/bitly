# Pre-deployment test summary (changes from past ~2 hours)

## Changes covered

1. **Analytics** – Dashboard card %: `visitors_growth` now week-over-week (analytics-processor).
2. **Dashboard** – Whole Recent Links row clickable (dashboard page).
3. **Link reactivation** – Clearing `expires_at` when toggling inactive→active (link-service).
4. **Copy button** – Clipboard fallback + error handling (utils + link detail page).
5. **Saved QR** – Preview area + placeholder (QR page).
6. **Dropdowns** – Dark theme for selects (globals.css).
7. **Invite** – Mail icon color (organizations page).
8. **Campaign cards** – Uniform layout + dark status badges (campaigns page).

---

## Test results

### Backend (pytest)

| Suite              | Result | Notes |
|--------------------|--------|--------|
| test_auth          | 4/4 OK | Token/password/refresh. |
| test_link_service  | 4/4 OK | Create, list, short code, URL validation. |
| test_redirect      | 2/2 OK | Health, 404 for unknown short code. |
| test_qr_generator | 4/4 OK | PNG/SVG, colors, sizes. |
| test_rbac_otp      | 1/2    | `test_generate_and_verify_otp_success` OK. `test_verify_otp_invalid_and_too_many_attempts` **fails** (pre-existing: expects "Too many invalid attempts" on 2nd wrong attempt; implementation returns it on 3rd). |
| e2e (Playwright)   | Skip   | Playwright browsers not installed locally (`playwright install` to run). |

**Unit tests (excluding e2e):** 15 passed, 1 failed (OTP test; unrelated to recent changes).

### Frontend

- **TypeScript:** `npx tsc --noEmit` — **passed** (no type errors).
- **Next.js build:** Run `npm run build` (or `.\node_modules\.bin\next build`) in `frontend/web` for a full production build; compile and lint had started successfully.

---

## Recommended before deploy

1. **CI:** Run `pytest tests/ -m "not e2e and not integration"` (and optionally fix or skip the OTP test).
2. **Frontend:** Run `npm run build` in `frontend/web` to completion.
3. **E2E (optional):** Install Playwright (`playwright install`) and run e2e tests if your pipeline uses them.
4. **Smoke test after deploy:** Dashboard overview, one link row click, Copy on link detail, one campaign card, one dropdown, invite form mail icon, Saved QR section.

---

## One known pre-existing failure

- **tests/test_rbac_otp.py::test_verify_otp_invalid_and_too_many_attempts**  
  Expects `"Too many invalid attempts"` on the **second** wrong code when `max_attempts=2`. Implementation returns that message only when `attempts >= max_attempts` at the **start** of the call (i.e. on the **third** attempt). Either relax the test assertion to accept `"Invalid code"` on the second attempt, or change the service to return "Too many invalid attempts" when incrementing would reach `max_attempts` (same call that exhausts attempts).
