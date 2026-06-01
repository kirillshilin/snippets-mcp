import { useState, useMemo } from 'react'
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
/* Mock data – replace with real API calls when wiring up the backend         */
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
    content: [
      'async function ${1:name}($2): Promise<${3:void}> {',
      '  $0',
      '}',
    ].join('\n'),
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
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function getScopeBadgeVariant(scope: string): 'default' | 'info' | 'success' | 'secondary' {
  if (['typescript', 'typescriptreact'].includes(scope)) return 'info'
  if (['javascript', 'javascriptreact'].includes(scope)) return 'success'
  return 'secondary'
}

function highlight(text: string, query: string): string {
  if (!query.trim()) return text
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(
    new RegExp(`(${safe})`, 'gi'),
    '<mark class="bg-primary/20 text-primary rounded-sm px-0.5">$1</mark>',
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
    <Card
      className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Code2 className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle
                className="text-sm truncate"
                dangerouslySetInnerHTML={{ __html: highlight(snippet.title, query) }}
              />
              <code className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                {snippet.prefix}
              </code>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1 transition-transform group-hover:translate-x-0.5" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <CardDescription
          className="text-xs line-clamp-2"
          dangerouslySetInnerHTML={{ __html: highlight(snippet.description, query) }}
        />
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
              className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5"
            >
              #{k}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* SnippetDetail                                                               */
/* -------------------------------------------------------------------------- */

function SnippetDetail({ snippet, onClose }: { snippet: Snippet; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{snippet.title}</DialogTitle>
              <DialogDescription className="font-mono text-xs mt-0.5">
                {snippet.prefix}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="grid grid-cols-2 gap-6 text-sm overflow-hidden flex-1 min-h-0">
          {/* Meta */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Description
              </p>
              <p className="text-sm">{snippet.description}</p>
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
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs gap-1"
                onClick={handleCopy}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <ScrollArea className="flex-1 rounded-lg border bg-muted/50">
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

function EmptyState({ query }: { query: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Search className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">No snippets found</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        {query
          ? `No snippets match "${query}". Try a different keyword.`
          : 'No snippets are available yet.'}
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* App                                                                         */
/* -------------------------------------------------------------------------- */

const ALL_SCOPES = Array.from(new Set(MOCK_SNIPPETS.flatMap((s) => s.scope))).sort()

export default function App() {
  const [query, setQuery] = useState('')
  const [activeScope, setActiveScope] = useState<string | null>(null)
  const [selected, setSelected] = useState<Snippet | null>(null)

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-none">Snippets MCP</h1>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">Code snippet library</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 text-xs">
              <BookOpen className="w-3 h-3" />
              {MOCK_SNIPPETS.length} snippets
            </Badge>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="border-b bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight mb-2">Find the right snippet</h2>
            <p className="text-muted-foreground mb-6">
              Browse and search your code snippets. Click any card to view the full content and copy
              it.
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, keyword, or prefix…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 h-11 text-sm"
                autoFocus
              />
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Scope filters */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground mr-1">Filter:</span>
          <button
            onClick={() => setActiveScope(null)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition-colors',
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
              className={cn(
                'text-xs px-3 py-1.5 rounded-full border transition-colors font-mono',
                activeScope === scope
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:border-primary/50',
              )}
            >
              {scope}
            </button>
          ))}

          {filtered.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            filtered.map((snippet) => (
              <SnippetCard
                key={snippet.prefix}
                snippet={snippet}
                query={query}
                onClick={() => setSelected(snippet)}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail modal */}
      {selected && <SnippetDetail snippet={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
