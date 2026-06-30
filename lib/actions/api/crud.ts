'use server'

import apiApexAiAuth from './apex-ai'

export async function query(url: string, params?: any): Promise<any> {
  const request = await apiApexAiAuth.get(url, { params })
  // La configuración está en response.config
  const requestConfig = request.config

  // El baseURL se combina con la URL relativa
  const baseUrl = requestConfig.baseURL || ''
  const fullUrl = `${baseUrl}${requestConfig.url}`

  console.log('Petición exitosa a:')
  console.log('URL Base:', fullUrl)
  console.log('Parámetros:', requestConfig.params)

  return request.data
}

export async function create(
  url: string,
  data: any,
  config?: any
): Promise<any> {
  const request = await apiApexAiAuth.post(url, data, { ...config })
  return request.data
}

export async function update(
  url: string,
  data: any,
  partial: boolean,
  config?: object
): Promise<any> {
  const request = partial
    ? await apiApexAiAuth.patch(url, data, { ...config })
    : await apiApexAiAuth.put(url, data, { ...config })
  return request.data
}

export async function destroy(url: string): Promise<any> {
  const request = await apiApexAiAuth.delete(url)
  return request.data
}
