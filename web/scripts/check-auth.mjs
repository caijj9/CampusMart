import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Isolated adapters: these checks never create users or contact the backend.
const temporary = await mkdtemp(join(tmpdir(), 'campusmart-auth-'))
try {
  const output = join(temporary, 'check.mjs')
  await build({
    absWorkingDir: resolve(import.meta.dirname, '..'),
    stdin: {
      resolveDir: resolve(import.meta.dirname, '..'),
      contents: `
import assert from 'node:assert/strict'
import client, { BusinessError } from './src/api/client'
import { login, register, getMe, updatePassword, uploadAvatar } from './src/api/user'
import { TOKEN_KEY, useAuthStore } from './src/stores/auth'
import { loginSchema, registerSchema, safeRedirect } from './src/lib/authSchemas'

let result = { code: 0, msg: 'ok', data: null }
let lastRequest
client.defaults.adapter = async (config) => {
  lastRequest = config
  return { config, data: result, status: 200, statusText: 'OK', headers: {} }
}
result.data = 'test-token'
assert.equal(await login({ username: 'student', password: 'sample-password' }), 'test-token')
assert.equal(lastRequest.url, '/user/login')
assert.equal(lastRequest.method, 'post')
useAuthStore.getState().setToken('test-token')
result.data = { id: 1, username: 'student', avatar: null }
assert.equal((await getMe()).username, 'student')
assert.equal(lastRequest.headers.get('Authorization'), 'Bearer test-token')
assert.equal(lastRequest.url, '/user/me')
useAuthStore.getState().setCurrentUser(result.data)
result.data = '/upload/avatar/sample.png'
assert.equal(await uploadAvatar(new File(['image'], 'sample.png', { type: 'image/png' })), '/upload/avatar/sample.png')
assert.equal(lastRequest.data.get('file').name, 'sample.png')
assert.equal(useAuthStore.getState().currentUser.avatar, '/upload/avatar/sample.png')
result = { code: 1003, msg: '用户名或密码错误', data: null }
await assert.rejects(login({ username: 'student', password: 'wrong' }), (error) => error instanceof BusinessError && error.code === 1003)
assert.equal(useAuthStore.getState().token, 'test-token')
result = { code: 401, msg: '请先登录', data: null }
await assert.rejects(getMe(), (error) => error.code === 401)
assert.equal(localStorage.getItem(TOKEN_KEY), null)
assert.equal(useAuthStore.getState().currentUser, null)
assert.equal(window.location.redirected, '/login?redirect=%2Fme')
result = { code: 0, msg: 'ok', data: null }
await register({ username: 'student', password: 'sample-password' })
assert.equal(lastRequest.url, '/user/register')
useAuthStore.getState().setToken('new-test-token')
await updatePassword({ oldPassword: 'sample-password', newPassword: 'next-password' })
assert.equal(lastRequest.url, '/user/password')
assert.equal(lastRequest.method, 'put')
assert.equal(localStorage.getItem(TOKEN_KEY), null)
assert.equal(loginSchema.safeParse({ username: '', password: '' }).success, false)
const invalid = registerSchema.safeParse({ username: 'ab', password: '123456', confirmPassword: '654321', nickname: '', campus: '', phone: '123' })
assert.equal(invalid.success, false)
assert.deepEqual(invalid.error.issues.map((issue) => issue.path[0]).sort(), ['confirmPassword', 'phone', 'username'])
assert.equal(registerSchema.safeParse({ username: 'student', password: '123456', confirmPassword: '123456', nickname: '', campus: '', phone: '' }).success, true)
for (const target of ['https://example.com', '//example.com', '/\\\\example.com', '/login', '/register']) assert.equal(safeRedirect(target), '/')
assert.equal(safeRedirect('/me?tab=profile'), '/me?tab=profile')
console.log('PASS: auth API contracts, Bearer token, HTTP-200 business errors, 401 cleanup/redirect, avatar multipart, password invalidation, form validation, safe redirects')
`,
    },
    banner: { js: `
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
globalThis.window = { addEventListener() {}, location: { pathname: '/me', search: '', replace(value) { this.redirected = value } } };
` },
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: output,
  })
  await import(pathToFileURL(output).href)
} finally {
  await rm(temporary, { recursive: true, force: true })
}
