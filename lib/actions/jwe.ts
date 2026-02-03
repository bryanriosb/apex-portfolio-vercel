'use server'

import { importSPKI, CompactEncrypt } from 'jose'
import { randomUUID } from 'crypto'

/**
 * Server Action para generar un token JWE encriptado con ECDH-ES+A256KW
 * Esto debe ejecutarse en el servidor porque las variables de entorno
 * solo están disponibles del lado del servidor
 */
export async function generateJWEToken(): Promise<string> {
  const apiKey = process.env.LLM_API_KEY
  const publicKeyPEM = process.env.JWE_PUBLIC_KEY

  if (!apiKey) {
    throw new Error('LLM_API_KEY environment variable is not set')
  }

  if (!publicKeyPEM) {
    throw new Error('JWE_PUBLIC_KEY environment variable is not set')
  }

  try {
    // Importar la clave pública EC
    const publicKey = await importSPKI(publicKeyPEM, 'ECDH-ES+A256KW')

    // Crear el payload como JSON con la API key
    const payload = JSON.stringify({
      api_key: apiKey,
      nonce: randomUUID(), // ← Nonce único para prevenir replay
      timestamp: Date.now(),
    })

    // Crear el JWE con el algoritmo ECDH-ES+A256KW y encriptación A256GCM
    const jwe = await new CompactEncrypt(new TextEncoder().encode(payload))
      .setProtectedHeader({
        alg: 'ECDH-ES+A256KW',
        enc: 'A256GCM',
      })
      .encrypt(publicKey)

    return jwe
  } catch (error) {
    console.error('Error generating JWE token:', error)
    throw new Error('Failed to generate JWE token')
  }
}
