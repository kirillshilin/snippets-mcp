# GitHub Copilot Instructions

## Code Organisation

- All standalone utility functions must live in separate files inside the `src/utils/` folder.
- Each file in `src/utils/` should contain one function or one family of closely related functions (e.g. all logger helpers in `logger.ts`, all argv helpers in `argv.ts`).
- Do not define standalone utility functions inline in feature files such as `api.ts`, `http.ts`, `stdio.ts`, or `streamable-http.ts`. Import them from `src/utils/` instead.
