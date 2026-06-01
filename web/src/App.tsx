import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  Search,
  Code2,
  Tag,
  BookOpen,
  ChevronRight,
  Copy,
  Check,
  Layers,
  Sparkles,
  Terminal,
  Moon,
  Sun,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

interface SnippetMetadata {
  prefix: string
  title: string
  description: string
  keywords: string[]
  scope: string[]
}

interface Snippet extends SnippetMetadata {
  content: string
}

/* -------------------------------------------------------------------------- */
/* Mock data                                                                   */
/* -------------------------------------------------------------------------- */

const MOCK_SNIPPETS: Snippet[] = [
  {
    prefix: 'react-fc',
    title: 'React Functional Component',
    description: 'Scaffold a typed React functional component with props interface',
    keywords: ['react', 'component', 'functional', 'typescript'],
    scope: ['typescriptreact', 'javascriptreact'],
    content: [
      "import React from 'react'",
      '',
      'interface ${1:Component}Props {',
      '  $2',
      '}',
      '',
      'export function ${1:Component}({ $3 }: ${1:Component}Props) {',
      '  return (',
      '    <div>',
      '      $0',
      '    </div>',
      '  )',
      '}',
    ].join('\n'),
  },
  {
    prefix: 'use-state',
    title: 'React useState Hook',
    description: 'Typed useState hook declaration with initial value',
    keywords: ['react', 'hooks', 'state', 'useState'],
    scope: ['typescriptreact', 'typescript'],
    content: 'const [${1:value}, set${1/(.*)/${1:/capitalize}/}] = useState<${2:Type}>($3)',
  },
  {
    prefix: 'use-effect',
    title: 'React useEffect Hook',
    description: 'useEffect with dependency array and optional cleanup',
    keywords: ['react', 'hooks', 'effect', 'useEffect', 'lifecycle'],
    scope: ['typescriptreact', 'javascriptreact'],
    content: [
      'useEffect(() => {',
      '  $1',
      '',
      '  return () => {',
      '    $2',
      '  }',
      '}, [$3])',
    ].join('\n'),
  },
  {
    prefix: 'express-route',
    title: 'Express Route Handler',
    description: 'Typed Express GET route with error handling',
    keywords: ['express', 'route', 'handler', 'api', 'nodejs'],
    scope: ['typescript'],
    content: [
      "app.get('/${1:path}', async (req: Request, res: Response): Promise<void> => {",
      '  try {',
      '    $0',
      '    res.json({ $2 })',
      '  } catch (error) {',
      "    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })",
      '  }',
      '})',
    ].join('\n'),
  },
  {
    prefix: 'zod-schema',
    title: 'Zod Object Schema',
    description: 'Zod validation schema with type inference',
    keywords: ['zod', 'validation', 'schema', 'typescript'],
    scope: ['typescript'],
    content: [
      'const ${1:Schema} = z.object({',
      '  $2: z.$3,',
      '})',
      '',
      'type ${1:Schema} = z.infer<typeof ${1:Schema}>',
    ].join('\n'),
  },
  {
    prefix: 'async-fn',
    title: 'Async Function',
    description: 'Typed async function with error boundary',
    keywords: ['async', 'await', 'typescript', 'function'],
    scope: ['typescript', 'javascript'],
    content: ['async function ${1:name}($2): Promise<${3:void}> {', '  $0', '}'].join('\n'),
  },
  {
    prefix: 'ts-interface',
    title: 'TypeScript Interface',
    description: 'TypeScript interface declaration',
    keywords: ['typescript', 'interface', 'type'],
    scope: ['typescript', 'typescriptreact'],
    content: ['interface ${1:Name} {', '  $0', '}'].join('\n'),
  },
  {
    prefix: 'fetch-api',
    title: 'Fetch API Call',
    description: 'Typed fetch request with error handling and JSON parsing',
    keywords: ['fetch', 'api', 'http', 'request', 'async'],
    scope: ['typescript', 'javascript'],
    content: [
      "const response = await fetch('${1:url}', {",
      "  method: '${2:GET}',",
      '  headers: {',
      "    'Content-Type': 'application/json',",
      '    $3',
      '  },',
      '})',
      '',
      'if (!response.ok) {',
      '  throw new Error(`HTTP error! status: ${response.status}`)',
      '}',
      '',
      'const data: ${5:unknown} = await response.json()',
    ].join('\n'),
  },
]

