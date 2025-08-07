import { promises as fs } from 'node:fs'
import path from 'node:path'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

async function uniquePath(filePath: string): Promise<string> {
  const dir = path.dirname(filePath)
  const ext = path.extname(filePath)
  const base = path.basename(filePath, ext)
  let target = filePath
  let counter = 1

  while (true) {
    try {
      await fs.access(target)
      target = path.join(dir, `${base}(${counter})${ext}`)
      counter++
    } catch {
      return target
    }
  }
}

async function organizeFiles(source: string, destination: string, action: 'copy' | 'move') {
  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const name = entry.name
      const lower = name.toLowerCase()
      if (name.startsWith('.') || lower === 'trash' || lower === '$recycle.bin') {
        continue
      }
      const fullPath = path.join(current, name)
      if (entry.isDirectory()) {
        await walk(fullPath)
        continue
      }
      const extension = path.extname(name).replace('.', '').toUpperCase() || 'NO_EXTENSION'
      const stats = await fs.stat(fullPath)
      const year = new Date(stats.mtime).getFullYear().toString()
      const destDir = path.join(destination, extension, year)
      await fs.mkdir(destDir, { recursive: true })
      let destPath = path.join(destDir, entry.name)
      destPath = await uniquePath(destPath)

      if (action === 'move') {
        await fs.rename(fullPath, destPath)
      } else {
        await fs.copyFile(fullPath, destPath)
      }
    }
  }

  await walk(source)
}

async function main() {
  const rl = readline.createInterface({ input, output })
  const source = await rl.question('Welches Verzeichnis soll durchsucht werden? ')
  const mode = await rl.question('Sollen Dateien kopiert oder verschoben werden? (copy/move) ')
  const destination = await rl.question('Geben Sie das Zielverzeichnis an: ')
  rl.close()
  const action = mode.toLowerCase().startsWith('m') ? 'move' : 'copy'
  await organizeFiles(source.trim(), destination.trim(), action)
  console.log('Fertig!')
}

main()

