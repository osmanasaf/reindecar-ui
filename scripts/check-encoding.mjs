import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const TARGETS = ['src', 'public', 'README.md', 'md-files']
const ALLOWED_EXTENSIONS = new Set([
  '.vue',
  '.ts',
  '.js',
  '.css',
  '.html',
  '.json',
  '.md',
  '.yml',
  '.yaml'
])

const MOJIBAKE_REGEX = /Ã|Ä|Å|â€™|â€œ|â€|ğŸ|�/u
const utf8Decoder = new TextDecoder('utf-8', { fatal: true })

function isTextFile(filePath) {
  return ALLOWED_EXTENSIONS.has(path.extname(filePath).toLowerCase())
}

function collectFiles(targetPath) {
  const absolute = path.resolve(ROOT, targetPath)
  if (!fs.existsSync(absolute)) return []

  const stat = fs.statSync(absolute)
  if (stat.isFile()) {
    return isTextFile(absolute) ? [absolute] : []
  }

  const output = []
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    const next = path.join(absolute, entry.name)
    if (entry.isDirectory()) {
      output.push(...collectFiles(next))
      continue
    }
    if (entry.isFile() && isTextFile(next)) {
      output.push(next)
    }
  }
  return output
}

const files = TARGETS.flatMap(collectFiles)
const invalidUtf8 = []
const mojibakeFiles = []

for (const file of files) {
  const bytes = fs.readFileSync(file)
  let content
  try {
    content = utf8Decoder.decode(bytes)
  } catch {
    invalidUtf8.push(file)
    continue
  }

  if (MOJIBAKE_REGEX.test(content)) {
    mojibakeFiles.push(file)
  }
}

if (invalidUtf8.length === 0 && mojibakeFiles.length === 0) {
  console.log('Encoding check passed.')
  process.exit(0)
}

if (invalidUtf8.length > 0) {
  console.error('\nInvalid UTF-8 files:')
  for (const file of invalidUtf8) {
    console.error(`- ${path.relative(ROOT, file)}`)
  }
}

if (mojibakeFiles.length > 0) {
  console.error('\nPossible mojibake files:')
  for (const file of mojibakeFiles) {
    console.error(`- ${path.relative(ROOT, file)}`)
  }
}

process.exit(1)
