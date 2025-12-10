export type VibeCheckScope =
  | { type: 'commits'; commits: string[] }
  | { type: 'commit'; commit: string }
  | { type: 'staged' }
  | { type: 'unstaged' }
  | { type: 'paths'; paths: string[] }
