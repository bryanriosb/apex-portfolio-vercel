'use server'

import { Contiguity } from 'contiguity'

/**
 * Obtiene la instancia de Contiguity
 */
export async function getContiguityClient() {
  const token = process.env.CONTIGUITY_TOKEN

  if (!token) {
    throw new Error(
      'CONTIGUITY_TOKEN no está configurado en las variables de entorno'
    )
  }

  return new Contiguity(token)
}

/**
 * Envía un SMS usando Contiguity
 */
export async function sendSMSContiguity(params: {
  to: string
  message: string
  from?: string
}) {
  const contiguity = await getContiguityClient()
  return await contiguity.text.send(params)
}
