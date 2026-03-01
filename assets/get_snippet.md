# get_snippet

Returns the full content of a specific snippet by its prefix (unique ID). Use this after identifying the right snippet via `list_snippets` or `search_snippets`.

## Use Cases

- **Load snippet content**: Retrieve the actual code or markup of a snippet ready to use or adapt.
- **Inspect before use**: Read the full snippet body to understand its structure before integrating it into a project.
- **Tailoring workflow**: After loading the content, adapt it to the project — replace placeholder colours and styles with the project's design tokens, rename variables to match coding conventions, and wire up the snippet to the existing codebase.

## Recommended Workflow

1. Use `search_snippets` with a tailored query to find matching candidates.
2. Analyse the returned descriptions and keywords to choose the most appropriate snippet.
3. Call `get_snippet` with the chosen prefix to load the full snippet content.
4. Tailor the returned content to the project:
   - Replace placeholder colours and styles to match the project's design system.
   - Adjust variable names and identifiers to follow the project's naming conventions.
   - Integrate the snippet with existing components, imports, and utilities.
