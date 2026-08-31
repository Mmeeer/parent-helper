/**
 * Extract the YouTube video id from the common URL forms.
 *
 * Tests by inspection:
 *   https://www.youtube.com/watch?v=dQw4w9WgXcQ            → dQw4w9WgXcQ
 *   https://www.youtube.com/watch?feature=x&v=dQw4w9WgXcQ  → dQw4w9WgXcQ
 *   https://youtu.be/dQw4w9WgXcQ?t=10                      → dQw4w9WgXcQ
 *   https://www.youtube.com/shorts/dQw4w9WgXcQ             → dQw4w9WgXcQ
 *   https://www.youtube.com/embed/dQw4w9WgXcQ              → dQw4w9WgXcQ
 *   https://www.youtube.com/live/dQw4w9WgXcQ               → dQw4w9WgXcQ
 *   https://example.com/video                              → null
 */
export function extractYouTubeVideoId(url: string): string | null {
  const match =
    /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/.exec(url);
  return match ? match[1] : null;
}

/** Thumbnail URL for a YouTube video id. */
export function youTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
