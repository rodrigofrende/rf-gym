/**
 * Procesamiento de imágenes en el navegador para logos y patrocinadores. Evita
 * depender de Firebase Storage: el archivo se recorta/comprime a un cuadrado
 * chico y se guarda como data URL en Firestore (docs `gyms` y `publicProfiles`).
 */

const SQUARE_SIZE = 256
const MAX_INPUT_BYTES = 5 * 1024 * 1024 // 5MB de archivo original
const MAX_LOGO_OUTPUT_BYTES = 150 * 1024 // tope del data URL guardado en Firestore
// Las imágenes de sponsors comparten el doc `publicProfiles` (tope 1MiB de
// Firestore): con hasta 6 sponsors + el logo, 100KB c/u deja margen de sobra.
const MAX_SPONSOR_OUTPUT_BYTES = 100 * 1024
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

async function fileToSquareDataUrl(file: File, maxOutputBytes: number): Promise<string> {
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
  canvas.width = SQUARE_SIZE
  canvas.height = SQUARE_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new LogoImageError('No se pudo procesar la imagen en este navegador.')
  }

  // Recorte tipo `cover`: se toma el cuadrado central de la imagen original.
  const side = Math.min(width, height)
  const sx = (width - side) / 2
  const sy = (height - side) / 2
  ctx.drawImage(source, sx, sy, side, side, 0, 0, SQUARE_SIZE, SQUARE_SIZE)
  if ('close' in source) source.close()

  for (const quality of QUALITY_STEPS) {
    const dataUrl = canvas.toDataURL('image/webp', quality)
    // Si el navegador no soporta WebP devuelve PNG; igual sirve si entra en el tope.
    if (dataUrl.length <= maxOutputBytes) return dataUrl
  }
  throw new LogoImageError('No se pudo comprimir la imagen; probá con una más simple.')
}

/**
 * Convierte un archivo de imagen en un data URL cuadrado (256×256, recorte
 * `cover`) comprimido en WebP. Rechaza con `LogoImageError` (mensaje apto para
 * mostrar al usuario) si el archivo no es una imagen o queda demasiado pesado.
 */
export function fileToLogoDataUrl(file: File): Promise<string> {
  return fileToSquareDataUrl(file, MAX_LOGO_OUTPUT_BYTES)
}

/**
 * Ídem `fileToLogoDataUrl` pero para la imagen de un patrocinador: mismas
 * restricciones de entrada, tope de salida más chico (espejado en el tope por
 * sponsor de firestore.rules).
 */
export function fileToSponsorImageDataUrl(file: File): Promise<string> {
  return fileToSquareDataUrl(file, MAX_SPONSOR_OUTPUT_BYTES)
}
