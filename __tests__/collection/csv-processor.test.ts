import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    validateCSVStructure,
    detectDuplicates,
    removeDuplicates,
    mapCSVToClients,
    CSVRow,
} from '@/lib/actions/collection/csv-processor'

describe('CSV Processor', () => {
    describe('validateCSVStructure', () => {
        it('should return valid for data with all required columns and valid data', async () => {
            const validData: CSVRow[] = [
                {
                    email: 'test@example.com',
                    full_name: 'John Doe',
                    amount_due: 1000,
                },
                {
                    email: 'test2@example.com',
                    full_name: 'Jane Doe',
                    amount_due: 2000,
                },
            ]

            const result = await validateCSVStructure(validData)

            expect(result.valid).toBe(true)
            expect(result.errors).toHaveLength(0)
            expect(result.rowCount).toBe(2)
            expect(result.preview).toHaveLength(2)
        })

        it('should return errors when required columns are missing', async () => {
            const invalidData: any[] = [
                {
                    email: 'test@example.com',
                    // missing full_name and amount_due
                },
            ]

            const result = await validateCSVStructure(invalidData as CSVRow[])

            expect(result.valid).toBe(false)
            expect(result.errors.some((e) => e.includes('full_name'))).toBe(true)
            expect(result.errors.some((e) => e.includes('amount_due'))).toBe(true)
        })

        it('should return errors for invalid email format', async () => {
            const dataWithInvalidEmail: CSVRow[] = [
                {
                    email: 'invalid-email',
                    full_name: 'John Doe',
                    amount_due: 1000,
                },
            ]

            const result = await validateCSVStructure(dataWithInvalidEmail)

            expect(result.valid).toBe(false)
            expect(result.errors.some((e) => e.includes('Email inválido'))).toBe(true)
        })

        it('should return errors for empty email', async () => {
            const dataWithEmptyEmail: CSVRow[] = [
                {
                    email: '',
                    full_name: 'John Doe',
                    amount_due: 1000,
                },
            ]

            const result = await validateCSVStructure(dataWithEmptyEmail)

            expect(result.valid).toBe(false)
            expect(result.errors.some((e) => e.includes('Email vacío'))).toBe(true)
        })

        it('should return errors for empty full_name', async () => {
            const dataWithEmptyName: CSVRow[] = [
                {
                    email: 'test@example.com',
                    full_name: '',
                    amount_due: 1000,
                },
            ]

            const result = await validateCSVStructure(dataWithEmptyName)

            expect(result.valid).toBe(false)
            expect(result.errors.some((e) => e.includes('Nombre completo vacío'))).toBe(true)
        })

        it('should return errors for invalid amount_due', async () => {
            const dataWithInvalidAmount: CSVRow[] = [
                {
                    email: 'test@example.com',
                    full_name: 'John Doe',
                    amount_due: NaN,
                },
            ]

            const result = await validateCSVStructure(dataWithInvalidAmount)

            expect(result.valid).toBe(false)
            expect(result.errors.some((e) => e.includes('Monto pendiente inválido'))).toBe(true)
        })

        it('should return warnings for zero or negative amount', async () => {
            const dataWithZeroAmount: CSVRow[] = [
                {
                    email: 'test@example.com',
                    full_name: 'John Doe',
                    amount_due: -100, // Negative value passes the !row.amount_due check but triggers warning
                },
            ]

            const result = await validateCSVStructure(dataWithZeroAmount)

            // Negative values pass initial check but trigger warning
            expect(result.warnings.some((w) => w.includes('cero o negativo'))).toBe(true)
        })

        it('should return warnings for missing recommended columns', async () => {
            const minimalData: CSVRow[] = [
                {
                    email: 'test@example.com',
                    full_name: 'John Doe',
                    amount_due: 1000,
                },
            ]

            const result = await validateCSVStructure(minimalData)

            expect(result.valid).toBe(true)
            expect(result.warnings.some((w) => w.includes('Columna recomendada faltante'))).toBe(true)
        })

        it('should detect and report duplicate emails', async () => {
            const dataWithDuplicates: CSVRow[] = [
                { email: 'duplicate@example.com', full_name: 'John Doe', amount_due: 1000 },
                { email: 'unique@example.com', full_name: 'Jane Doe', amount_due: 2000 },
                { email: 'duplicate@example.com', full_name: 'Jim Doe', amount_due: 3000 },
            ]

            const result = await validateCSVStructure(dataWithDuplicates)

            expect(result.duplicateEmails).toContain('duplicate@example.com')
            expect(result.warnings.some((w) => w.includes('Email duplicado'))).toBe(true)
        })

        it('should return error for empty data array', async () => {
            const result = await validateCSVStructure([])

            expect(result.valid).toBe(false)
            expect(result.errors.some((e) => e.includes('no contiene datos'))).toBe(true)
        })

        it('should limit preview to first 10 rows', async () => {
            const largeData: CSVRow[] = Array.from({ length: 20 }, (_, i) => ({
                email: `test${i}@example.com`,
                full_name: `User ${i}`,
                amount_due: (i + 1) * 100,
            }))

            const result = await validateCSVStructure(largeData)

            expect(result.preview).toHaveLength(10)
            expect(result.rowCount).toBe(20)
        })
    })

    describe('detectDuplicates', () => {
        it('should detect duplicate emails', async () => {
            const dataWithDuplicates: CSVRow[] = [
                { email: 'dup1@example.com', full_name: 'A', amount_due: 100 },
                { email: 'unique@example.com', full_name: 'B', amount_due: 200 },
                { email: 'DUP1@example.com', full_name: 'C', amount_due: 300 }, // case-insensitive duplicate
                { email: 'dup2@example.com', full_name: 'D', amount_due: 400 },
                { email: 'dup2@example.com', full_name: 'E', amount_due: 500 },
            ]

            const duplicates = await detectDuplicates(dataWithDuplicates)

            expect(duplicates).toContain('dup1@example.com')
            expect(duplicates).toContain('dup2@example.com')
            expect(duplicates).not.toContain('unique@example.com')
        })

        it('should return empty array when no duplicates', async () => {
            const uniqueData: CSVRow[] = [
                { email: 'a@example.com', full_name: 'A', amount_due: 100 },
                { email: 'b@example.com', full_name: 'B', amount_due: 200 },
                { email: 'c@example.com', full_name: 'C', amount_due: 300 },
            ]

            const duplicates = await detectDuplicates(uniqueData)

            expect(duplicates).toHaveLength(0)
        })
    })

    describe('removeDuplicates', () => {
        it('should remove duplicates keeping first occurrence', async () => {
            const dataWithDuplicates: CSVRow[] = [
                { email: 'dup@example.com', full_name: 'First', amount_due: 100 },
                { email: 'unique@example.com', full_name: 'Unique', amount_due: 200 },
                { email: 'dup@example.com', full_name: 'Second', amount_due: 300 },
            ]

            const unique = await removeDuplicates(dataWithDuplicates)

            expect(unique).toHaveLength(2)
            expect(unique[0].full_name).toBe('First') // First occurrence kept
            expect(unique[1].full_name).toBe('Unique')
        })

        it('should handle case-insensitive email comparison', async () => {
            const caseDuplicates: CSVRow[] = [
                { email: 'TEST@Example.com', full_name: 'First', amount_due: 100 },
                { email: 'test@example.com', full_name: 'Second', amount_due: 200 },
            ]

            const unique = await removeDuplicates(caseDuplicates)

            expect(unique).toHaveLength(1)
            expect(unique[0].full_name).toBe('First')
        })

        it('should return empty array for empty input', async () => {
            const unique = await removeDuplicates([])

            expect(unique).toHaveLength(0)
        })
    })

    describe('mapCSVToClients', () => {
        const executionId = 'test-execution-id-123'

        it('should map CSV rows to client inserts with all fields', async () => {
            const csvData: CSVRow[] = [
                {
                    email: 'TEST@example.com',
                    full_name: 'John Doe',
                    company_name: 'Acme Corp',
                    phone: '+1234567890',
                    nit: '123456789',
                    amount_due: 1500.50,
                    invoice_number: 'INV-001',
                    due_date: '2026-01-15',
                    days_overdue: 30,
                },
            ]

            const clients = await mapCSVToClients(executionId, csvData)

            expect(clients).toHaveLength(1)
            expect(clients[0].execution_id).toBe(executionId)
            expect(clients[0].email).toBe('test@example.com') // lowercased
            expect(clients[0].full_name).toBe('John Doe')
            expect(clients[0].company_name).toBe('Acme Corp')
            expect(clients[0].phone).toBe('+1234567890')
            expect(clients[0].nit).toBe('123456789')
            expect(clients[0].amount_due).toBe(1500.50)
            expect(clients[0].invoice_number).toBe('INV-001')
            expect(clients[0].days_overdue).toBe(30)
            expect(clients[0].status).toBe('pending')
        })

        it('should handle custom fields in custom_data', async () => {
            const csvData: CSVRow[] = [
                {
                    email: 'test@example.com',
                    full_name: 'John Doe',
                    amount_due: 1000,
                    custom_field_1: 'custom value 1',
                    region: 'North',
                },
            ]

            const clients = await mapCSVToClients(executionId, csvData)

            expect(clients[0].custom_data).toEqual({
                custom_field_1: 'custom value 1',
                region: 'North',
            })
        })

        it('should handle null/empty optional fields', async () => {
            const csvData: CSVRow[] = [
                {
                    email: 'test@example.com',
                    full_name: 'John Doe',
                    amount_due: 1000,
                    company_name: '',
                    phone: undefined,
                },
            ]

            const clients = await mapCSVToClients(executionId, csvData)

            expect(clients[0].company_name).toBeNull()
            expect(clients[0].phone).toBeNull()
        })

        it('should set all clients to pending status', async () => {
            const csvData: CSVRow[] = [
                { email: 'a@example.com', full_name: 'A', amount_due: 100 },
                { email: 'b@example.com', full_name: 'B', amount_due: 200 },
            ]

            const clients = await mapCSVToClients(executionId, csvData)

            expect(clients.every((c) => c.status === 'pending')).toBe(true)
        })
    })
})
