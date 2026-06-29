export function toApiDateTime(value: string): string {
    if (!value) return ''
    return value.length === 16 ? `${value}:00` : value
}

export function toInputDateTime(value?: string): string {
    if (!value) return ''
    return value.replace(' ', 'T').slice(0, 16)
}
