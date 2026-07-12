/**
 * Procesamiento de imágenes en el navegador para logos. Evita depender de
 * Firebase Storage: el archivo se recorta/comprime a un cuadrado chico y se
 * guarda como data URL en Firestore (docs `gyms` y `publicProfiles`).
 */

const LOGO_SIZE = 256
const MAX_INPUT_BYTES = 5 * 1024 * 1024 // 5MB de archivo original
const MAX_OUTPUT_BYTES = 150 * 1024 // tope del data URL guardado en Firestore
const QUALITY_STEPS = [0.85, 0.7, 0.55, 0.4]

export class LogoImageError extends Error {}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // algunos formatos (ej. SVG) no soportan createImageBitmap; cae al <img>
    }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new LogoImageError('No se pudo leer la imagen.'))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Convierte un archivo de imagen en un data URL cuadrado (256×256, recorte
 * `cover`) comprimido en WebP. Rechaza con `LogoImageError` (mensaje apto para
 * mostrar al usuario) si el archivo no es una imagen o queda demasiado pesado.
 */
export async function fileToLogoDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new LogoImageError('El archivo debe ser una imagen (JPG, PNG, WebP...).')
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new LogoImageError('La imagen es muy pesada (máximo 5MB).')
  }

  const source = await loadBitmap(file)
  const width = source.width
  const height = source.height
  if (!width || !height) {
    throw new LogoImageError('No se pudo leer la imagen.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = LOGO_SIZE
  canvas.height = LOGO_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new LogoImageError('No se pudo procesar la imagen en este navegador.')
  }

  // Recorte tipo `cover`: se toma el cuadrado central de la imagen original.
  const side = Math.min(width, height)
  const sx = (width - side) / 2
  const sy = (height - side) / 2
  ctx.drawImage(source, sx, sy, side, side, 0, 0, LOGO_SIZE, LOGO_SIZE)
  if ('close' in source) source.close()

  for (const quality of QUALITY_STEPS) {
    const dataUrl = canvas.toDataURL('image/webp', quality)
    // Si el navegador no soporta WebP devuelve PNG; igual sirve si entra en el tope.
    if (dataUrl.length <= MAX_OUTPUT_BYTES) return dataUrl
  }
  throw new LogoImageError('No se pudo comprimir la imagen; probá con una más simple.')
}
