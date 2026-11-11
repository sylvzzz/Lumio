// Flags hardcoded UI text that bypasses i18n.ts (PT diacritics, stray 'pt' literals).
// Run from frontend/: node scripts/audit-i18n.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
// i18n.ts holds the dictionaries; useUser.ts has the navigator fallback;
// Settings.tsx has the legit <option value="pt">Português</option> labels.
const SKIP_FILES = new Set(['i18n.ts', 'useUser.ts', 'Settings.tsx'])
const SKIP_DIRS = new Set(['node_modules', 'dist'])
const DIACRITICS = /[ÀÁÂÃÇÉÊÍÓÔÕÚÜàáâãçéêíóôõúü]/
const PT_LITERAL = /['"]pt['"]/

const issues = []
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(full)
      continue
    }
    if (!/\.(ts|tsx)$/.test(entry) || SKIP_FILES.has(entry)) continue
    readFileSync(full, 'utf8').split('\n').forEach((line, i) => {
      const code = line.split('//')[0].trim() // drop line + trailing comments
      if (!code) return
      if (DIACRITICS.test(code))
        issues.push(`${full}:${i + 1}: PT text outside i18n.ts: ${code.slice(0, 90)}`)
      if (PT_LITERAL.test(code))
        issues.push(`${full}:${i + 1}: stray 'pt' literal: ${code.slice(0, 90)}`)
    })
  }
}
walk(join(ROOT, 'src'))
if (issues.length) {
  console.error(issues.join('\n'))
  process.exit(1)
}
console.log('i18n audit: OK')
