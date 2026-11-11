// Speaks ACP to an extracted payload's hermes-acp over stdio, the way a
// registry client launches it: initialize, then session/new on a fresh home.
// Fails unless initialize answers with the expected agent version and a
// login method; session/new is printed, since a home with no provider
// configured has nothing to open a session with.
// Usage: node acp-handshake.mjs <payload-dir> <version>
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'

const [payload, version] = [resolve(process.argv[2]), process.argv[3]]
const manifest = JSON.parse(readFileSync(join(payload, 'manifest.json'), 'utf8'))
const home = mkdtempSync(join(tmpdir(), 'acp-home-'))
// The OS's own necessities only: no Python, Node or uv from the runner.
const system = process.platform === 'win32'
  ? [join(process.env.SYSTEMROOT, 'System32'), process.env.SYSTEMROOT].join(';')
  : '/usr/bin:/bin'
const env = { PATH: system, HOME: home, USERPROFILE: home, HERMES_HOME: join(home, '.hermes') }
for (const [key, value] of Object.entries(process.env)) {
  if (/^(systemroot|windir|comspec|pathext|temp|tmp)$/i.test(key)) env[key] = value
}
const agent = spawn(resolve(payload, manifest.runtime.commands['hermes-acp']), [], {
  cwd: home, env, stdio: ['pipe', 'pipe', 'inherit'],
})

const pending = new Map()
createInterface({ input: agent.stdout }).on('line', (line) => {
  let message
  try { message = JSON.parse(line) } catch { return console.log(`(non-JSON stdout) ${line}`) }
  if (message.id !== undefined && pending.has(message.id)) {
    pending.get(message.id)(message)
    pending.delete(message.id)
  } else {
    console.log(`← ${line.slice(0, 400)}`)
  }
})

let next = 1
function request(method, params) {
  const id = next++
  agent.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
  return new Promise((done, fail) => {
    pending.set(id, done)
    setTimeout(() => fail(new Error(`${method}: no answer in 120s`)), 120000).unref()
  })
}

const started = Date.now()
try {
  const init = await request('initialize', {
    protocolVersion: 1,
    clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false },
  })
  console.log(`initialize (${Date.now() - started} ms): ${JSON.stringify(init.result ?? init.error)}`)
  const answered = init.result?.agentInfo?.version
  if (answered !== version) throw new Error(`agent version ${answered}, expected ${version}`)
  if (!(init.result.authMethods?.length > 0)) throw new Error('no login method declared')
  const session = await request('session/new', { cwd: home, mcpServers: [] })
  console.log(`session/new: ${JSON.stringify(session.result ?? session.error).slice(0, 600)}`)
} catch (error) {
  console.log(`handshake: ${error.message}`)
  process.exitCode = 1
} finally {
  agent.kill()
}
