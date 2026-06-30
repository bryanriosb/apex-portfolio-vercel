// Utility for date formatting using business timezone with date-fns
import { format } from 'date-fns'
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'
import { es } from 'date-fns/locale'

/**
 * Parses a date input (string, Date, or number) into a Date object.
 * Handles both seconds and milliseconds Unix timestamps.
 * For ISO strings from Supabase (which are UTC), ensures proper UTC interpretation.
 */
function parseDate(date: string | Date | number): Date {
    if (typeof date === 'number') {
        // Handle Unix timestamps (seconds or milliseconds)
        // If timestamp is less than 10 billion, it's in seconds
        return new Date(date < 10000000000 ? date * 1000 : date)
    } else if (typeof date === 'string') {
        let cleanDate = date.trim()
        
        // Match ClickHouse/Rust date format: "YYYY-MM-DD HH:MM:SS.S +HH:MM:SS" or "YYYY-MM-DD HH:MM:SS"
        const clickHouseMatch = cleanDate.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})(?:\.\d+)?\s+([+-]\d{2}:\d{2})(?::\d{2})?$/)
        if (clickHouseMatch) {
            cleanDate = `${clickHouseMatch[1]}T${clickHouseMatch[2]}${clickHouseMatch[3]}`
        } else {
            const simpleMatch = cleanDate.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})(?:\.\d+)?$/)
            if (simpleMatch) {
                cleanDate = `${simpleMatch[1]}T${simpleMatch[2]}Z`
            }
        }

        // Supabase returns dates in ISO format without timezone (e.g., "2024-03-03T15:00:00")
        // These should be interpreted as UTC. Append 'Z' to force UTC interpretation.
        const isoString = cleanDate.includes('T') && !cleanDate.endsWith('Z') && !cleanDate.match(/[+-]\d{2}:?\d{2}$/)
            ? cleanDate + 'Z'
            : cleanDate
        return new Date(isoString)
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

export function formatSQLDate(dateInput?: any, timezone?: string) {
  if (!dateInput) return '';
  
  let d: Date;
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}:\d{2}:\d{2})/);
    if (match) {
      const timeParts = match[2].split(':');
      const paddedTime = timeParts[0].padStart(2, '0') + ':' + timeParts[1] + ':' + timeParts[2];
      d = new Date(`${match[1]}T${paddedTime}Z`);
    } else {
      const num = Number(dateInput);
      if (!isNaN(num) && num > 0) {
        d = new Date(num < 10000000000 ? num * 1000 : num);
      } else {
        d = new Date(dateInput);
      }
    }
  } else if (typeof dateInput === 'number') {
    d = new Date(dateInput < 10000000000 ? dateInput * 1000 : dateInput);
  } else {
    d = new Date(dateInput);
  }

  if (isNaN(d.getTime())) return String(dateInput);

  if (timezone) {
    try {
      return formatInTimeZone(d, timezone, "d 'de' MMM, HH:mm:ss", { locale: es });
    } catch {
      // fallback if timezone is invalid
    }
  }

  return format(d, "d 'de' MMM, HH:mm:ss", { locale: es });
}
