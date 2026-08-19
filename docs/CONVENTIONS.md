# POSProcesos / POSReservaciones20 Conventions

This is the rulebook for this project. Follow it in every file. If you are an
AI agent, this file is loaded automatically via `AGENTS.md` at the root.

The system is a **POS / reservations app**. Backend: PHP REST API at
`/var/www/html/PointOfSale/` (uses the query-param search syntax described
below).

> **Note on Angular version:** this app is **Angular 20, zone-based** — it is
> **NOT** zoneless and does **NOT** use signals. View-bound state is a plain
> property (`is_loading = false`), not `signal(...)`. There is no signal
> exception anywhere in this document.

---

## 1. REST system (the "ugly url" system)

**Never use pretty/nested REST urls.** Do not create paths for every relation
(`/users/5/orders/3/items` needs factorial combinations of paths for tables
with many properties). All filtering, sorting and pagination goes in **query
params** on a single endpoint per table:

```
GET  /PointOfSale/orden.php?estatus=ACTIVA&customer_name~~=acme&page=0&limit=50
GET  /PointOfSale/orden.php?id=123
POST /PointOfSale/orden.php        (create)
PUT  /PointOfSale/orden.php        (update)
DELETE /PointOfSale/orden.php?id=123
```

### Search operators (query params)

| Operator | Suffix | Example |
|----------|--------|---------|
| equals    | *(none)* | `?estatus=ACTIVA` |
| like      | `~~`     | `?customer_name~~=acme` |
| greater/equal | `>~` | `?load_date>~=2024-01-01` |
| less/equal     | `<~` | `?load_date<~=2024-12-31` |
| greater    | `>`   | `?cantidad_de_tallos>1000` |
| less       | `<`   | `?cantidad_de_tallos<5000` |
| in list    | `,`   | `?estatus,=ACTIVA,CANCELADA` |
| different  | `!`   | `?estatus!=CANCELADA` |
| sort       | `_sort` | `?_sort=id_DESC,load_date_ASC` |
| not null   | `_NN` | `?_NN=id_vendedor` |
| is null    | `_NULL` | `?_NULL=id_vendedor` |
| page/limit |       | `?page=0&limit=50` |

The `Rest<U,T>` class (`src/app/modules/shared/services/Rest.ts`) builds
exactly these params from a `SearchObject`. **Do not hand-build urls.**

### Using the Rest system

Each component creates its own Rest instance (do NOT register every table in
`RestService`):

```ts
this.rest_role = this.rest.initRestSimple<Role>('role');
this.rest_user = this.rest.initRest<User, User>('user');
```

Methods: `get(id)`, `search(search_object)`, `getAll()`, `searchAll(...)`,
`create(obj)`, `update(obj)`, `batchCreate(array)`, `batchUpdate(array)`,
`delete(obj)`. For relations use `getRelation()` + `searchWithRelations()`
(see `DataRelation.ts`) so we avoid new server endpoints.

---

## 2. Naming

### Variables — lowercase snake_case, never abbreviated

- `user` for `User`, `order_info` for `OrderInfo`, `item_id` for an id, `order_item` for `Order_Item`.
- Arrays end in `_array`: `user_array: User[] = []`, `order_item_array: Order_Item[] = []`.
- Never use abbreviations unless they have **one single** definition that
  everyone knows. `qty` is fine (quantity). `fmi` is not — it has many
  definitions, so write the full name. Rule of thumb: if a web search of the
  abbreviation returns one clear meaning, you may use it; otherwise spell it
  out.

> **Migration note:** much existing code still uses a `_list` suffix
> (`role_list`, `item_list`). New code **must** use `_array`. As files are
> touched/updated, rename their `_list` variables to `_array`.

### Functions — camelCase, starting lowercase

`getOrderToCreate()`, `searchOrders()`, `onSave()`.

### Interfaces and classes — PascalCase, uppercase start

Model names mirror the backend table, keeping the underscore:

| Backend table | Interface file | Interface |
|---------------|----------------|-----------|
| `order`       | `Order.ts`     | `Order`   |
| `order_item`  | `Order_Item.ts`| `Order_Item` |
| `user`        | `User.ts`      | `User` |

### Files

Named after the model/component exactly: `Order.ts`, `list-order.component.ts`,
`save-order.component.ts`. Model files live in
`src/app/modules/shared/RestModels/` and are re-exported by `RestModels.ts`.

---

## 3. Never call functions in the html

If you need to display a computed value (age, formatted date, concatenated
name), **precompute it into the object** in the `.map()` step, then use it
directly in the template.

```ts
interface CUser extends User {
    age: number;
    name_display: string;
}

getCUser(user: User): CUser {
    return {
        ...user,
        age: this.getAge(user),
        name_display: user.first_name + ' ' + user.last_name,
    };
}

// in the subscribe next:
this.user_array = response.data.map(user => this.getCUser(user));
```

```html
<!-- YES -->
<td>{{user.age}}</td>
<td>{{user.name_display}}</td>

<!-- NO -->
<td>{{getAge(user)}}</td>
<td>{{user.first_name + ' ' + user.last_name}}</td>
```

**There is no signal exception.** This app is Angular 20 zone-based with plain
properties, so a bare function call in a template is **never** acceptable. A
computed display value (age, date, name) always goes into the object via
`.map()` — do not compute it in a helper called from the template.

---

## 4. Page data flow (the observer pattern)

In `ngOnInit()` put an **observer on the route params/query params**, transform
the search, fetch, and assign to the `_array` property:

