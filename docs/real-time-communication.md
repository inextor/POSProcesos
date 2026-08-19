# Real-Time Communication

The application uses Socket.IO for real-time updates, integrated into the central `RestService`.

## Connection

- **Server URL**: `https://notifications.integranet.xyz:5000` (from environment config)
- **Library**: `socket.io-client` ^4.8.1

## Initialization

Socket.IO is initialized in the `RestService` constructor:

```typescript
private initSocketIo(): void
```

## Events

### Received Events

| Event | Description | Data |
|-------|-------------|------|
| `connect` | Socket connected | - |
| `disconnect` | Socket disconnected | - |
| `update` | General system update | `SocketMessage` |
| `order` | Order-specific update | `SocketMessage` |
| `updateCommandas` | Kitchen command update | `SocketMessage` |

### Emitted Events

```typescript
sendNotification(type: string, id: number): void
```

Emits an `update` event with `{type, id}` payload to the server.

## SocketMessage Interface

```typescript
export interface SocketMessage {
    type: string;
    store_id: number;
    order_id?: number;
    message?: string;
    id?: string | number;
}
```

## Subscribing to Updates

```typescript
// Inject RestService and subscribe
this.rest.updates.subscribe((message: SocketMessage) => {
    switch (message.type) {
        case 'order':
            // Handle order update
            break;
        case 'update':
            // Handle general update
            break;
    }
});
```

## Connection Status

```typescript
// Check connection status
this.rest.socket_is_connected: boolean
```

The socket is used for:
- Live order notifications
- Kitchen command updates
- General system-wide updates
- Cross-device synchronization
