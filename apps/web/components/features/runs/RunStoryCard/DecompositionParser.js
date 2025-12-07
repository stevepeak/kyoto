'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.parseDecomposition = parseDecomposition
const schemas_1 = require('@app/schemas')
/**
 * Parses decomposition data from unknown format (string or object)
 * and validates it against the decomposition schema
 */
function parseDecomposition(decomposition) {
  if (!decomposition) {
    return null
  }
  try {
    const parsed =
      typeof decomposition === 'string'
        ? JSON.parse(decomposition)
        : decomposition
    return schemas_1.decompositionOutputSchema.parse(parsed)
  } catch (_a) {
    return null
  }
}
