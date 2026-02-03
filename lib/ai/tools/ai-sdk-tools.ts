import { tool } from 'ai';
import { z } from 'zod';

// Esquemas para las herramientas (mismos que antes pero adaptados)
const getAvailableSlotsSchema = z.object({
  date: z
    .string()
    .describe('Fecha en formato YYYY-MM-DD. REQUERIDO. Convierte expresiones como "hoy", "mañana", "pasado mañana" a este formato.'),
  serviceId: z
    .string()
    .optional()
    .describe(
      'ID del servicio. REQUERIDO para consultar disponibilidad exacta.'
    ),
  specialistId: z
    .string()
    .optional()
    .describe('ID del especialista. REQUERIDO para consulta precisa de disponibilidad.'),
});

const createCustomerSchema = z.object({
  customerName: z
    .string()
    .describe('Nombre completo del cliente. REQUERIDO.'),
  customerPhone: z
    .string()
    .describe('Teléfono del cliente con formato. REQUERIDO.'),
  customerEmail: z
    .string()
    .optional()
    .describe('Email del cliente. COMPLETAMENTE OPCIONAL.'),
});

const createAppointmentSchema = z.object({
  customerId: z
    .string()
    .optional()
    .describe('ID del cliente. OPCIONAL - se obtiene automáticamente del estado de la sesión si ya fue identificado.'),
  serviceIds: z
    .array(z.string())
    .describe('Array con IDs de los servicios a agendar. REQUERIDO.'),
  specialistId: z
    .string()
    .describe('ID del especialista seleccionado. REQUERIDO.'),
  startTime: z
    .string()
    .describe('Fecha y hora de inicio en formato ISO 8601 exacto (ej: 2025-12-25T14:30:00). REQUERIDO.'),
});

const getAppointmentsByPhoneSchema = z.object({
  phone: z.string().describe('Teléfono del cliente'),
});

const cancelAppointmentSchema = z.object({
  reason: z
    .string()
    .optional()
    .describe('Motivo específico de la cancelación. OPCIONAL pero útil para registro interno.'),
});

const rescheduleAppointmentSchema = z.object({
  newStartTime: z
    .string()
    .describe(
      'Nueva fecha y hora en formato ISO 8601 exacto. REQUERIDO. Ejemplo: 2025-12-05T16:00:00'
    ),
  newSpecialistId: z
    .string()
    .optional()
    .describe('ID del nuevo especialista. OPCIONAL - si se omite, mantiene el mismo especialista.'),
});

const endConversationSchema = z.object({
  reason: z
    .string()
    .optional()
    .describe('Motivo del cierre. OPCIONAL. Ejemplos: "cliente satisfecho", "no necesita más ayuda"'),
});

const getServicesSchema = z.object({});

const getSpecialistsSchema = z.object({
  serviceId: z
    .string()
    .optional()
    .describe('ID del servicio para filtrar especialistas por categoría. OPCIONAL - si se omite, muestra todos los especialistas.'),
});

// Contexto para las herramientas
interface BusinessContext {
  businessId: string;
  sessionId: string;
}

// Importar los handlers existentes
import {
  handleGetAvailableSlots,
  handleGetServices,
  handleGetSpecialists,
  handleGetAppointmentsByPhone,
  handleCreateCustomer,
  handleCreateAppointment,
  handleCancelAppointment,
  handleRescheduleAppointment,
} from './handlers';
import { getCustomerData, getAgentContext } from '../graph/agent-context';

