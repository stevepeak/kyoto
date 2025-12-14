/**
 * Returns the singular or plural form of a word based on count.
 *
 * @param count - The number to check
 * @param singular - The singular form of the word
 * @returns The word with appropriate pluralization
 *
 * @example
 * pluralize(1, 'file') // 'file'
 * pluralize(3, 'file') // 'files'
 * pluralize(0, 'test') // 'tests'
 */
export function pluralize(count: number, singular: string): string {
  return `${singular}${count === 1 ? '' : 's'}`
}
