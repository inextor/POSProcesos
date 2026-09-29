# Colors fix — POSReservaciones20 must match legacy POS (colors only)

Reference: RMCELL prefs row (`POS_rmcell.preferences`, id=1):
menu `COLOR #9abd48`, menu text `#4a4a4a`, icons `#648f00`, title `#666666`,
submenu `#a2a0a0` @45% + white text, header `#9abd48`/black text,
titles `#666666`, text `#4d4d4d`, btn-primary `#648f00` + gradient overlay.

Legacy code and DB stay untouched. All changes in `POSReservaciones20` only.

## Steps

- [x] **1. Fix sidebar background consumption**
  - File: `src/app/modules/shared/page-structure/page-structure.component.css`
  - Change: in `.ps-menu`, delete the trailing hardcoded
    `background-color: rgba(0,0,0,0.1);` so only
    `background: var(--menu-background-image);` +
    `background-color: var(--menu-background-color);` remain (legacy order).
  - Verify: sidebar computes to `rgb(154,189,72)` (green).

- [ ] **2. Restore missing fallback assets**
  - Copy from `/home/nextor/Projects/POS/src/assets/` to `src/assets/`:
    `default_background.webp`, `default_login_background.webp`
    (plus `default_background.jpg` if referenced).
  - Compare the two `default_menu_background.jpg` files visually;
    default to legacy's file unless the new one is intentional.
  - Verify: no 404s for `/assets/default_*` in the network tab.

- [ ] **3. Align `:root` defaults in `src/styles.css` with legacy `POS/src/css/styles.css`**
  - Replace unreachable `http://127.0.0.159/...` URLs:
    `--background-image` → `url(/assets/default_background.webp) no-repeat fixed center/cover transparent`,
    `--login-background-image` → `url(/assets/default_login_background.webp)`.
  - Align `--menu-background-*`, `--submenu-*`, `--menu-*-color` defaults with legacy
    (keep new values where they already match the RMCELL row:
    titles `#666666`, text `#4d4d4d`, card border `#B5B5B5`).
  - Verify: `grep -rn "127.0.0.159" src/` returns nothing.

- [ ] **4. Port missing global color rules into `src/styles.css`**
  - From legacy `styles.css` + `custom_theme.css`: `h1–h4` titles color,
    `body` text color, `.login_background`, link colors,
    full `.btn-primary` / `.btn-secondary` rules with `:hover` / `:active` /
    `:disabled` (fixing the buggy combined `.btn-secondary, .btn-primary:visited…` selector),
    and `.btn.btn-success` button-style overlay.
  - Verify: primary button shows `#648f00` + gradient; hover/active states themed.

- [ ] **5. Wire login background**
  - File: `src/app/pages/login/login.component.html`
  - Change: add the `login_background` class to the page container (as in legacy).
  - Verify: login page background matches legacy.

- [ ] **6. Verify preferences parity (no code change)**
  - Open both apps against the same RMCELL backend/host; compare
    `localStorage.preferences` JSON and the `preferences.php` response.
  - Both must return the RMCELL row (id=1). If the new app resolves to another
    tenant (e.g. `POS_test`/Darigold), that is a deploy/backend-routing issue.

- [ ] **7. Final side-by-side check**
  - Screenshot-compare vs legacy: sidebar (collapsed + one submenu expanded),
    header, a card page, a primary button incl. hover, login page.
  - Repeat once with cleared `localStorage` (defaults/first-paint path).
  - Build passes with no new warnings.

## Non-goals

- Red sandbox/test banner (explicitly excluded).
- Sales-chart colors (new `dashboard` is an empty stub; wire
  `charts_colors` when `dashboard-user`/ngx-charts is ported).
- Layout or menu-structure differences.
