import { sendSMSContiguity } from '@/lib/actions/contiguity'

/**
 * Servicio singleton de Contiguity
 * Proporciona acceso a las funcionalidades de email y SMS
 */
class ContiguityService {
  /**
   * Envía un SMS usando Contiguity
   */
  static async sendSMS(params: { to: string; message: string; from?: string }) {
    return await sendSMSContiguity(params)
  }
}

export default ContiguityService