// Crear herramientas en formato AI SDK 6
export function createAppointmentTools(context: BusinessContext) {
  const getAvailableSlots = tool({
    description: 'Obtiene los horarios disponibles para una fecha. Para reprogramar, usa automáticamente el servicio de la cita del cliente.',
    inputSchema: getAvailableSlotsSchema,
    execute: async ({ date, serviceId, specialistId }) => {
      try {
        console.log('[AI SDK Tool] getAvailableSlots ejecutando con:', { date, serviceId, specialistId, ...context });
        const result = await handleGetAvailableSlots({
          date,
          serviceId,
          specialistId,
          ...context,
        });
        console.log('[AI SDK Tool] getAvailableSlots resultado:', { resultLength: result.length, success: !result.includes('[ERROR]') });
        return result;
      } catch (error) {
        console.error('[AI SDK Tool] getAvailableSlots error:', error);
        return `[ERROR] Error al obtener horarios: ${error instanceof Error ? error.message : 'Error desconocido'}`;
      }
    },
  });

  const getServices = tool({
    description: 'Obtiene la lista de servicios disponibles del negocio con precios y duraciones',
    inputSchema: getServicesSchema,
    execute: async () => {
      try {
        console.log('[AI SDK Tool] getServices ejecutando para businessId:', context.businessId);
        const result = await handleGetServices(context);
        console.log('[AI SDK Tool] getServices resultado length:', result.length, 'primeros 100 chars:', result.substring(0, 100));
        return result;
      } catch (error) {
        console.error('[AI SDK Tool] getServices error:', error);
        return `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`;
      }
    },
  });

  const getSpecialists = tool({
    description: 'Obtiene la lista de especialistas disponibles, opcionalmente filtrados por servicio',
    inputSchema: getSpecialistsSchema,
    execute: async ({ serviceId }) => {
      try {
        console.log('[AI SDK Tool] getSpecialists ejecutando con:', { serviceId, ...context });
        const result = await handleGetSpecialists({
          serviceId,
          ...context,
        });
        console.log('[AI SDK Tool] getSpecialists resultado:', { resultLength: result.length, success: !result.includes('[ERROR]') });
        return result;
      } catch (error) {
        console.error('[AI SDK Tool] getSpecialists error:', error);
        return `[ERROR] Error al obtener especialistas: ${error instanceof Error ? error.message : 'Error desconocido'}`;
      }
    },
  });

  const getSpecialistsForService = tool({
    description: 'Obtiene especialistas disponibles para un servicio específico, filtrados por categoría del servicio',
    inputSchema: z.object({
      serviceId: z.string().describe('ID del servicio para obtener especialistas de su categoría'),
    }),
    execute: async ({ serviceId }) => {
      try {
        console.log('[AI SDK Tool] getSpecialistsForService ejecutando con:', { serviceId, ...context });
        const result = await handleGetSpecialists({
          serviceId,
          ...context,
        });
        console.log('[AI SDK Tool] getSpecialistsForService resultado:', { resultLength: result.length, success: !result.includes('[ERROR]') });
        return result;
      } catch (error) {
        console.error('[AI SDK Tool] getSpecialistsForService error:', error);
        return `[ERROR] Error al obtener especialistas del servicio: ${error instanceof Error ? error.message : 'Error desconocido'}`;
      }
    },
  });

  const getAppointmentsByPhone = tool({
    description: 'Busca las citas de un cliente por su número de teléfono. Guarda los datos para usarlos después.',
    inputSchema: getAppointmentsByPhoneSchema,
    execute: async ({ phone }) => {
      return await handleGetAppointmentsByPhone({
        phone,
        ...context,
      });
    },
  });

  const createCustomer = tool({
    description: 'Crea un nuevo cliente en el sistema. Devuelve el ID del cliente para usar en create_appointment.',
    inputSchema: createCustomerSchema,
    execute: async ({ customerName, customerPhone, customerEmail }) => {
      return await handleCreateCustomer({
        customerName,
        customerPhone,
        customerEmail,
        ...context,
      });
    },
  });

  const createAppointment = tool({
    description: 'Crea una nueva cita en el sistema. REQUIERE el ID del cliente obtenido previamente con create_customer o get_appointments_by_phone.',
    inputSchema: createAppointmentSchema,
    execute: async ({ customerId, serviceIds, specialistId, startTime }) => {
      return await handleCreateAppointment({
        customerId,
        serviceIds,
        specialistId,
        startTime,
        ...context,
      });
    },
  });

  const cancelAppointment = tool({
    description: 'Cancela la cita del cliente. Usa automáticamente la cita identificada previamente.',
    inputSchema: cancelAppointmentSchema,
    execute: async ({ reason }) => {
      return await handleCancelAppointment({
        reason,
        ...context,
      });
    },
  });

  const rescheduleAppointment = tool({
    description: 'Reprograma la cita del cliente. Usa automáticamente la cita identificada previamente.',
    inputSchema: rescheduleAppointmentSchema,
    execute: async ({ newStartTime, newSpecialistId }) => {
      return await handleRescheduleAppointment({
        newStartTime,
        newSpecialistId,
        ...context,
      });
    },
  });

  const endConversation = tool({
    description: 'Finaliza la conversación cuando el cliente indica que no necesita más ayuda. Usa cuando el cliente responda "no", "nada más", "eso es todo", "gracias, eso es todo", etc. a la pregunta de si necesita algo más.',
    inputSchema: endConversationSchema,
    execute: async ({ reason }) => {
      console.log('[AI SDK Tool] endConversation ejecutando con:', { reason, ...context });
      return JSON.stringify({
        action: 'END_CONVERSATION',
        message: 'Gracias por contactarnos. ¡Que tengas un excelente día!',
        reason: reason || 'Cliente no necesita más ayuda',
        sessionId: context.sessionId,
      });
    },
  });

  const getSessionContext = tool({
    description: 'Obtiene los datos del cliente ya identificado en esta sesión. SIEMPRE usa esta herramienta al inicio de cada interacción para verificar si ya conoces al cliente. Si retorna datos, NO vuelvas a pedir nombre ni teléfono.',
    inputSchema: z.object({}),
    execute: async () => {
      // Ensure context is initialized
      getAgentContext(context.sessionId, context.businessId);

      const customerData = getCustomerData(context.sessionId);
      console.log('[AI SDK Tool] getSessionContext:', {
        sessionId: context.sessionId,
        hasCustomer: !!customerData,
        customerName: customerData ? `${customerData.firstName} ${customerData.lastName || ''}`.trim() : null,
      });

      if (customerData) {
        return JSON.stringify({
          hasCustomer: true,
          customerId: customerData.id,
          customerName: `${customerData.firstName} ${customerData.lastName || ''}`.trim(),
          firstName: customerData.firstName,
          phone: customerData.phone,
          email: customerData.email,
          pendingAppointments: customerData.appointments.length,
          appointments: customerData.appointments.map(apt => ({
            id: apt.appointmentId,
            service: apt.serviceName,
            specialist: apt.specialistName,
            date: apt.startTime,
          })),
        });
      }
      return JSON.stringify({
        hasCustomer: false,
        message: 'No hay cliente identificado en esta sesión. Solicita el teléfono para identificarlo.',
      });
    },
  });

  return {
    getSessionContext,
    getAvailableSlots,
    getServices,
    getSpecialists,
    getSpecialistsForService,
    getAppointmentsByPhone,
    createCustomer,
    createAppointment,
    cancelAppointment,
    rescheduleAppointment,
    endConversation,
  };
}

export type AppointmentTools = ReturnType<typeof createAppointmentTools>;