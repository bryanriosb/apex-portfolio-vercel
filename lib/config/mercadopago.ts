import { MercadoPagoConfig } from 'mercadopago'

const isSandbox = process.env.MP_SANDBOX === 'true'

const accessToken = isSandbox
  ? process.env.MP_ACCESS_TOKEN_TEST
  : process.env.MP_ACCESS_TOKEN

if (!accessToken) {
  console.warn('Mercado Pago access token not configured')
}

export const mercadoPagoClient = new MercadoPagoConfig({
  accessToken: accessToken || '',
  options: {
    timeout: 10000,
  },
})

export const mpConfig = {
  isSandbox,
  webhookSecret: process.env.MP_WEBHOOK_SECRET,
  currency: 'COP',
  gracePeriodDays: 2,
  webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadopago/webhook`,
  // Test user credentials for sandbox mode (buyer account)
  // Username: TESTUSER8047080309146674806
  // User ID: 2959447825
  testUser: {
    email: 'test_user_8047080309146674806@testuser.com',
    username: 'TESTUSER8047080309146674806',
    userId: '2959447825',
  },
}

export const MP_ENDPOINTS = {
  preapprovalPlan: 'https://api.mercadopago.com/preapproval_plan',
  preapproval: 'https://api.mercadopago.com/preapproval',
  payments: 'https://api.mercadopago.com/v1/payments',
  orders: 'https://api.mercadopago.com/v1/orders',
  cardTokens: 'https://api.mercadopago.com/v1/card_tokens',
} as const

export function getMpAccessToken(): string {
  const isSandbox = process.env.MP_SANDBOX === 'true'
  const token = isSandbox
    ? process.env.MP_ACCESS_TOKEN_TEST
    : process.env.MP_ACCESS_TOKEN
  return token || ''
}
