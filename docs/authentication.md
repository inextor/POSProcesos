# Authentication & Permissions

## Auth Guard

**File:** `src/app/modules/shared/finger/auth.guard.ts`

```typescript
@Injectable({ providedIn: 'root' })
class AuthGuard {
    constructor(private router: Router, private rest: RestService) {}
    canActivate() {
        return true;  // Currently allows all access
    }
}

export const authGuard: CanActivateFn = (route, state) => {
    return inject(AuthGuard).canActivate();
};
```

The auth guard currently returns `true` for all routes. True authentication enforcement happens on the backend API.

## Session Management

### Login
- Login is handled by the `LoginComponent` (`/login` route)
- On successful authentication, user data is stored in `localStorage`

### Session Storage Keys

| Key | Constant | Description |
|-----|----------|-------------|
| `user_permission` | `USER_PERMISSION_KEY` | User permissions JSON |
| `user` | `USER_KEY` | User object JSON |

### Session Methods (RestService)

```typescript
// Retrieve current user from session storage
getUserFromSession(): User | null

// Get stored preferences
getPreferencesFromSession(): Preferences
getPreferencesInfo(): Promise<Preferences>

// Get session start time
getSessionStart(): Date

// Logout
logout(redirect?: boolean): void
```

## HTTP Authentication

API requests use Bearer token authentication:

```typescript
getSessionHeaders(): HttpHeaders
```

## User Permissions

User permissions are stored in `localStorage` under `USER_PERMISSION_KEY` and accessible via:

```typescript
this.rest.user_permission  // User_Permission object
```

The menu component filters menu items based on the user's permission set, scoped to their store.

## Login Flow

```
/login
  └─ LoginComponent
       ├─ User enters credentials
       ├─ API authentication via RestService
       ├─ Session stored in localStorage
       └─ Redirected to / (dashboard)
```
