import axios, { AxiosInstance } from 'axios'
import { cookies } from 'next/headers'
import { selectedEnvironment } from '.'

const config = {
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
}

// Request to api without authentication
export const apiApexAi: AxiosInstance = axios.create(config)

apiApexAi.interceptors.request.use((request) => {
  request.baseURL = selectedEnvironment.BASE_URL
  return request
})

// Request to api with authentication and refresh token
const apiApexAiAuth: AxiosInstance = axios.create(config)

apiApexAiAuth.interceptors.request.use(
  async (request) => {
    request.baseURL = selectedEnvironment.BASE_URL

    const token = process.env.APEX_AI_SECRET
    if (token && !request.headers['Authorization']) {
      request.headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const cookieStore = cookies()
      const businessAccountId = cookieStore.get('x-business-account-id')?.value
      if (businessAccountId && !request.headers['x-business-account-id']) {
        request.headers['x-business-account-id'] = businessAccountId
      }
    } catch (e) {
      // Ignore if used outside of Next.js server context
    }

    const fullUrl = request.baseURL
      ? request.baseURL + request.url
      : request.url
    console.log('URL completa:', fullUrl)

    return request
  },
  (err) => err
)

export default apiApexAiAuth
