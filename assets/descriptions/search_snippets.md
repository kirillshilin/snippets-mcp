# search_snippets

Performs full-text search across snippet titles, descriptions, keywords, and scope to find matching candidates for a given request. Supports fuzzy matching and prefix search for flexible discovery.

## Use Cases

- **Intent-driven search**: Given a user prompt or task description, craft a tailored search query to surface the most relevant snippets.
- **Keyword exploration**: Search by technology, concept, or pattern (e.g., `modal`, `button`, `form validation`, `navigation`) to discover relevant snippets.
- **Language-scoped search**: Combine a query with a `scope` filter (e.g., `typescript`, `css`) to narrow results to snippets for the current language or file type.

## Determining Scope

When deciding which scope value to pass, infer it in the following order of priority:

1. **Open file**: Use the language or extension of the file currently open in the editor (e.g. a `.tsx` file → `typescriptreact`, a `.css` file → `css`).
2. **Project type**: Use the primary language of the project (e.g. a TypeScript project → `typescript`, a Python project → `python`).
3. **Majority of files**: If there is no single open file, look at the language of the majority of source files in the project and use that as the scope.

If the scope cannot be determined, omit it to search across all languages.

## Recommended Workflow

1. For a given user prompt, extract key concepts or technologies to craft a focused search query.
2. Call `search_snippets` with the crafted query (and optionally a `scope` filter).
3. Analyse the returned snippet descriptions and keywords to identify the most appropriate match.
4. Call `get_snippet` with the chosen prefix to load the full snippet content.
5. Tailor the snippet to the project:
   - Replace placeholder colours and styles to match the project's design system.
   - Adjust variable names, class names, and identifiers to match the project's coding conventions.
   - Integrate the snippet with the existing codebase, wiring up imports and dependencies.

## Example

For the user request "I need a stacked application shell layout":

1. Search with query `application shell stacked layout` (optionally scoped to `html` or `css`).
2. Review the results and select the snippet with the most relevant title and description.
3. Load the full content with `get_snippet`.
4. Replace colour variables with the project's design tokens, adapt class names to the project's CSS naming convention, and insert the snippet into the appropriate template file.
