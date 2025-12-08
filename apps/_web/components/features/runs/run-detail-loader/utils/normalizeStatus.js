'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.normalizeStoryResultStatus = normalizeStoryResultStatus
exports.normalizeRunStoryStatus = normalizeRunStoryStatus
exports.normalizeRunStatus = normalizeRunStatus
exports.toIsoString = toIsoString
const STORY_RESULT_STATUS_VALUES = ['pass', 'fail', 'running', 'error']
const RUN_STORY_STATUS_VALUES = ['pass', 'fail', 'running', 'skipped', 'error']
const RUN_STATUS_VALUES = ['pass', 'fail', 'skipped', 'running', 'error']
function normalizeStoryResultStatus(status) {
  return STORY_RESULT_STATUS_VALUES.includes(status) ? status : 'error'
}
function normalizeRunStoryStatus(status) {
  return RUN_STORY_STATUS_VALUES.includes(status) ? status : 'error'
}
function normalizeRunStatus(status) {
  return RUN_STATUS_VALUES.includes(status) ? status : 'error'
}
function toIsoString(value) {
  if (!value) {
    return null
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (typeof value === 'string') {
    return value
  }
  return null
}
