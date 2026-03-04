'use server'

import { Customer, CustomerCard, MercadoPagoConfig } from 'mercadopago'
import { getMpAccessToken } from '@/lib/config/mercadopago'

function getCustomerClient() {
  const config = new MercadoPagoConfig({
    accessToken: getMpAccessToken(),
    options: { timeout: 10000 },
  })
  return new Customer(config)
}

function getCustomerCardClient() {
  const config = new MercadoPagoConfig({
    accessToken: getMpAccessToken(),
    options: { timeout: 10000 },
  })
  return new CustomerCard(config)
}

export interface MPCustomer {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: {
    area_code?: string
    number?: string
  }
  identification?: {
    type?: string
    number?: string
  }
  address?: {
    id?: string
    zip_code?: string
    street_name?: string
    street_number?: string
  }
  date_registered?: string
  description?: string
  date_created?: string
  date_last_updated?: string
  metadata?: Record<string, unknown>
  default_address?: string
  default_card?: string
  cards?: MPCustomerCard[]
}

export interface MPCustomerCard {
  id: string
  customer_id: string
  expiration_month: number
  expiration_year: number
  first_six_digits: string
  last_four_digits: string
  payment_method: {
    id: string
    name: string
    payment_type_id: string
    thumbnail: string
    secure_thumbnail: string
  }
  security_code: {
    length: number
    card_location: string
  }
  issuer: {
    id: number
    name: string
  }
  cardholder: {
    name: string
    identification: {
      type: string
      number: string
    }
  }
  date_created: string
  date_last_updated: string
}

export interface CreateCustomerData {
  email: string
  firstName?: string
  lastName?: string
  phone?: {
    areaCode?: string
    number?: string
  }
  identification?: {
    type?: string
    number?: string
  }
  description?: string
}

export interface CustomerSearchResult {
  paging: {
    total: number
    limit: number
    offset: number
  }
  results: MPCustomer[]
}

export async function searchCustomerByEmail(
  email: string
): Promise<MPCustomer | null> {
  try {
    const customer = getCustomerClient()
    const response = await customer.search({ options: { email } })

    const results = response.results as MPCustomer[] | undefined
    if (results && results.length > 0) {
      return results[0]
    }
    return null
  } catch (error) {
    console.error('Error searching customer:', error)
    return null
  }
}

export async function getCustomerById(
  customerId: string
): Promise<MPCustomer | null> {
  try {
    const customer = getCustomerClient()
    const response = await customer.get({ customerId })
    return response as MPCustomer
  } catch (error) {
    console.error('Error getting customer:', error)
    return null
  }
}

export async function createCustomer(
  data: CreateCustomerData
): Promise<MPCustomer | null> {
  try {
    const customer = getCustomerClient()
    const response = await customer.create({
      body: {
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone
          ? {
              area_code: data.phone.areaCode,
              number: data.phone.number,
            }
          : undefined,
        identification: data.identification
          ? {
              type: data.identification.type,
              number: data.identification.number,
            }
          : undefined,
        description: data.description,
      },
    })
    return response as MPCustomer
  } catch (error) {
    console.error('Error creating customer:', error)
    return null
  }
}

export async function getOrCreateCustomer(
  data: CreateCustomerData
): Promise<{ customer: MPCustomer | null; isNew: boolean }> {
  const existingCustomer = await searchCustomerByEmail(data.email)

  if (existingCustomer) {
    return { customer: existingCustomer, isNew: false }
  }

  const newCustomer = await createCustomer(data)
  return { customer: newCustomer, isNew: true }
}

export async function createCustomerCard(
  customerId: string,
  cardToken: string
): Promise<MPCustomerCard | null> {
  try {
    const customerCard = getCustomerCardClient()
    const response = await customerCard.create({
      customerId,
      body: { token: cardToken },
    })
    return response as MPCustomerCard
  } catch (error) {
    console.error('Error creating customer card:', error)
    return null
  }
}

export async function getCustomerCards(
  customerId: string
): Promise<MPCustomerCard[]> {
  try {
    const customerCard = getCustomerCardClient()
    const response = await customerCard.list({ customerId })
    return (response || []) as MPCustomerCard[]
  } catch (error) {
    console.error('Error getting customer cards:', error)
    return []
  }
}

export async function deleteCustomerCard(
  customerId: string,
  cardId: string
): Promise<boolean> {
  try {
    const customerCard = getCustomerCardClient()
    await customerCard.remove({ customerId, cardId })
    return true
  } catch (error) {
    console.error('Error deleting customer card:', error)
    return false
  }
}
