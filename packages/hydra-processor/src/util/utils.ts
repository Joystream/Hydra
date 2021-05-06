import { Range } from '../start/manifest'

export function parseEventId(
  eventId: string
): { blockHeight: number; eventId: number; hash?: string } {
  const parts = eventId.split('-')

  if (parts.length < 2) {
    throw new Error(
      `Event ID ${eventId} does not match the format <blockHeight>-<eventId>-<hash>`
    )
  }

  const hash = parts.length >= 3 ? parts[2] : undefined

  return {
    blockHeight: parseInt(parts[0], 10),
    eventId: parseInt(parts[1], 10),
    hash,
  }
}

/**
 * Takes each string in the array, puts into quotes and joins with a comma
 * [a,b,c] -> "a","b","c"
 *
 */
export function quotedJoin(toQuote: string[]): string {
  return toQuote.map((s) => `"${s}"`).join()
}

/**
 * Remove spaces and carriage returns from a string
 * @param s
 */
export function stripSpaces(s: string): string {
  return s.replace(/\s+/g, ' ').replace('( ', '(').replace(' )', ')').trim()
}

export function format(s: string): string {
  return stripSpaces(s).replace('{ ', '{\n').replace(' }', '\n}\n')
}

export function compact(s: string): string {
  return s.replace(/\s/g, '')
}

/**
 * checks if the given height is within a given range, [from, to] (inclusive)
 * By convention anything is withing the undefined range
 * @param height
 * @param range
 * @returns
 */
export function isInRange(height: number, range: Range | undefined): boolean {
  if (range === undefined) {
    return true
  }
  const { from, to } = range
  return from <= height && height <= to
}

/**
 * parses an interval. Square bracket mean inclusive, curly braces mean exclusive
 * @param range string of the form [<number>, <number>]
 * @throw throws if the range is empty or if theere's a parsing error
 */
export function parseRange(range: string | undefined): Range {
  const defaultEmpty = {
    from: 0,
    to: Number.POSITIVE_INFINITY,
  }
  if (range === undefined) {
    return defaultEmpty
  }

  const trimmed = range.trim().replace(/\s/g, '')
  if (!trimmed.match(/^[[(]-?\d*,-?\d*[)\]]$/)) {
    throw new Error(`Malformed range: ${range}`)
  }

  const split = trimmed.replace(/[[()\]]/g, '').split(',')
  let left = split[0].length === 0 ? 0 : Number.parseInt(split[0])
  let right =
    split[1].length === 0 ? Number.POSITIVE_INFINITY : Number.parseInt(split[1])

  if (split[0].length !== 0 && trimmed.includes('(')) {
    left++
  }

  if (Number.isFinite(right) && trimmed.includes(')')) {
    right--
  }

  if (left > right) {
    throw new Error(`The range ${range} is empty`)
  }

  return { from: left, to: right }
}
