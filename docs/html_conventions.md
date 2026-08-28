# HTML Conventions

This document formalizes the HTML / template rules that every page must follow.
It extends `docs/CONVENTIONS.md` §8 (Html rules) and `docs/page-architecture.md`.
For the current violation audit see `BIG_REVIEW.md`.

---

## 1. General HTML Rules

- **One tag per line.** No multiple tags on one line, no attribute wrapping onto extra lines.
  ```html
  <!-- YES -->
  <br>
  hello<br>
  <b class="foooo">world</b>
  <b>Hello</b>
  <span class="x">
      world
  </span>
  ```
  ```html
  <!-- NO -->
  <a class="hello"
    href="xxx">
    world
  </a>
  <br>Hello<br><br>
  ```
- **Only exception: inline SVG on one line** — `<svg ...><g ...>...</g></svg>` must stay on a single line.
- **After creating or changing any HTML**, re-check this file.
- Prefer Angular control flow: `@if`, `@for ... track`, `@empty`. Do not use `*ngIf`/`*ngFor` in new code.
- **Never call functions in the template.** Precompute display values in `.map()` and bind `{{ user.age }}` / `{{ user.name_display }}` — no `{{ getAge(user) }}`. There is no signal exception (app is zone-based).

---

## 2. Buttons

There are exactly two visual variants and two allowed tags.

### 2.1 Variants

| Variant | Class | Purpose |
|---------|-------|---------|
| Primary | `class="btn btn-primary"` | Main action — save, search, confirm, edit. |
| Secondary | `class="btn btn-secondary"` | Alternative/cancel — back, cancel, volver, navigation to an add page. |

Only these two classes are allowed for page-level actions. Do not use `btn-danger`, `btn-warning`, etc. for primary/secondary flow (row actions inside tables may keep contextual classes out of scope).

### 2.2 Tag Rule

| Situation | Tag | Requirement |
|-----------|-----|-------------|
| Link / navigation (`routerLink`, `href`, `[href]`) | `<a>` | **Never** `<button>` with a link. |
| Action (calls code) | `<button>` | **Must** have `(click)` or `type="submit"` inside a `<form (ngSubmit)>`. |

```html
<!-- YES — link is anchor -->
<a class="btn btn-secondary" [routerLink]="['/add-account']">Agregar Nuevo</a>
<a class="btn btn-primary btn-sm" [routerLink]="['/edit-bank-account', ba.id]">Editar</a>

<!-- NO — link on button -->
<button type="button" class="btn btn-secondary" [routerLink]="['/add-account']">Agregar Nuevo</button>

<!-- YES — action is button -->
<button type="button" class="btn btn-primary" (click)="search(search_object)">Buscar</button>
<button type="submit" class="btn btn-primary">Guardar</button>

<!-- NO — button without handler -->
<button type="button" class="btn btn-primary">Buscar</button>

<!-- NO — anchor styled as button without href/routerLink nor click -->
<a class="btn btn-primary">Asignar nuevo</a>
```

All `<button>` that are not `type="submit"` must have a `(click)` binding. All `<a class="btn ...">` must have either `[routerLink]`/`routerLink`/`href`/`[href]` or `(click)`.

### 2.3 Placement Rule

- `btn-primary` must be **inside** a `div.card` at any depth (inside `card-body`/`card-footer` counts, but see §3 for nesting).
- `btn-secondary` must be **outside** any `div.card`.

Rationale: primary actions belong to the card's content/footer; secondary navigation/cancel sits outside the card chrome or in the page header.

```html
<!-- YES -->
<div class="card p-3">
  <form (ngSubmit)="save()">
    <div class="text-end">
      <button type="submit" class="btn btn-primary">Guardar</button>
    </div>
  </form>
</div>
<div class="d-flex justify-content-end mt-3">
  <a class="btn btn-secondary me-2" routerLink="/list-account">Cancelar</a>
</div>

<!-- NO — primary outside card -->
<button class="btn btn-primary" (click)="exportToExcel()">Exportar</button>
<div class="card">...</div>

<!-- NO — secondary inside card -->
<div class="card p-3">
  <button class="btn btn-secondary" (click)="location.back()">Cancelar</button>
  <button type="submit" class="btn btn-primary">Guardar</button>
</div>
```

Destructive actions must still confirm via `ConfirmationService` — the placement rule does not replace confirmation.

---

## 3. Cards

- Cards use `class="card"` (exact token, not `card-body`/`card-header`/`card-footer` alone). A bare `card-body` without a `card` parent is **invalid**.
- **Never nest cards:** `div.card > div.card` or `.card .card` at any depth is forbidden. `card-header`, `card-body`, `card-footer` inside a single `card` are fine.

