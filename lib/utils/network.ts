
/**
 * Convierte una dirección IP (IPv4) a su representación numérica larga.
 */
function ipToLong(ip: string): number {
    const parts = ip.split('.')
    if (parts.length !== 4) return 0
    return (
        ((parseInt(parts[0], 10) << 24) |
            (parseInt(parts[1], 10) << 16) |
            (parseInt(parts[2], 10) << 8) |
            parseInt(parts[3], 10)) >>>
        0
    )
}

/**
 * Verifica si una dirección IP está dentro de un rango CIDR.
 * Soporta solo IPv4.
 *
 * @param ip Dirección IP a verificar (ej: "192.168.1.5")
 * @param cidr Rango CIDR (ej: "192.168.1.0/24")
 */
export function isIpInCidr(ip: string, cidr: string): boolean {
    try {
        const [range, bitsStr] = cidr.split('/')
        if (!range || !bitsStr) return false

        const mask = ~(2 ** (32 - parseInt(bitsStr, 10)) - 1)
        return (ipToLong(ip) & mask) === (ipToLong(range) & mask)
    } catch (error) {
        console.error(`Error validating CIDR: ${error}`)
        return false
    }
}
