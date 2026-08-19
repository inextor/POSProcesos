# Environment Configuration

**File:** `src/environments/environment.ts`

```typescript
export const environment = {
    production: true,
    app_settings: {
        socket_io_url: 'https://notifications.integranet.xyz:5000',
        path_api: 'PointOfSale',
        test_url: '',
        pdf_service_url: 'https://pdf.integranet.xyz'
    }
};
```

## Configuration Values

| Key | Value | Description |
|-----|-------|-------------|
| `production` | `true` | Always production mode |
| `socket_io_url` | `https://notifications.integranet.xyz:5000` | WebSocket server for real-time notifications |
| `path_api` | `PointOfSale` | Base API path segment |
| `test_url` | `''` (empty) | Optional override for local development; set to a local IP to bypass auto-detection |
| `pdf_service_url` | `https://pdf.integranet.xyz` | PDF generation service endpoint |

## Auto-Detection Logic

The application auto-detects whether it's running locally or in production based on the hostname. When `test_url` is configured, that URL is used instead:

```typescript
// From RestService
domain_configuration: {
    domain: // auto-detected from hostname or test_url
}
```

## Build Info System

**File:** `src/app/modules/shared/BuildInfo.ts`

Generated automatically by `update_build_info.sh` during every build. Contains a Unix timestamp:

```typescript
export const BuildInfo = {timestamp: 1779753621000}
```

Access via:
```typescript
import { BuildInfo } from './modules/shared/BuildInfo';
// BuildInfo.timestamp contains Unix millisecond timestamp
```
