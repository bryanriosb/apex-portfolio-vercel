import { tool } from '@langchain/core/tools'
import { z } from 'zod'

const getAvailableSlotsToolSchema = z.object({
  date: z
    .string()
    .describe('Fecha en formato YYYY-MM-DD (ejemplo: 2025-12-05)'),
  serviceId: z
    .string()
    .optional()
    .describe(
      'ID del servicio (solo si es Crear Cita, para reprogramar se usa la cita del cliente)'
    ),
  specialistId: z
    .string()
    .optional()
    .describe('ID del especialista preferido (opcional)'),
})

const createAppointmentToolSchema = z.object({
  customerId: z
    .string()
    .optional()
    .describe('ID del cliente. OPCIONAL - se obtiene automáticamente del estado de la sesión si ya fue identificado.'),
  serviceIds: z.array(z.string()).describe('IDs de los servicios a agendar'),
  specialistId: z.string().describe('ID del especialista'),
  startTime: z.string().describe('Fecha y hora de inicio en formato ISO'),
})

const createCustomerToolSchema = z.object({
  customerName: z.string().describe('Nombre completo del cliente'),
  customerPhone: z.string().describe('Teléfono del cliente'),
  customerEmail: z.string().optional().describe('Email del cliente (opcional)'),
})

const getAppointmentsByPhoneToolSchema = z.object({
  phone: z.string().describe('Teléfono del cliente'),
})

export const cancelAppointmentSchema = z.object({
  reason: z.string().optional().describe('Motivo de la cancelación (opcional)'),
})

export const rescheduleAppointmentSchema = z.object({
  newStartTime: z
    .string()
    .describe(
      'Nueva fecha y hora en formato ISO (ejemplo: 2025-12-05T16:00:00)'
    ),
  newSpecialistId: z
    .string()
    .optional()
    .describe('Nuevo especialista (opcional)'),
})

const getServicesToolSchema = z.object({}).describe('No requiere parámetros')

const getSpecialistsToolSchema = z.object({
  serviceId: z.string().optional().describe('Filtrar por servicio específico'),
})

interface ContextParams {
  businessId: string
  sessionId: string
}

export type GetAvailableSlotsInput = z.infer<
  typeof getAvailableSlotsToolSchema
> &
  ContextParams
export type CreateAppointmentInput = z.infer<
  typeof createAppointmentToolSchema
> &
  ContextParams
export type CreateCustomerInput = z.infer<typeof createCustomerToolSchema> &
  ContextParams
export type GetAppointmentsByPhoneInput = z.infer<
  typeof getAppointmentsByPhoneToolSchema
> &
  ContextParams
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema> &
  ContextParams
export type RescheduleAppointmentInput = z.infer<
  typeof rescheduleAppointmentSchema
> &
  ContextParams
export type GetServicesInput = ContextParams
export type GetSpecialistsInput = z.infer<typeof getSpecialistsToolSchema> &
  ContextParams

export function createGetAvailableSlotsTool(
  ctx: ContextParams,
  handler: (input: GetAvailableSlotsInput) => Promise<string>
) {
  return tool(
    async (input: z.infer<typeof getAvailableSlotsToolSchema>) =>
      handler({ ...input, ...ctx }),
    {
      name: 'get_available_slots',
      description:
        'Obtiene los horarios disponibles para una fecha. Para reprogramar, usa automáticamente el servicio de la cita del cliente.',
      schema: getAvailableSlotsToolSchema,
    }
  )
}

export function createGetServicesTool(
  ctx: ContextParams,
  handler: (input: GetServicesInput) => Promise<string>
) {
  return tool(async () => handler(ctx), {
    name: 'get_services',
    description:
      'Obtiene la lista de servicios disponibles del negocio con precios y duraciones',
    schema: getServicesToolSchema,
  })
}

export function createGetSpecialistsTool(
  ctx: ContextParams,
  handler: (input: GetSpecialistsInput) => Promise<string>
) {
  return tool(
    async (input: z.infer<typeof getSpecialistsToolSchema>) =>
      handler({ ...input, ...ctx }),
    {
      name: 'get_specialists',
      description:
        'Obtiene la lista de especialistas disponibles, opcionalmente filtrados por servicio',
      schema: getSpecialistsToolSchema,
    }
  )
}

export function createGetAppointmentsByPhoneTool(
  ctx: ContextParams,
  handler: (input: GetAppointmentsByPhoneInput) => Promise<string>
) {
  return tool(
    async (input: z.infer<typeof getAppointmentsByPhoneToolSchema>) =>
      handler({ ...input, ...ctx }),
    {
      name: 'get_appointments_by_phone',
      description:
        'Busca las citas de un cliente por su número de teléfono. Guarda los datos para usarlos después.',
      schema: getAppointmentsByPhoneToolSchema,
    }
  )
}

export function createCreateCustomerTool(
  ctx: ContextParams,
  handler: (input: CreateCustomerInput) => Promise<string>
) {
  return tool(
    async (input: z.infer<typeof createCustomerToolSchema>) =>
      handler({ ...input, ...ctx }),
    {
      name: 'create_customer',
      description:
        'Crea un nuevo cliente en el sistema. Devuelve el ID del cliente para usar en create_appointment.',
      schema: createCustomerToolSchema,
    }
  )
}

export function createCreateAppointmentTool(
  ctx: ContextParams,
  handler: (input: CreateAppointmentInput) => Promise<string>
) {
  return tool(
    async (input: z.infer<typeof createAppointmentToolSchema>) =>
      handler({ ...input, ...ctx }),
    {
      name: 'create_appointment',
      description:
        'Crea una nueva cita en el sistema. IMPORTANTE: Solo usar después de haber verificado disponibilidad con get_available_slots y tener el ID del cliente (obtenido con create_customer o get_appointments_by_phone).',
      schema: createAppointmentToolSchema,
    }
  )
}

export function createCancelAppointmentTool(
  ctx: ContextParams,
  handler: (input: CancelAppointmentInput) => Promise<string>
) {
  return tool(
    async (input: z.infer<typeof cancelAppointmentSchema>) =>
      handler({ ...input, ...ctx }),
    {
      name: 'cancel_appointment',
      description:
        'Cancela la cita del cliente. Usa automáticamente la cita identificada previamente.',
      schema: cancelAppointmentSchema,
    }
  )
}

export function createRescheduleAppointmentTool(
  ctx: ContextParams,
  handler: (input: RescheduleAppointmentInput) => Promise<string>
) {
  return tool(
    async (input: z.infer<typeof rescheduleAppointmentSchema>) =>
      handler({ ...input, ...ctx }),
    {
      name: 'reschedule_appointment',
      description:
        'Reprograma la cita del cliente. Usa automáticamente la cita identificada previamente.',
      schema: rescheduleAppointmentSchema,
    }
  )
}
