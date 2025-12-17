declare module 'asciinema-player' {
  type PlayerOptions = {
    /** Color theme */
    theme?: string
    /** Fit mode: 'width', 'height', 'both', or 'none' */
    fit?: 'width' | 'height' | 'both' | 'none'
    /** Limit idle time between frames in seconds */
    idleTimeLimit?: number
    /** Playback speed multiplier */
    speed?: number
    /** Whether to autoplay on mount */
    autoPlay?: boolean
    /** Whether to loop playback */
    loop?: boolean
    /** Starting time in seconds */
    startAt?: number | string
    /** Poster (preview) specification */
    poster?: string
    /** Terminal font family */
    terminalFontFamily?: string
    /** Terminal font size */
    terminalFontSize?: string
    /** Terminal line height */
    terminalLineHeight?: number
    /** Number of columns */
    cols?: number
    /** Number of rows */
    rows?: number
  }

  type Player = {
    /** Start or resume playback */
    play: () => void
    /** Pause playback */
    pause: () => void
    /** Seek to a specific time in seconds */
    seek: (time: number) => void
    /** Get current time in seconds */
    getCurrentTime: () => number
    /** Get total duration in seconds */
    getDuration: () => number
    /** Dispose the player */
    dispose: () => void
  }

  /**
   * Create an asciinema player instance
   * @param src URL to the asciicast file or a Blob URL
   * @param container DOM element to render the player in
   * @param options Player configuration options
   */
  export function create(
    src: string,
    container: HTMLElement | null,
    options?: PlayerOptions,
  ): Player
}
