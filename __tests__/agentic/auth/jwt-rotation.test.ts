import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTH_ERROR_SESSION_EXPIRED, AUTH_OPTIONS } from '@/const/auth'
import { refreshSupabaseSession } from '@/lib/services/auth/supabase-auth'

vi.mock('@/lib/services/auth/supabase-auth', () => ({
  refreshSupabaseSession: vi.fn(),
}))

const jwtCallback = AUTH_OPTIONS.callbacks!.jwt!

/** JWT sin firma válida pero con payload decodificable (solo se lee `exp`). */
function fakeSupabaseJwt(expSeconds: number): string {
  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')
  return `${encode({ alg: 'HS256' })}.${encode({ exp: expSeconds })}.firma`
}

const NOW = Math.floor(Date.now() / 1000)

async function runJwt(token: Record<string, unknown>, user?: unknown) {
  const result = await jwtCallback({ token, user } as never)
  return result as Record<string, unknown>
}

beforeEach(() => {
  vi.mocked(refreshSupabaseSession).mockReset()
})

describe('rotación del access token de Supabase (callback jwt)', () => {
  it('login inicial: fusiona los datos del usuario en el JWT', async () => {
    const result = await runJwt(
      { existing: true },
      { accessToken: 'at', refreshToken: 'rt', expiresAt: NOW + 3600 }
    )
    expect(result.accessToken).toBe('at')
    expect(result.refreshToken).toBe('rt')
  })

  it('token vigente: se devuelve intacto sin llamar al refresh', async () => {
    const token = {
      accessToken: 'at',
      refreshToken: 'rt',
      expiresAt: NOW + 3600,
    }
    const result = await runJwt(token)
    expect(result).toEqual(token)
    expect(refreshSupabaseSession).not.toHaveBeenCalled()
  })

  it('sesión legacy sin expiresAt: recupera exp del propio access token y marca expirada si venció', async () => {
    const result = await runJwt({
      accessToken: fakeSupabaseJwt(NOW - 600),
      // sin refreshToken ni expiresAt: sesión acuñada antes del SSO
    })
    expect(result.accessToken).toBeNull()
    expect(result.authError).toBe(AUTH_ERROR_SESSION_EXPIRED)
  })

  it('sesión legacy con access token aún vigente: no la invalida', async () => {
    const accessToken = fakeSupabaseJwt(NOW + 3600)
    const result = await runJwt({ accessToken })
    expect(result.accessToken).toBe(accessToken)
    expect(result.authError).toBeUndefined()
  })

  it('token vencido con refresh exitoso: rota credenciales y limpia authError', async () => {
    vi.mocked(refreshSupabaseSession).mockResolvedValue({
      accessToken: 'nuevo-at',
      refreshToken: 'nuevo-rt',
      expiresAt: NOW + 3600,
    })
    const result = await runJwt({
      accessToken: 'at-viejo',
      refreshToken: 'rt-viejo',
      expiresAt: NOW - 10,
      authError: AUTH_ERROR_SESSION_EXPIRED,
    })
    expect(refreshSupabaseSession).toHaveBeenCalledWith('rt-viejo')
    expect(result.accessToken).toBe('nuevo-at')
    expect(result.refreshToken).toBe('nuevo-rt')
    expect(result.authError).toBeUndefined()
  })

  it('token vencido con refresh fallido: anula el access token y marca la sesión', async () => {
    vi.mocked(refreshSupabaseSession).mockResolvedValue(null)
    const result = await runJwt({
      accessToken: 'at-viejo',
      refreshToken: 'rt-revocado',
      expiresAt: NOW - 10,
    })
    expect(result.accessToken).toBeNull()
    expect(result.authError).toBe(AUTH_ERROR_SESSION_EXPIRED)
  })

  it('sesión sin access token (flujos de sistema): se devuelve intacta', async () => {
    const token = { sub: 'system' }
    const result = await runJwt(token)
    expect(result).toEqual(token)
    expect(refreshSupabaseSession).not.toHaveBeenCalled()
  })
})
