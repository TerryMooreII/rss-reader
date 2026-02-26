/**
 * Parses a websearch-style query string and returns a predicate function.
 * Mirrors PostgreSQL's websearch_to_tsquery syntax:
 *   word1 word2      → AND (both must match)
 *   word1 OR word2   → OR  (either matches)
 *   "exact phrase"   → phrase match
 *   -word            → NOT (must not match)
 */
export function compileWebSearchQuery(query: string): (text: string) => boolean {
  type Term = { value: string; phrase: boolean; negated: boolean }

  const tokens: Array<Term | 'OR'> = []
  const re = /(-?)"([^"]*)"|\bOR\b|(-?)(\S+)/g
  let m: RegExpExecArray | null

  while ((m = re.exec(query)) !== null) {
    if (m[0] === 'OR') {
      tokens.push('OR')
    } else if (m[2] !== undefined) {
      // Quoted phrase: optional leading -
      tokens.push({ value: m[2], phrase: true, negated: m[1] === '-' })
    } else if (m[4] !== undefined) {
      // Plain word: optional leading -
      tokens.push({ value: m[4], phrase: false, negated: m[3] === '-' })
    }
  }

  // Split into OR-groups; each group is an AND-list of terms
  const orGroups: Term[][] = [[]]
  for (const tok of tokens) {
    if (tok === 'OR') {
      orGroups.push([])
    } else {
      orGroups[orGroups.length - 1]!.push(tok)
    }
  }

  // Drop empty groups
  const groups = orGroups.filter((g) => g.length > 0)
  if (groups.length === 0) return () => false

  // Pre-compile regexes for word-boundary terms
  const compiled = groups.map((group) =>
    group.map((term) => {
      const lower = term.value.toLowerCase()
      if (term.phrase) {
        return { test: (t: string) => t.includes(lower), negated: term.negated }
      }
      const escaped = lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const wordRe = new RegExp(`\\b${escaped}\\b`, 'i')
      return { test: (t: string) => wordRe.test(t), negated: term.negated }
    }),
  )

  return (text: string) => {
    const lower = text.toLowerCase()
    return compiled.some((group) =>
      group.every(({ test, negated }) => {
        const matched = test(lower)
        return negated ? !matched : matched
      }),
    )
  }
}