```ts
ngOnInit(): void {
    this.path = '/roles';
    this.setTitle('Roles');

    this.subs.sink = this.route.paramMap.pipe(
        mergeMap((param_map) => {
            this.is_loading = true;
            let fields = ['name', 'id', 'created', 'updated'];
            this.role_search = this.getSearch(param_map, fields, []);
            this.role_search.limit = this.page_size;
            this.current_page = this.role_search.page;
            return this.rest_role.search(this.role_search);
        }),
    ).subscribe((response) => {
        this.is_loading = false;
        this.role_array = response.data;
        this.setPages(this.current_page, response.total);
    });
}
```

View-bound state is a plain property (`is_loading = false`, `role_array: Role[]
= []`). `is_loading` is reset by `setPages()` or `showError()`/`showSuccess()`,
never left dangling.

All filter/sort/pagination state goes into **query params** (ugly urls). The
`search(search_object)` method on `BaseComponent` serializes a `SearchObject`
into query params and re-navigates, which re-triggers the observer.

### Load ALL page data in one `forkJoin` — never separate subscriptions

Every dataset a page needs on init is fetched together in a **single `forkJoin`
inside `ngOnInit`**. **Never fire two or more independent `.subscribe()` calls
for initial data** (e.g. a `loadUsers()` next to the main search observer).
Independent subscriptions resolve in an unknown order and **race each other**:
one dataset can render before another (empty dropdowns, `is_loading` reset too
early, code reading an array that is not loaded yet).

```ts
ngOnInit(): void {
    this.path = '/orders';
    this.setTitle('Mis Ordenes');
    this.is_loading = true;

    // Reuse already-loaded data instead of re-fetching when possible.
    let stores_obx = this.store_array.length
        ? of({ total: this.store_array.length, data: this.store_array })
        : this.rest_store.search({});

    this.subs.sink = forkJoin({
        stores: stores_obx,
        items: this.rest_item_info.search({ eq: { hide: 0 }, limit: 999999 })
    }).subscribe({
        next: (result) => {
            this.store_array = result.stores.data;
            this.item_array = result.items.data;
            this.is_loading = false;
        },
        error: (error) => {
            this.is_loading = false;
            this.showError(error);
        }
    });
}
```

Rules:

- `is_loading` is set **once** before the `forkJoin` and reset **once** after
  every dataset has arrived (or on error).
- If the main data is search-driven (`paramMap`/`queryParamMap`), keep the
  observer as the single flow and fold any extra static datasets into it —
  never a side subscription. Short-circuit already-loaded data with `of(...)`
  so it is not re-fetched on every navigation.

---

## 5. Every page extends BaseComponent

`src/app/modules/shared/base/base.component.ts` gives you:

- `this.rest`, `this.router`, `this.route`, `this.location`, `this.title_service`, `this.confirmation`
- `this.subs` (auto-unsubscribed) and `this.subs.sink = observable.subscribe(...)`
- `this.is_loading` (plain boolean), `this.page_size` (50), `this.current_page`, `this.total_pages`, `this.pages`
- `getSearch(param_map, fields, extra_keys)`, `getEmptySearch()`, `search(obj)`, `searchNoForceReload(obj)`, `sort(header, search)`, `setPages(page, total)`
- `showError(error)`, `showSuccess(msg)`, `showWarning(msg)`, `setTitle(title)`, `onDateChange(...)`

Pages are **standalone** components (Angular 20). Imports go in
`@Component({ imports: [...] })`. Use `CommonModule`, `FormsModule`, and the
shared components (`LoadingComponent`, `PaginationComponent`) as needed.

---

## 6. Confirmation service

For destructive/important actions always confirm first:

```ts
this.subs.sink = this.confirmation
    .showConfirmAlert(obj, 'Crear Orden', 'Esta seguro que desea crear esta orden?')
    .pipe(
        filter(response => response.accepted),
        mergeMap(() => this.rest_order.create(order_to_create))
    )
    .subscribe({
        next: (response) => {
            this.showSuccess('Orden ' + response.id + ' creada');
            this.router.navigate(['/orders']);
        },
        error: (error) => this.showError(error)
    });
```

The modal is rendered globally and bound to `confirmation.show_confirmation`.

---

## 7. Models

- Interfaces live in `src/app/modules/shared/RestModels/`, one file per table, exact backend field names (snake_case).
- Types: `number`, `string`, nullable as `T | null`, dates as `Date`.
- Re-export every model in `src/app/modules/shared/RestModels.ts`.
- Empty factories live in `src/app/modules/shared/Empties/` and are exposed via `GetEmpty` (`GetEmpty.role()`, `GetEmpty.user()`, ...).
- Before writing a model, verify the real fields and distinct enum values
  against the backend (`schema.php`) and/or database — do not guess.

---

## 8. Html rules

- **One tag per line.** No attribute truncation onto multiple lines, no
  multiple tags on one line.
- Yes:
  ```
  <br>
  hello<br>
  <b class="foooo">world</b>
  ```
  ```
  <b>Hello</b>
  <span class="x">
      world
  </span>
  ```
- No:
  ```
  <a class="hello"
    href="xxx">
    world
  </a>
  ```
  ```
  <br>Hello<br><br>
  ```
- **The only exception: inline SVG must be on a single line.**
  ```
  <svg ...><g ...>...</g></svg>
  ```
- Prefer Angular control flow: `@if`, `@for ... track`, `@empty`.

---

## 9. Commit messages

- Concise, imperative. No "Co-Authored-By", no "Generated with" AI footers.
