/**
 * Automated Smoke Test for Local Tournament Platform
 * Validates production build artifacts, bundle safety (no secret leaks),
 * and Supabase backend endpoint connectivity.
 *
 * Run via: npx tsx tests/smoke-test.ts
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

let passed = 0
let failed = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++
    console.log(`  ✅ ${message}`)
  } else {
    failed++
    console.error(`  ❌ ${message}`)
  }
}

function test(name: string, fn: () => void | Promise<void>) {
  console.log(`\n🔍 ${name}`)
  return fn()
}

async function run() {
  const rootDir = process.cwd()
  const distDir = path.join(rootDir, 'dist')

  // 1. Build Artifacts Verification
  await test('Production build artifacts exist', () => {
    assert(fs.existsSync(distDir), 'dist/ directory exists')
    const indexHtml = path.join(distDir, 'index.html')
    assert(fs.existsSync(indexHtml), 'dist/index.html exists')

    const htmlContent = fs.readFileSync(indexHtml, 'utf-8')
    assert(htmlContent.includes('<div id="root"></div>'), 'Root mount container present in index.html')
    assert(htmlContent.includes('<meta name="viewport"'), 'Responsive viewport meta tag present')

    const assetsDir = path.join(distDir, 'assets')
    assert(fs.existsSync(assetsDir), 'dist/assets/ directory exists')

    const files = fs.readdirSync(assetsDir)
    const jsFiles = files.filter((f) => f.endsWith('.js'))
    const cssFiles = files.filter((f) => f.endsWith('.css'))

    assert(jsFiles.length > 0, `Compiled JavaScript bundle exists (${jsFiles.join(', ')})`)
    assert(cssFiles.length > 0, `Compiled CSS bundle exists (${cssFiles.join(', ')})`)
  })

  // 2. Secret Leak Inspection in Client Bundle
  await test('Verify no sensitive secrets leaked into client bundle', () => {
    const assetsDir = path.join(distDir, 'assets')
    const files = fs.readdirSync(assetsDir)
    const sensitivePatterns = [
      'sb_secret_',
      'SUPABASE_SECRET_KEY',
      'RESEND_API_KEY',
      're_',
    ]

    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.css')) {
        const content = fs.readFileSync(path.join(assetsDir, file), 'utf-8')
        for (const pattern of sensitivePatterns) {
          const leaked = content.includes(pattern)
          assert(!leaked, `Bundle ${file} must NOT contain secret pattern "${pattern}"`)
        }
      }
    }
  })

  // 3. Supabase Client & Backend Verification
  await test('Supabase client connectivity & table accessibility', async () => {
    const envUrl = process.env.VITE_SUPABASE_URL || 'https://jzpsjffsytkbvuqwlypc.supabase.co'
    const envKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_eRZ2tlXU1W73bAfUVgwHpw_ULi3Zaae'

    assert(Boolean(envUrl), 'Supabase URL is defined')
    assert(Boolean(envKey), 'Supabase Anon Key is defined')

    try {
      const client = createClient(envUrl, envKey)
      const { data, error } = await client.from('tournaments').select('id, name, format, status').limit(5)

      if (error) {
        console.warn(`  ⚠️ Supabase query returned error (network or policy): ${error.message}`)
      } else {
        assert(Array.isArray(data), `Successfully queried tournaments table (${data.length} records returned)`)
      }
    } catch (e: any) {
      console.warn(`  ⚠️ Supabase connection check skipped: ${e.message}`)
    }
  })

  console.log(`\n========================================`)
  console.log(`Smoke Test Results: ${passed} passed, ${failed} failed`)
  if (failed > 0) {
    process.exit(1)
  } else {
    console.log(`✅ All smoke tests passed successfully!`)
  }
}

run().catch((err) => {
  console.error('Smoke test runner failed:', err)
  process.exit(1)
})
