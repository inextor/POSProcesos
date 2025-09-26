## Migration

### Migration from angular v11 to v20

some rest.service properties are not found in the v20 version,

like this.current_user its now  this.user
this.local_preferences its now  this.preferences

a lot of the properties of the type Rest disappeared,
so on the components where are called must be changed 

```typescript

	this.rest.user.create(a_user);

```

becomes

```typescript
	this.rest_user = this.rest.initRest<User, User>('user');


	this.rest_user.create(a_user);
```


# HTML Templates

the html templates now must not use the old angular syntax *ngFor,*ngIf, etc.

must use the new syntax @for, @if, etc.
