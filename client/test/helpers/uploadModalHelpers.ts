/**
 * Shared helpers for UploadModal unit and integration tests.
 */

/**
 * Returns a mock implementation of `onPreviewFiles` that resolves every
 * requested file with the given preview object and no error.
 */
export function previewsFor(preview: Record<string, unknown>) {
  return (files: Array<{ fileName: string; fileContent: string }>) =>
    Promise.resolve(
      files.map((f) => ({ fileName: f.fileName, preview, error: null })),
    );
}