/* -------------------------------------------------------------------------- */
/* Dark mode hook                                                              */
/* -------------------------------------------------------------------------- */

function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => {
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  return [dark, setDark] as const
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function getScopeBadgeVariant(scope: string): 'default' | 'info' | 'success' | 'secondary' {
  if (['typescript', 'typescriptreact'].includes(scope)) return 'info'
  if (['javascript', 'javascriptreact'].includes(scope)) return 'success'
  return 'secondary'
}

function highlightSegments(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${safe})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-primary/20 text-primary rounded-sm px-0.5 not-italic">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

/* -------------------------------------------------------------------------- */
/* SkeletonCard                                                                */
/* -------------------------------------------------------------------------- */

function SkeletonCard() {
  return (
    <Card className="pointer-events-none">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <div className="flex gap-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* SnippetCard                                                                 */
/* -------------------------------------------------------------------------- */

function SnippetCard({
  snippet,
  query,
  onClick,
}: {
  snippet: SnippetMetadata
  query: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View snippet: ${snippet.title}`}
      className="group text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
    >
      <Card className="h-full transition-all duration-200 group-hover:shadow-lg group-hover:border-primary/40 group-hover:-translate-y-0.5 group-focus-visible:border-primary/40">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Code2 className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm font-semibold truncate">
                  {highlightSegments(snippet.title, query)}
                </CardTitle>
                <code className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                  {snippet.prefix}
                </code>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1 transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <CardDescription className="text-xs line-clamp-2">
            {highlightSegments(snippet.description, query)}
          </CardDescription>
          <div className="flex flex-wrap gap-1">
            {snippet.scope.map((s) => (
              <Badge key={s} variant={getScopeBadgeVariant(s)} className="text-[10px] px-1.5 py-0">
                {s}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {snippet.keywords.slice(0, 4).map((k) => (
              <span
                key={k}
                className="text-[10px] text-muted-foreground/70 bg-muted rounded px-1.5 py-0.5"
              >
                #{k}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/* SnippetDetail                                                               */
/* -------------------------------------------------------------------------- */

function SnippetDetail({
  snippet,
  onClose,
  returnFocusRef,
}: {
  snippet: Snippet
  onClose: () => void
  returnFocusRef: React.RefObject<HTMLElement | null>
}) {
  const [copied, setCopied] = useState(false)
  const copyBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    copyBtnRef.current?.focus()
    return () => {
      // restore focus to card that opened the dialog
      setTimeout(() => returnFocusRef.current?.focus(), 0)
    }
  }, [returnFocusRef])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(snippet.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [snippet.content])

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Code2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">{snippet.title}</DialogTitle>
              <DialogDescription className="font-mono text-xs mt-0.5">
                {snippet.prefix}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-5 overflow-hidden flex-1 min-h-0">
          {/* Meta */}
          <div className="space-y-4 overflow-y-auto">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Description
              </p>
              <p className="text-sm leading-relaxed">{snippet.description}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Layers className="w-3 h-3" /> Scope
              </p>
              <div className="flex flex-wrap gap-1.5">
                {snippet.scope.map((s) => (
                  <Badge key={s} variant={getScopeBadgeVariant(s)}>
                    {s}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Keywords
              </p>
              <div className="flex flex-wrap gap-1.5">
                {snippet.keywords.map((k) => (
                  <span
                    key={k}
                    className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Code */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Terminal className="w-3 h-3" /> Content
              </p>
              <Button
                ref={copyBtnRef}
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs gap-1"
                onClick={handleCopy}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <ScrollArea className="flex-1 rounded-lg border bg-muted/40 min-h-[180px]">
              <pre className="p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all">
                {snippet.content}
              </pre>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/* EmptyState                                                                  */
/* -------------------------------------------------------------------------- */

function EmptyState({
  query,
  activeScope,
  onClearQuery,
  onClearScope,
}: {
  query: string
  activeScope: string | null
  onClearQuery: () => void
  onClearScope: () => void
}) {
  const hasFilters = query.trim() || activeScope

  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Search className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">No snippets found</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-5">
        {query
          ? `No snippets match "${query}".`
          : activeScope
            ? `No snippets for scope "${activeScope}".`
            : 'No snippets are available yet.'}
      </p>
      {hasFilters && (
        <div className="flex gap-2 flex-wrap justify-center">
          {query && (
            <Button variant="outline" size="sm" onClick={onClearQuery} className="gap-1">
              <X className="w-3 h-3" /> Clear search
            </Button>
          )}
          {activeScope && (
            <Button variant="outline" size="sm" onClick={onClearScope} className="gap-1">
              <X className="w-3 h-3" /> Clear scope filter
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* App                                                                         */
/* -------------------------------------------------------------------------- */

const ALL_SCOPES = Array.from(new Set(MOCK_SNIPPETS.flatMap((s) => s.scope))).sort()

export default function App() {
  const [dark, setDark] = useDarkMode()
  const [query, setQuery] = useState('')
  const [activeScope, setActiveScope] = useState<string | null>(null)
  const [selected, setSelected] = useState<Snippet | null>(null)
  const [loading, setLoading] = useState(true)
  const lastFocusedRef = useRef<HTMLElement | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Simulate initial API load
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(t)
  }, [])

  // '/' shortcut to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return MOCK_SNIPPETS.filter((s) => {
      const scopeMatch = !activeScope || s.scope.includes(activeScope)
      if (!q) return scopeMatch
      return (
        scopeMatch &&
        (s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.prefix.toLowerCase().includes(q) ||
          s.keywords.some((k) => k.toLowerCase().includes(q)))
      )
    })
  }, [query, activeScope])

  const handleCardClick = (snippet: Snippet, el: HTMLElement) => {
    lastFocusedRef.current = el
    setSelected(snippet)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <p className="text-base font-semibold">Snippets MCP</p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1 text-xs hidden sm:flex">
              <BookOpen className="w-3 h-3" />
              {MOCK_SNIPPETS.length} snippets
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setDark((d) => !d)}
              className="h-9 w-9"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative border-b overflow-hidden">
        {/* Background gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-2xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
              Find the right snippet
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-8 leading-relaxed">
              Browse and search your code snippet library. Click any card to view the full content
              and copy it instantly.
            </p>

            {/* Search */}
            <div className="relative shadow-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                placeholder="Search by title, keyword, or prefix…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
                className="pl-10 h-12 text-sm pr-16"
                aria-label="Search snippets"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                /
              </kbd>
            </div>

            {/* Stats row */}
            <div className="flex gap-6 mt-5">
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{MOCK_SNIPPETS.length}</span>{' '}
                snippets
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{ALL_SCOPES.length}</span> scopes
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {Array.from(new Set(MOCK_SNIPPETS.flatMap((s) => s.keywords))).length}
                </span>{' '}
                keywords
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Body                                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Scope filter pills */}
        <div
          className="flex items-center gap-2 mb-7 flex-wrap"
          role="group"
          aria-label="Filter by scope"
        >
          <span className="text-xs font-medium text-muted-foreground mr-1">Scope:</span>
          <button
            onClick={() => setActiveScope(null)}
            aria-pressed={!activeScope}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              !activeScope
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border hover:border-primary/50',
            )}
          >
            All
          </button>
          {ALL_SCOPES.map((scope) => (
            <button
              key={scope}
              onClick={() => setActiveScope(activeScope === scope ? null : scope)}
              aria-pressed={activeScope === scope}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full border transition-colors font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                activeScope === scope
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:border-primary/50',
              )}
            >
              {scope}
            </button>
          ))}

          {!loading && filtered.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          ) : filtered.length === 0 ? (
            <EmptyState
              query={query}
              activeScope={activeScope}
              onClearQuery={() => setQuery('')}
              onClearScope={() => setActiveScope(null)}
            />
          ) : (
            filtered.map((snippet) => (
              <SnippetCard
                key={snippet.prefix}
                snippet={snippet}
                query={query}
                onClick={() => {
                  const el = document.querySelector<HTMLElement>(
                    `[aria-label="View snippet: ${snippet.title}"]`,
                  )
                  handleCardClick(snippet, el ?? document.body)
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <SnippetDetail
          snippet={selected}
          onClose={() => setSelected(null)}
          returnFocusRef={lastFocusedRef}
        />
      )}
    </div>
  )
}
