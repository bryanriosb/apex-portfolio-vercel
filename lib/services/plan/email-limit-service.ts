import {
  countEmailsSentAction,
  validateEmailLimitAction,
  getEmailPeriodForAccount,
  type EmailLimitValidation,
} from '@/lib/actions/collection/email-limit'
import type { BusinessAccount } from '@/lib/models/business-account/business-account'

export interface EmailLimitCheck {
  canSend: boolean
  maxEmails: number | null
  emailsSent: number
  emailsRemaining: number | null
  requestedCount: number
  periodStart: Date
  periodEnd: Date
  errorMessage?: string
}

export default class EmailLimitService {
  /**
   * Obtiene el período de conteo de emails para una cuenta.
   */
  async getEmailPeriod(account: BusinessAccount): Promise<{
    start: Date
    end: Date
  }> {
    return getEmailPeriodForAccount(account)
  }

  /**
   * Cuenta los emails enviados por una cuenta en su período actual.
   */
  async countEmailsSent(account: BusinessAccount): Promise<number> {
    const { start, end } = await this.getEmailPeriod(account)
    const result = await countEmailsSentAction(account.id, start, end)
    return result.emailsSent
  }

  /**
   * Valida si una cuenta puede enviar la cantidad solicitada de emails.
   * Retorna información detallada incluyendo mensaje de error si aplica.
   */
  async validateLimit(
    account: BusinessAccount,
    requestedCount: number
  ): Promise<EmailLimitCheck> {
    try {
      const validation = await validateEmailLimitAction(account, requestedCount)

      // Si no hay límite, permitir siempre
      if (validation.maxEmails === null) {
        return {
          canSend: true,
          maxEmails: null,
          emailsSent: validation.emailsSent,
          emailsRemaining: null,
          requestedCount,
          periodStart: validation.periodStart,
          periodEnd: validation.periodEnd,
        }
      }

      // Si ya alcanzó el límite
      if (validation.hasReachedLimit) {
        return {
          canSend: false,
          maxEmails: validation.maxEmails,
          emailsSent: validation.emailsSent,
          emailsRemaining: 0,
          requestedCount,
          periodStart: validation.periodStart,
          periodEnd: validation.periodEnd,
          errorMessage: this.buildLimitErrorMessage(validation, requestedCount),
        }
      }

      // Si la cantidad solicitada excede el límite restante
      if (validation.emailsRemaining !== null && requestedCount > validation.emailsRemaining) {
        return {
          canSend: false,
          maxEmails: validation.maxEmails,
          emailsSent: validation.emailsSent,
          emailsRemaining: validation.emailsRemaining,
          requestedCount,
          periodStart: validation.periodStart,
          periodEnd: validation.periodEnd,
          errorMessage: this.buildLimitErrorMessage(validation, requestedCount),
        }
      }

      // Todo bien, puede enviar
      return {
        canSend: true,
        maxEmails: validation.maxEmails,
        emailsSent: validation.emailsSent,
        emailsRemaining: validation.emailsRemaining,
        requestedCount,
        periodStart: validation.periodStart,
        periodEnd: validation.periodEnd,
      }
    } catch (error: any) {
      console.error('Error validating email limit:', error)
      // En caso de error, permitir pero loggear
      // Esto evita bloquear al usuario por errores técnicos
      return {
        canSend: true,
        maxEmails: null,
        emailsSent: 0,
        emailsRemaining: null,
        requestedCount,
        periodStart: new Date(),
        periodEnd: new Date(),
        errorMessage: undefined,
      }
    }
  }

  /**
   * Verifica si una cuenta tiene límite de emails configurado.
   */
  async hasEmailLimit(account: BusinessAccount): Promise<boolean> {
    const validation = await validateEmailLimitAction(account, 0)
    return validation.maxEmails !== null
  }

  /**
   * Obtiene información del límite actual sin validar una cantidad específica.
   */
  async getLimitInfo(account: BusinessAccount): Promise<{
    maxEmails: number | null
    emailsSent: number
    emailsRemaining: number | null
    hasReachedLimit: boolean
  }> {
    const validation = await validateEmailLimitAction(account, 0)
    return {
      maxEmails: validation.maxEmails,
      emailsSent: validation.emailsSent,
      emailsRemaining: validation.emailsRemaining,
      hasReachedLimit: validation.hasReachedLimit,
    }
  }

  /**
   * Construye un mensaje de error amigable cuando se excede el límite.
   */
  private buildLimitErrorMessage(
    validation: EmailLimitValidation,
    requestedCount: number
  ): string {
    const { maxEmails, emailsSent, emailsRemaining } = validation

    if (maxEmails === 0) {
      return 'Tu plan actual no incluye envío de emails. Actualiza tu plan para continuar.'
    }

    if (emailsRemaining === 0) {
      return `Has alcanzado el límite de ${maxEmails} emails de tu plan. Actualiza tu plan para continuar.`
    }

    return `Solo puedes enviar ${emailsRemaining} emails más de ${maxEmails} permitidos. Intentas enviar ${requestedCount}. Reduce la cantidad o actualiza tu plan.`
  }
}

export type { EmailLimitValidation }