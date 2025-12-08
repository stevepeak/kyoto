export function formatStoryCount(count: number): string {
  return `${count} ${count === 1 ? 'story' : 'stories'}`
}
