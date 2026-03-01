# list_snippets

Lists available code snippets as an overview, returning the prefix (unique ID), title, description, scope, and keywords for each snippet. Optionally filter by scope (language or file extension).

## Use Cases

- **Browse the snippet library**: Get an overview of all available snippets to understand what is available before choosing one.
- **Filter by language**: Pass a scope (e.g. `typescript`, `css`, `html`) to see only snippets relevant to the current file or project.
- **Discover snippets by description**: Review titles and descriptions to identify candidates for a task without loading full content.

## Recommended Workflow

1. Call `list_snippets` (optionally with a scope filter) to see all available snippets.
2. Review the prefix, title, and description columns to shortlist candidates.
3. Use `search_snippets` with a tailored query to narrow down further if needed.
4. Use `get_snippet` with the chosen prefix to load the full snippet content.
5. Tailor the snippet to the project (replace colours, styles, variable names, etc.).
