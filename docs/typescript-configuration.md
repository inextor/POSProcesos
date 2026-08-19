# TypeScript Configuration

**File:** `tsconfig.json`

```json
{
  "compileOnSave": false,
  "compilerOptions": {
    "outDir": "./dist/out-tsc",
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "sourceMap": true,
    "declaration": false,
    "experimentalDecorators": true,
    "moduleResolution": "bundler",
    "importHelpers": true,
    "target": "ES2022",
    "module": "ES2022",
    "useDefineForClassFields": false,
    "lib": ["ES2022", "dom"]
  },
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  }
}
```

## Key Flags

| Flag | Value | Impact |
|------|-------|--------|
| `strict` | `true` | Full strict mode enabled |
| `target` | `ES2022` | Compiles to ES2022 JavaScript |
| `module` | `ES2022` | ES module output |
| `moduleResolution` | `bundler` | Modern bundler resolution |
| `experimentalDecorators` | `true` | Required for Angular decorators |
| `useDefineForClassFields` | `false` | Angular compatibility (uses constructor assignment) |
| `noImplicitOverride` | `true` | Requires `override` keyword |
| `noPropertyAccessFromIndexSignature` | `true` | No dot access for index signatures |
| `noImplicitReturns` | `true` | All code paths must return |
| `noFallthroughCasesInSwitch` | `true` | No fallthrough in switch |

## Angular Compiler Options

| Option | Value | Description |
|--------|-------|-------------|
| `enableI18nLegacyMessageIdFormat` | `false` | Disabled (no i18n) |
| `strictInjectionParameters` | `true` | Strict DI parameter checking |
| `strictInputAccessModifiers` | `true` | Strict input modifier checking |
| `strictTemplates` | `true` | Strict template type checking |