```html
<!-- YES — siblings, not nested -->
<div class="card p-3 mb-3">
  <div class="card-body">Filters...</div>
</div>
<div class="card p-3">
  <div class="card-body">Content...</div>
</div>

<!-- YES — header/body/footer inside one card -->
<div class="card">
  <div class="card-header">Title</div>
  <div class="card-body">...</div>
  <div class="card-footer">...</div>
</div>

<!-- NO — card inside card -->
<div class="card">
  <div class="card border-success">Nested</div>
</div>

<!-- NO — card-body without card -->
<div class="card-body">
  <form>...</form>
  <table>...</table>
</div>
```

Summary grids (e.g., 8 colored stat cards) must be `row > col-* > card` siblings, not children of an outer `card`.

---

## 4. Page Layout

Every page **except printed pages** must follow this vertical order. Printed pages (those that call `window.print`, use `@media print`, `d-print`, or are explicit print templates like `print-receipt`) are exempt.

```
container-fluid
├── title                               — <h1> (or h2-h4) as first element, set via setTitle() as well
├── filters                             — inside div.card (div.card > div.card-body > form with inputs/selects)
├── pagination?                         — <app-pagination> outside cards (optional, before content)
├── content                             — inside div.card (table, form, detail sections)
└── pagination?                         — <app-pagination> outside cards (optional, after content)
```

Notes:

- Title is required. Use `<h1 class="my-3">Page Name</h1>` (or `h2`/`h3`). Also call `this.setTitle()` in `ngOnInit`.
- Filters, if the page has any `<input>`/`<select>`/search components, must be inside the filters card. Save/View pages with no filters still need the content card (the form/detail is the content).
- Pagination, when used, must be **outside** cards, between filters and content and/or after content — never inside a card.
- Content (table, detail, form) must be inside the content card. A `<table>` or `<form>` outside a `card` is a violation.
- A page with no `div.card` at all is a violation (unless dashboard/shell explicitly exempted — confirm with owner).

Minimal skeleton:

```html
<div class="container-fluid">
  <div class="row align-items-center">
    <div class="col">
      <h1 class="my-3">List Title</h1>
    </div>
    <div class="col-auto">
      <a class="btn btn-secondary" [routerLink]="['/add-entity']">Agregar</a>
    </div>
  </div>

  <div class="card p-3 mb-3">
    <div class="card-body">
      <form (ngSubmit)="search(search_object)">
        <div class="row">
          <div class="col-md-4">
            <label>Field</label>
            <input class="form-control" [(ngModel)]="search_object.eq.field">
          </div>
          <div class="col-md-2 d-flex align-items-end">
            <button type="submit" class="btn btn-primary w-100">Buscar</button>
          </div>
        </div>
      </form>
    </div>
  </div>

  <app-pagination [current_page]="current_page" [total_pages]="total_pages" (page_change)="onPageChange($event)"></app-pagination>

  <div class="card p-3">
    <div class="table-responsive">
      <table class="table table-bordered table-striped">...</table>
    </div>
  </div>

  <app-pagination [current_page]="current_page" [total_pages]="total_pages" (page_change)="onPageChange($event)"></app-pagination>
</div>
```

Save page variant:

```html
<div class="container-fluid">
  <h1 class="my-3">{{ entity.id ? 'Actualizar' : 'Agregar' }} Entity</h1>
  <div class="card p-3">
    <form (ngSubmit)="save($event)">
      <!-- fields -->
      <div class="text-end">
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>
  </div>
  <div class="d-flex justify-content-end mt-3">
    <a class="btn btn-secondary" routerLink="/list-entity">Cancelar</a>
    <!-- or <button class="btn btn-secondary" (click)="location.back()">Cancelar</button> -->
  </div>
</div>
```

---

## 5. Checklist for New / Modified Pages

- [ ] One tag per line (inline SVG exception only).
- [ ] No function calls in template — precompute in `.map()`.
- [ ] Every `btn-primary` is inside `div.card`; every `btn-secondary` is outside `div.card`.
- [ ] No `div.card` inside another `div.card`; no bare `card-body` without `card`.
- [ ] If `routerLink`/`href` → `<a>`; if action → `<button (click)>` or `type="submit"`.
- [ ] Title → filters card → pagination? → content card → pagination? (unless printed).
- [ ] `is_loading` handled via `forkJoin` + `BaseComponent` pattern if the page loads data.

---

## 6. Auditing

The violation audit in `BIG_REVIEW.md` was generated with a card-depth stack (strict `class="card"` token) and button regex. Re-run the same checks before merging:

```bash
python3 - << 'PY'
import pathlib, re
def is_card_div(tag):
    m = re.search(r'class="([^"]*)"', tag, re.I)
    return bool(m and 'card' in m.group(1).split())
# ... scan html files for LINK_ON_BUTTON, PRIMARY_OUTSIDE, SECONDARY_INSIDE, NESTED_CARD ...
PY
```

Consider adding this as `npm run audit:conventions` in CI to block regressions.

