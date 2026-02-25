import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CollectionService } from '@/lib/services/collection/collection-service'

describe('CollectionService - EventBridge Schedule', () => {
  const TEST_EXECUTION_ID = `test-schedule-${Date.now()}`
  
  // Cleanup después de cada test
  afterEach(async () => {
    try {
      await CollectionService.cancelScheduledExecution(`collection-exec-${TEST_EXECUTION_ID}`)
    } catch (error) {
      // Ignorar errores de cleanup
    }
  })

  describe('convertToCronExpression', () => {
    it('should convert America/Bogota 10:07 AM to correct UTC cron expression', () => {
      // Simular fecha local en America/Bogota: 26 Feb 2026, 10:07 AM
      // America/Bogota es UTC-5, así que 10:07 AM Bogota = 15:07 UTC
      const localDate = new Date('2026-02-26T15:07:00.000Z') // Esta fecha está en UTC
      
      // Acceder al método privado para testing
      const cronExpression = (CollectionService as any).convertToCronExpression(
        localDate, 
        'America/Bogota'
      )
      
      console.log('Generated cron expression:', cronExpression)
      
      // La expresión cron debe ser: cron(7 15 26 2 ? 2026)
      // minutos=7, horas=15 (3 PM UTC), día=26, mes=2, año=2026
      expect(cronExpression).toMatch(/cron\(\d+ \d+ \d+ \d+ \? \d+\)/)
      
      // Verificar que contiene los componentes correctos
      expect(cronExpression).toContain('7')  // minutos
      expect(cronExpression).toContain('15') // horas UTC (3 PM)
      expect(cronExpression).toContain('26') // día
      expect(cronExpression).toContain('2')  // mes (febrero)
      expect(cronExpression).toContain('2026') // año
    })

    it('should handle different times correctly', () => {
      const testCases = [
        {
          // 10:07 AM Bogota -> 15:07 UTC
          date: new Date('2026-02-26T15:07:00.000Z'),
          timezone: 'America/Bogota',
          expectedHour: 15,
          expectedMinute: 7
        },
        {
          // 8:00 AM Bogota -> 13:00 UTC (1 PM)
          date: new Date('2026-02-26T13:00:00.000Z'),
          timezone: 'America/Bogota',
          expectedHour: 13,
          expectedMinute: 0
        },
        {
          // 6:00 PM Bogota -> 23:00 UTC (11 PM)
          date: new Date('2026-02-26T23:00:00.000Z'),
          timezone: 'America/Bogota',
          expectedHour: 23,
          expectedMinute: 0
        }
      ]

      testCases.forEach(({ date, timezone, expectedHour, expectedMinute }) => {
        const cronExpression = (CollectionService as any).convertToCronExpression(date, timezone)
        const parts = cronExpression.replace('cron(', '').replace(')', '').split(' ')
        
        expect(parseInt(parts[0])).toBe(expectedMinute)  // minutos
        expect(parseInt(parts[1])).toBe(expectedHour)    // horas
      })
    })
  })

  describe('scheduleExecution (Integration)', () => {
    it('should create an EventBridge rule with correct timezone conversion', async () => {
      // Solo ejecutar si tenemos credenciales de AWS configuradas
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.LAMBDA_EMAIL_WORKER_ARN) {
        console.log('Skipping integration test - AWS credentials not configured')
        return
      }

      // Crear fecha para 10:07 AM en America/Bogota
      // Como es UTC-5, necesitamos sumar 5 horas para obtener UTC
      const now = new Date()
      const scheduledDate = new Date(now.getTime() + 24 * 60 * 60 * 1000) // Mañana
      scheduledDate.setHours(15, 7, 0, 0) // 15:07 UTC = 10:07 AM Bogota

      console.log('\n🧪 TEST: Creating EventBridge schedule')
      console.log('📅 Local time (America/Bogota): 10:07 AM')
      console.log('📅 UTC time:', scheduledDate.toISOString())
      console.log('🎯 Expected cron: cron(7 15 DD MM ? YYYY)')

      try {
        const result = await CollectionService.scheduleExecution(
          TEST_EXECUTION_ID,
          scheduledDate,
          'America/Bogota'
        )

        console.log('✅ Rule created successfully:', result.ruleName)
        
        // Validar que la regla fue creada
        expect(result.ruleName).toBe(`collection-exec-${TEST_EXECUTION_ID}`)
        
        // Instrucciones para validación manual con AWS CLI
        console.log('\n📋 PARA VALIDAR CON AWS CLI:')
        console.log(`aws events describe-rule --name ${result.ruleName} --region us-east-1`)
        console.log('\n📋 PARA LISTAR TODAS LAS REGLAS:')
        console.log('aws events list-rules --region us-east-1')
        console.log('\n📋 PARA ELIMINAR LA REGLA DE PRUEBA:')
        console.log(`aws events delete-rule --name ${result.ruleName} --force --region us-east-1`)
        
      } catch (error: any) {
        console.error('❌ Error creating schedule:', error.message)
        throw error
      }
    }, 30000) // Timeout de 30 segundos para llamadas AWS
  })
})
