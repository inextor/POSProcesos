# Localization

## Current State

The application is **not internationalized** (no i18n). It is built exclusively for **Mexican Spanish (es-MX)**.

## Evidence

- Month names in `Utils.ts` use Spanish abbreviations ("Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic")
- All UI labels, error messages, and notifications are in Spanish
- No `@angular/localize` package in dependencies
- No translation files (`.xlf`, `.json`) found in the codebase
- No `LOCALE_ID` injection or locale configuration found

## Date Formatting

Date display is handled by `Utils.getDateString()` which formats dates with Spanish month names:

```
"15 de enero de 2024"
"ene 15, 02:30pm"
```

## Currency

Currency formatting uses the API-provided `currency_id` field on orders and the `Currency_Rate` model for exchange rate calculations. The default currency is configured per store via `Store.default_currency_id`.

## SAT / CFDI

SAT invoicing (Mexican tax CFDI) is a core feature. It uses Mexican tax specific terminology:
- RFC (tax ID)
- CFDI (digital invoice)
- SAT (tax authority)
- `unidad_medida_sat` (SAT measurement units)
- `claveprodserv` (product/service key)
