# GitHub Copilot Instructions

## Code Organisation

- All standalone utility functions must live in separate files inside the `src/utils/` folder.
- Each file in `src/utils/` should contain one function or one family of closely related functions (e.g. all logger helpers in `logger.ts`, all argv helpers in `argv.ts`).
- Do not define standalone utility functions inline in feature files such as `api.ts`, `http.ts`, `stdio.ts`, or `streamable-http.ts`. Import them from `src/utils/` instead.

## Naming Conventions

- Source files use dot-separated segment names: `<name>.<role>.ts` (e.g. `snippets.api.ts`, `app.config.ts`, `auth.middleware.ts`).
- Server entry-point files end with `.server.ts` (e.g. `http.server.ts`, `stdio.server.ts`, `streamable-http.server.ts`).
- Schema files end with `.schema.ts` and live in `src/schemas/` (e.g. `snippet.schema.ts`, `list-snippets.schema.ts`).
- Type definition files end with `.types.ts` and live in `src/types/` (e.g. `snippet.types.ts`).
- Loader files end with `.loader.ts` and live in `src/services/loaders/` (e.g. `snippet.loader.ts`, `markdown.loader.ts`).
- Utility files end with `.utils.ts` for domain utilities or use a descriptive name inside `src/utils/` (e.g. `scope.utils.ts`, `search-index.ts`, `minisearch.adapter.ts`).
- Test (spec) files are colocated with the source file they test and end with `.spec.ts` (e.g. `snippets.api.spec.ts` next to `snippets.api.ts`).
