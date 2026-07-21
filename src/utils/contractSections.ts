/**
 * TypeScript mirror of ContractContentSectionParser.java — splits/joins the
 * [[SECTION]] plain-text format used by contract/handover/offer templates so
 * the editor can present each section separately.
 */

export function parseSections(content: string): Map<string, string> {
    const sections = new Map<string, string>()
    if (!content || !content.trim()) {
        return sections
    }

    const prefix = '[['
    let index = 0
    while (index < content.length) {
        const start = content.indexOf(prefix, index)
        if (start < 0) break

        const nameStart = start + prefix.length
        const nameEnd = content.indexOf(']]', nameStart)
        if (nameEnd < 0) break

        const sectionName = content.slice(nameStart, nameEnd).trim()
        const bodyStart = nameEnd + 2
        const nextSection = content.indexOf(prefix, bodyStart)
        const body = nextSection < 0 ? content.slice(bodyStart) : content.slice(bodyStart, nextSection)
        sections.set(sectionName, body.trim())
        index = nextSection < 0 ? content.length : nextSection
    }

    if (sections.size === 0) {
        sections.set('BODY', content.trim())
    }
    return sections
}

export function serializeSections(sections: Map<string, string>): string {
    return Array.from(sections.entries())
        .map(([name, body]) => `[[${name}]]\n${body}`)
        .join('\n')
}
