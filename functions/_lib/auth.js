/**
 * Verifies Firebase ID tokens inside a Cloudflare Pages Function.
 *
 * The browser already signs in with Firebase Auth; admin endpoints re-verify
 * that token server-side, because anything the browser sends can be forged.
 *
 * Uses Google's JWK endpoint rather than the x509 one so the key imports
 * straight into WebCrypto with no ASN.1 parsing.
 */

const JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
const ISSUER_PREFIX = 'https://securetoken.google.com/'

let jwksCache = { keys: null, fetchedAt: 0 }
const JWKS_TTL_MS = 60 * 60 * 1000 // Google rotates these slowly

async function getKey(kid) {
  const fresh = Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS
  if (!fresh || !jwksCache.keys) {
    const res = await fetch(JWKS_URL)
    if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`)
    const { keys } = await res.json()
    jwksCache = { keys, fetchedAt: Date.now() }
  }

  let jwk = jwksCache.keys.find((k) => k.kid === kid)

  // An unknown kid may just mean the keys rotated since we cached; retry once.
  if (!jwk && Date.now() - jwksCache.fetchedAt > 60_000) {
    jwksCache = { keys: null, fetchedAt: 0 }
    return getKey(kid)
  }
  if (!jwk) throw new Error('Unknown signing key')

  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
}

/**
 * Returns the decoded payload, or throws. Callers should treat any throw as
 * a 401 and must not leak the reason to the client.
 */
export async function verifyIdToken(token, projectId) {
  if (!token) throw new Error('Missing token')

  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Malformed token')
  const [rawHeader, rawPayload, rawSig] = parts

  const header = JSON.parse(b64urlToText(rawHeader))
  const payload = JSON.parse(b64urlToText(rawPayload))

  if (header.alg !== 'RS256') throw new Error('Unexpected algorithm')

  const key = await getKey(header.kid)
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlToBytes(rawSig),
    new TextEncoder().encode(`${rawHeader}.${rawPayload}`),
  )
  if (!ok) throw new Error('Bad signature')

  // Signature alone is not enough - a valid token for a DIFFERENT Firebase
  // project would otherwise be accepted here.
  const now = Math.floor(Date.now() / 1000)
  if (payload.aud !== projectId) throw new Error('Wrong audience')
  if (payload.iss !== ISSUER_PREFIX + projectId) throw new Error('Wrong issuer')
  if (!payload.sub) throw new Error('Missing subject')
  if (payload.exp <= now) throw new Error('Token expired')
  if (payload.iat > now + 300) throw new Error('Token issued in the future')

  return payload
}

/** Pulls the bearer token out of an Authorization header. */
export function bearerToken(request) {
  const header = request.headers.get('Authorization') || ''
  const [scheme, value] = header.split(' ')
  return scheme?.toLowerCase() === 'bearer' ? value : null
}

/**
 * Guard for admin endpoints. Returns { user } on success or { response } to
 * return directly. The 401 body is deliberately generic.
 */
export async function requireAdmin(request, env) {
  const projectId = env.FIREBASE_PROJECT_ID
  if (!projectId) {
    return { response: jsonError('Server not configured', 503) }
  }
  try {
    const user = await verifyIdToken(bearerToken(request), projectId)
    return { user }
  } catch (err) {
    console.warn('admin auth rejected:', err.message)
    return { response: jsonError('Unauthorized', 401) }
  }
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

const b64urlToBytes = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

const b64urlToText = (s) => new TextDecoder().decode(b64urlToBytes(s))
