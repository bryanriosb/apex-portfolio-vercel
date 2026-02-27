// Utility for date formatting using business timezone
// Since I cannot install new packages easily, I will use Intl.DateTimeFormat

/**
 * Formats a date string or Date object using the provided timezone.
 * Defaults to 'America/Bogota' if no timezone is provided.
 */
export function formatInBusinessTimeZone(
    date: string | Date,
    formatStr: string = 'dd MMM yyyy, HH:mm',
    timezone: string = 'America/Bogota'
): string {
    const d = typeof date === 'string' ? new Date(date) : date

    // Using Intl for basic formatting if date-fns-tz is not available
    // For more complex formatting, we might need a better utility
    try {
        return new Intl.DateTimeFormat('es-CO', {
            timeZone: timezone,
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(d)
    } catch (error) {
        console.error('Error formatting date:', error)
        return d.toLocaleString()
    }
}
