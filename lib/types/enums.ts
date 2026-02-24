// Database enums matching Supabase schema

export type BusinessType =
  | 'FINANCE'
  | 'MARKETING'
  | 'CONSULTORY'
  | 'EDUCATION'
  | 'HEALTH'
  | 'SPORT'
  | 'TECHNOLOGY'
  | 'TRAVEL'
  | 'FOOD'
  | 'BEAUTY'
  | 'LEGAL'
  | 'MUSIC'
  | 'INDUSTRY'
  | 'INDEPENDENT'
  | 'REAL_ESTATE'
  | 'AUTOMOTIVE'
  | 'PETS'
  | 'LOGISTIC'
  | 'OTHER'


export type DayOfWeek = '0' | '1' | '2' | '3' | '4' | '5' | '6'

export type UserGender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED'

export type PaymentMethod = 'AT_VENUE' | 'CREDIT_CARD' | 'PAYPAL' | 'NEQUI'

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'

export type PromotionType =
  | 'PERCENTAGE_OFF'
  | 'FIXED_AMOUNT_OFF'
  | 'SPECIAL_COMBO'

export type MessageSenderType = 'USER' | 'BUSINESS'

export type NotificationType =
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_REMINDER'
  | 'BOOKING_UPDATED'
  | 'BOOKING_CANCELLED'
  | 'REVIEW_REQUEST'
  | 'NEW_CHAT_MESSAGE'
  | 'PROMOTIONAL_OFFER'
  | 'NEWSLETTER_UPDATE'
  | 'ACCOUNT_UPDATE'
  | 'GENERAL_INFO'

export type NotificationSource = 'push' | 'local' | 'internal'

export type userRoles =
  | 'company_admin'
  | 'business_admin'
  | 'business_monitor'
  | 'customer'

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED'

export type ProductType = 'SUPPLY' | 'RETAIL'

export type InventoryMovementType =
  | 'ENTRY'
  | 'CONSUMPTION'
  | 'SALE'
  | 'ADJUSTMENT'
  | 'TRANSFER'
  | 'WASTE'

export type ServiceType = 'REGULAR' | 'ASSESSMENT'
