// Utility for date formatting using business timezone with date-fns
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { es } from 'date-fns/locale'

/**
 * Parses a date input (string, Date, or number) into a Date object.
 * Handles both seconds and milliseconds Unix timestamps.
 */
function parseDate(date: string | Date | number): Date {
    if (typeof date === 'number') {
        // Handle Unix timestamps (seconds or milliseconds)
        // If timestamp is less than 10 billion, it's in seconds
        return new Date(date < 10000000000 ? date * 1000 : date)
    } else if (typeof date === 'string') {
        return new Date(date)
    } else {
        return date
    }
}

/**
 * Formats a date string, Date object, or Unix timestamp using the provided timezone.
 * Defaults to 'America/Bogota' if no timezone is provided.
 * Handles both seconds and milliseconds Unix timestamps.
 */
export function formatInBusinessTimeZone(
    date: string | Date | number,
    formatStr: string = 'dd MMM yyyy, HH:mm',
    timezone: string = 'America/Bogota'
): string {
    const d = parseDate(date)

    // Check if date is valid
    if (isNaN(d.getTime())) {
        console.warn('Invalid date:', date)
        return '-'
    }

    try {
        // Convert to zoned time
        const zonedDate = toZonedTime(d, timezone)
        // Format using date-fns
        return format(zonedDate, formatStr, { locale: es })
    } catch (error) {
        console.error('Error formatting date:', error)
        return d.toLocaleString()
    }
}

/**
 * Formats a date string, Date object, or Unix timestamp for display in a data table.
 * Uses the format: dd/MM/yyyy HH:mm:ss
 * Defaults to 'America/Bogota' if no timezone is provided.
 * Handles both seconds and milliseconds Unix timestamps.
 */
export function formatDateInTimezone(
    date: string | Date | number | null | undefined,
    timezone: string = 'America/Bogota'
): string {
    if (!date) return '-'

    const d = parseDate(date)

    // Check if date is valid
    if (isNaN(d.getTime())) {
        console.warn('Invalid date:', date)
        return '-'
    }

    try {
        // Convert to zoned time
        const zonedDate = toZonedTime(d, timezone)
        // Format using date-fns
        return format(zonedDate, 'dd/MM/yyyy HH:mm:ss', { locale: es })
    } catch (error) {
        console.error('Error formatting date:', error)
        return d.toLocaleString()
    }
}
