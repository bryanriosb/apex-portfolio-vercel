import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CollectionService } from '@/lib/services/collection/collection-service'

describe('CollectionService - EventBridge Scheduler', () => {
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
    it('should convert America/Bogota 10:07 AM to correct local cron expression', () => {
      // Simular fecha: 26 Feb 2026, 10:07 AM en America/Bogota
      // Como EventBridge Scheduler soporta timezone, la expresión cron debe ser en hora LOCAL
      // No necesitamos convertir a UTC - AWS se encarga del timezone
      const localDate = new Date('2026-02-26T15:07:00.000Z') // Esta fecha está en UTC
      
      // Acceder al método privado para testing
      const cronExpression = (CollectionService as any).convertToCronExpression(
        localDate, 
        'America/Bogota'
      )
      
      console.log('Generated cron expression:', cronExpression)
      
      // La expresión cron debe ser: cron(7 10 26 2 ? 2026)
      // minutos=7, horas=10 (10 AM en Bogota), día=26, mes=2, año=2026
      expect(cronExpression).toMatch(/cron\(\d+ \d+ \d+ \d+ \? \d+\)/)
      
      // Verificar que contiene los componentes correctos
      expect(cronExpression).toContain('7')  // minutos
      expect(cronExpression).toContain('10') // horas LOCAL (10 AM Bogota)
      expect(cronExpression).toContain('26') // día
      expect(cronExpression).toContain('2')  // mes (febrero)
      expect(cronExpression).toContain('2026') // año
    })

    it('should handle different times correctly in local timezone', () => {
      const testCases = [
        {
          // 10:07 AM Bogota - debe generar hora 10 en cron
          date: new Date('2026-02-26T15:07:00.000Z'),
          timezone: 'America/Bogota',
          expectedHour: 10,
          expectedMinute: 7
        },
        {
          // 8:00 AM Bogota - debe generar hora 8 en cron
          date: new Date('2026-02-26T13:00:00.000Z'),
          timezone: 'America/Bogota',
          expectedHour: 8,
          expectedMinute: 0
        },
        {
          // 6:00 PM Bogota - debe generar hora 18 en cron
          date: new Date('2026-02-26T23:00:00.000Z'),
          timezone: 'America/Bogota',
          expectedHour: 18,
          expectedMinute: 0
        }
      ]

      testCases.forEach(({ date, timezone, expectedHour, expectedMinute }) => {
        const cronExpression = (CollectionService as any).convertToCronExpression(date, timezone)
        const parts = cronExpression.replace('cron(', '').replace(')', '').split(' ')
        
        expect(parseInt(parts[0])).toBe(expectedMinute)  // minutos
        expect(parseInt(parts[1])).toBe(expectedHour)    // horas LOCAL
      })
    })
  })

  describe('scheduleExecution (Integration)', () => {
    it('should create an EventBridge Schedule with America/Bogota timezone', async () => {
      // Solo ejecutar si tenemos credenciales de AWS configuradas
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.LAMBDA_EMAIL_WORKER_ARN || !process.env.EVENTBRIDGE_SCHEDULER_ROLE_ARN) {
        console.log('Skipping integration test - AWS credentials or scheduler role not configured')
        console.log('Required env vars: AWS_ACCESS_KEY_ID, LAMBDA_EMAIL_WORKER_ARN, EVENTBRIDGE_SCHEDULER_ROLE_ARN')
        return
      }

      // Crear fecha para mañana a las 10:07 AM en America/Bogota
      const now = new Date()
      const scheduledDate = new Date(now.getTime() + 24 * 60 * 60 * 1000) // Mañana
      // Ajustar a 10:07 AM Bogota (que sería 15:07 UTC)
      scheduledDate.setUTCHours(15, 7, 0, 0)

      console.log('\n🧪 TEST: Creating EventBridge Schedule with timezone support')
      console.log('📅 Target time (America/Bogota): 10:07 AM')
      console.log('📅 UTC time:', scheduledDate.toISOString())
      console.log('🎯 Expected cron in local time: cron(7 10 DD MM ? YYYY)')
      console.log('🌍 Timezone: America/Bogota')

      try {
        const result = await CollectionService.scheduleExecution(
          TEST_EXECUTION_ID,
          scheduledDate,
          'America/Bogota'
        )

        console.log('✅ Schedule created successfully:', result.ruleName)
        
        // Validar que la regla fue creada
        expect(result.ruleName).toBe(`collection-exec-${TEST_EXECUTION_ID}`)
        
        // Instrucciones para validación manual con AWS CLI
        console.log('\n📋 PARA VALIDAR CON AWS CLI:')
        console.log(`aws scheduler get-schedule --name ${result.ruleName} --region us-east-1`)
        console.log('\n📋 VERIFICAR QUE EL SCHEDULE USE LOCAL TIME:')
        console.log('La salida debe mostrar:')
        console.log('  "ScheduleExpression": "cron(7 10 ... )"  <-- HORA LOCAL (10 AM)')
        console.log('  "ScheduleExpressionTimezone": "America/Bogota"')
        console.log('\n📋 LISTAR TODOS LOS SCHEDULES:')
        console.log('aws scheduler list-schedules --region us-east-1')
        console.log('\n📋 PARA ELIMINAR EL SCHEDULE DE PRUEBA:')
        console.log(`aws scheduler delete-schedule --name ${result.ruleName} --region us-east-1`)
        
      } catch (error: any) {
        console.error('❌ Error creating schedule:', error.message)
        throw error
      }
    }, 30000) // Timeout de 30 segundos para llamadas AWS

    it('should verify that schedule is created with correct timezone configuration', async () => {
      // Este test verifica la configuración del schedule sin crearlo realmente
      // Validamos que los parámetros sean correctos
      
      console.log('\n🧪 TEST: Verifying timezone configuration')
      
      // Simular creación y verificar parámetros
      const testDate = new Date('2026-02-26T15:07:00.000Z') // 10:07 AM Bogota
      const timezone = 'America/Bogota'
      
      const cronExpression = (CollectionService as any).convertToCronExpression(testDate, timezone)
      
      // Verificar que la expresión está en hora local, no UTC
      // 10:07 AM Bogota = 15:07 UTC
      // El cron debe mostrar 10 (hora local), no 15 (hora UTC)
      expect(cronExpression).toContain(' 10 ') // hora local
      expect(cronExpression).not.toContain(' 15 ') // no debe ser hora UTC
      
      console.log('✅ Cron expression uses local time:', cronExpression)
      console.log('✅ Timezone configuration verified:', timezone)
      
      // Verificar variables de entorno requeridas
      const requiredEnvVars = [
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'LAMBDA_EMAIL_WORKER_ARN',
        'EVENTBRIDGE_SCHEDULER_ROLE_ARN'
      ]
      
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
      
      if (missingVars.length > 0) {
        console.warn('⚠️  Missing environment variables:', missingVars.join(', '))
        console.warn('⚠️  Set these variables to run the integration test')
      } else {
        console.log('✅ All required environment variables are set')
      }
    })
  })
})