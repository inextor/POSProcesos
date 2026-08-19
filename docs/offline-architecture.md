# Offline-First Architecture

The application supports offline operation using IndexedDB with Dexie.js-style schema definitions.

## Offline Database Schema

**File:** `src/app/modules/shared/OfflineDBSchema.ts`

```typescript
export const OFFLINE_DB_SCHEMA = {
    name: 'offline_db',
    version: 25,
    schema: {
        order_info: "++id,&order.sync_id,&order.id",
        item_info: "item.id,item.category_id,item.code",
        category: "id",
        item_terms: "++id,item_id,term",
        payment_info: "&payment.sync_id,order_id,order_sync_id",
        store: "id,name",
        price_type: "id,name",
        currency_rate: "id,currency_id,store_id",
        printed_orders: "id",
        printed_items: "id",
        category_tree: "id,parent_category_id,child_category_id",
        table: "id"
    }
};
```

### Schema Conventions

| Prefix | Meaning |
|--------|---------|
| `++` | Auto-incrementing primary key |
| `&` | Unique index |
| `,` in string | Compound index |

### Offline Tables

| Table | Purpose |
|-------|---------|
| `order_info` | Cached order data (keyed by sync_id and id) |
| `item_info` | Cached item/product data |
| `category` | Category cache |
| `item_terms` | Search terms for items |
| `payment_info` | Payment records for offline sync |
| `store` | Store configuration cache |
| `price_type` | Price type definitions |
| `currency_rate` | Exchange rates (by currency and store) |
| `printed_orders` | Track printed orders |
| `printed_items` | Track printed items |
| `category_tree` | Category hierarchy |
| `table` | Table/restaurant layout |

## Offline Utilities

**Files:**
- `src/app/modules/shared/OfflineUtils.ts`
- `src/app/modules/shared/OfflineDatabaseUtils.ts`

## Sync Mechanism

The `RestService` provides:

```typescript
// Force sync offline items to server
forceSyncOfflineItems(): Promise<any>

// Get/set offline mode
get is_offline(): boolean
set is_offline(b: boolean)
```

When offline mode is enabled, the application reads from IndexedDB and queues writes for synchronization when connectivity is restored.

## PWA Service Worker

**File:** `ngsw-config.json`

The service worker enables PWA capabilities:
- **App assets**: Prefetch strategy (CSS, JS, index, manifest)
- **Assets**: Lazy install with prefetch updates (images, fonts, media)
