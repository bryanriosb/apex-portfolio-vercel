import { describe, it, expect } from 'vitest'
import { tryParseDate, excelSerialToDate } from '@/components/collection/wizard/utils'
import { isValid, format } from 'date-fns'

describe('Wizard Utils - Date Parsing', () => {
    describe('excelSerialToDate', () => {
        it('should convert Excel serial 46064 to 2026-02-11', () => {
            const date = excelSerialToDate(46064)
            expect(isValid(date)).toBe(true)
            expect(format(date, 'yyyy-MM-dd')).toBe('2026-02-11')
        })

        it('should convert Excel serial 46069 to 2026-02-16', () => {
            const date = excelSerialToDate(46069)
            expect(isValid(date)).toBe(true)
            expect(format(date, 'yyyy-MM-dd')).toBe('2026-02-16')
        })
    })

    describe('tryParseDate', () => {
        const formatMMDDYYYY = 'MM/DD/AAAA'

        it('should parse standard date string', () => {
            const date = tryParseDate('02/11/2026', formatMMDDYYYY)
            expect(isValid(date)).toBe(true)
            expect(format(date!, 'yyyy-MM-dd')).toBe('2026-02-11')
        })

        it('should handle numeric input (Excel serial)', () => {
            const date = tryParseDate(46064, formatMMDDYYYY)
            expect(isValid(date)).toBe(true)
            expect(format(date!, 'yyyy-MM-dd')).toBe('2026-02-11')
        })

        it('should handle stringified numeric input', () => {
            const date = tryParseDate('46064', formatMMDDYYYY)
            expect(isValid(date)).toBe(true)
            expect(format(date!, 'yyyy-MM-dd')).toBe('2026-02-11')
        })

        it('should handle Date objects', () => {
            const inputDate = new Date(2026, 1, 11) // Feb 11
            const date = tryParseDate(inputDate, formatMMDDYYYY)
            expect(isValid(date)).toBe(true)
            expect(format(date!, 'yyyy-MM-dd')).toBe('2026-02-11')
        })

        it('should return null for invalid inputs', () => {
            expect(tryParseDate('', formatMMDDYYYY)).toBeNull()
            expect(tryParseDate(null, formatMMDDYYYY)).toBeNull()
            expect(tryParseDate(undefined, formatMMDDYYYY)).toBeNull()
            expect(tryParseDate('not-a-date', formatMMDDYYYY)).toBeNull()
        })
    })
})
