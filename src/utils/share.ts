export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled'

/**
 * Comparte un PNG con el share sheet nativo (Web Share API con archivos —
 * mobile) o cae a descarga con `<a download>` (desktop). Sin links a la app.
 */
export async function shareOrDownloadPng(
  blob: Blob,
  filename: string,
  meta: { title: string; text: string },
): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: 'image/png' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: meta.title, text: meta.text })
      return 'shared'
    } catch (err) {
      // Cancelado por el usuario → silencio; otros errores caen a descarga.
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
  return 'downloaded'
}
