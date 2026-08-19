# Services Layer

## Service Inventory

| Service | File | Description |
|---------|------|-------------|
| `RestService` | `shared/services/rest.service.ts` | Central API, state, session, socket, offline |
| `Rest\<U,T\>` | `shared/services/Rest.ts` | Low-level REST client |
| `ShortcutsService` | `shared/services/shortcuts.service.ts` | Keyboard shortcut handling |
| `ConfirmationService` | `shared/services/confirmation.service.ts` | Modal confirmation dialogs |
| `DataRelation` | `shared/services/DataRelation.ts` | Interface for relational joins |

## ShortcutsService

**File:** `src/app/modules/shared/services/shortcuts.service.ts`

Keyboard shortcut management:

```typescript
// Observable streams
keyUpObserver: Observable<KeyboardEvent>
keyDownObserver: Observable<KeyboardEvent>
shortcuts: Subject<KeyboardShortcutEvent>

// Configure shortcuts
private configureKeyboardEvents(): void
```

Emits `KeyboardShortcutEvent` when registered shortcuts are pressed:
```typescript
interface KeyboardShortcutEvent {
    event: KeyboardEvent;
    shortcut: Keyboard_Shortcut;
    stopPropagation: StopPropagationFunction;
}
```

## ConfirmationService

**File:** `src/app/modules/shared/services/confirmation.service.ts`

Modal confirmation dialogs:

```typescript
showConfirmAlert(
    obj: any,
    title?: string,
    description?: string,
    ok_button?: string,
    cancel_button?: string
): Observable<ConfirmationResult>
```

Returns an Observable that emits the `ConfirmationResult` when the user confirms or cancels.

## DataRelation

**File:** `src/app/modules/shared/services/DataRelation.ts`

Interface for defining relational joins when fetching data from the API:

```typescript
export interface DataRelation<T> {
    rest: Rest<T, any>;
    source_field: string;
    target_field: keyof T;
    is_multiple?: boolean;
    name?: string;
    relations?: DataRelation<any>[];
    source_obj?: string;
    target_obj?: string;
}
```

## Finger Utilities (Database / Excel)

**Directory:** `src/app/modules/shared/Finger/`

| File | Description |
|------|-------------|
| `DatabaseStore.ts` | Database store operations |
| `ExcelUtils.ts` | Excel export/import utilities |
| `ObjectStore.ts` | Object store for offline data |
| `OptionsUtils.ts` | Options/configuration utilities |
| `SchemeBuilder.ts` | Database schema builder |

## Shared Pipes

**Directory:** `src/app/modules/shared/pipes/`

| Pipe | File | Description |
|------|------|-------------|
| `custom-to-title` | `custom-to-title.pipe.ts` | Custom title case transformation |
| `item-name` | `item-name.pipe.ts` | Item name formatting |
| `short-date` | `short-date.pipe.ts` | Short date formatting |
