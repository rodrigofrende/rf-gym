import type { GymTheme } from '@/types'
import { APP_NAME } from '@/config/app'
import { buildBrandScale, PLATFORM_DEFAULT_THEME } from '@/utils/theme'
import { initials } from '@/utils/format'

/**
 * Genera la imagen compartible del ranking (story 9:16, 1080×1920) dibujada a
 * mano en canvas 2D — sin dependencias nuevas (precedente utils/image.ts).
 * El logo del gym es data URL (forzado por firestore.rules) y las fuentes de
 * Google Fonts sirven con CORS abierto, así que el canvas nunca queda tainted.
 */

export interface RankingImageRow {
  rank: number
  displayName: string
  days: number
  memberId: string
}

export interface RankingImageOpts {
  gymName: string
  logoURL?: string
  theme?: GymTheme | null
  monthLabel: string // "Agosto 2026"
  rows: RankingImageRow[] // top del ranking (se dibujan podio + 4 filas)
  mine?: RankingImageRow | null // null/undefined para admin (sin fila propia)
}

const W = 1080
const H = 1920
// Metales del podio (relleno + tono oscuro para cinta/borde/número).
const METALS: Record<1 | 2 | 3, { fill: string; dark: string }> = {
  1: { fill: '#f5c542', dark: '#8a6414' },
  2: { fill: '#c8ccd4', dark: '#6f7680' },
  3: { fill: '#cd8a4f', dark: '#7d4f26' },
}

export async function drawRankingStoryImage(opts: RankingImageOpts): Promise<Blob> {
  // Fuentes ANTES de dibujar: index.html las difiere (media="print"), y un peso
  // nunca renderizado puede no estar pedido todavía.
  await Promise.all([
    document.fonts.load('150px Anton'),
    document.fonts.load('60px Anton'),
    document.fonts.load('800 42px Montserrat'),
    document.fonts.load('700 46px Montserrat'),
    document.fonts.load('600 40px Montserrat'),
    document.fonts.load('500 34px Montserrat'),
  ]).catch(() => undefined)
  await document.fonts.ready

  const theme = opts.theme ?? PLATFORM_DEFAULT_THEME
  const scale = buildBrandScale(theme.accent)
  const logo = await loadDataUrlImage(opts.logoURL)

  // Supersampling 2×: se dibuja en coordenadas lógicas 1080×1920 sobre un
  // canvas físico del doble → texto y formas mucho más nítidos al compartir.
  const SS = 2
  const canvas = document.createElement('canvas')
  canvas.width = W * SS
  canvas.height = H * SS
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas-context-unavailable')
  ctx.scale(SS, SS)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Fondo: degradé vertical de marca + círculos decorativos sutiles.
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, scale[900])
  bg.addColorStop(1, scale[600])
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  circle(ctx, -80, 260, 300)
  circle(ctx, W + 60, 1500, 340)

  // Logo grande (240px ≈ nativo del data URL de 256 → nítido) o tile de iniciales.
  const logoSize = 240
  const logoX = (W - logoSize) / 2
  const logoY = 80
  if (logo) {
    ctx.save()
    roundRectPath(ctx, logoX, logoY, logoSize, logoSize, 48)
    ctx.clip()
    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize)
    ctx.restore()
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    roundRectPath(ctx, logoX, logoY, logoSize, logoSize, 48)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = '110px Anton, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(initials(opts.gymName) || 'G', W / 2, logoY + logoSize / 2 + 8)
  }

  // Nombre del gym + branding de la plataforma (como en el sidebar de la app).
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 46px Montserrat, sans-serif'
  ctx.fillText(fitText(ctx, opts.gymName, W - 160), W / 2, 396)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = '600 28px Montserrat, sans-serif'
  ctx.fillText(`by ${APP_NAME}`, W / 2, 438)

  // Título + mes + métrica explícita.
  ctx.fillStyle = '#ffffff'
  ctx.font = '150px Anton, sans-serif'
  ctx.fillText('RANKING', W / 2, 590)
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = '700 46px Montserrat, sans-serif'
  ctx.fillText(opts.monthLabel.toUpperCase(), W / 2, 652)
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = '500 34px Montserrat, sans-serif'
  ctx.fillText('Días entrenados en el mes', W / 2, 700)

  // Podio por PUESTO (2°-1°-3°): empatados comparten pedestal (hasta 2 visibles
  // + "+N"); un empate puede dejar vacante el puesto siguiente (1, 1, 3).
  const PODIUM_CAP = 2
  const groupOf = (place: number) => opts.rows.filter((r) => r.rank === place)
  const groups: Record<1 | 2 | 3, RankingImageRow[]> = { 1: groupOf(1), 2: groupOf(2), 3: groupOf(3) }
  const baseY = 1200
  drawPodiumColumn(ctx, groups[2], { x: 230, baseY, pedestal: 165, place: 2, scaleDark: scale[900] })
  drawPodiumColumn(ctx, groups[1], { x: 540, baseY, pedestal: 230, place: 1, scaleDark: scale[900] })
  drawPodiumColumn(ctx, groups[3], { x: 850, baseY, pedestal: 125, place: 3, scaleDark: scale[900] })

  // Filas: lo del top que no entró en el podio.
  const drawnOnPodium = new Set(
    ([1, 2, 3] as const).flatMap((p) => groups[p].slice(0, PODIUM_CAP)).map((r) => r.memberId),
  )
  const listRows = opts.rows.filter((r) => !drawnOnPodium.has(r.memberId)).slice(0, 4)
  const rowH = 94
  const rowGap = 12
  let y = 1248
  for (const row of listRows) {
    const isMine = !!opts.mine && row.memberId === opts.mine.memberId
    drawListRow(ctx, row, y, rowH, isMine, scale[800])
    y += rowH + rowGap
  }

  // Card "Tu puesto" si el usuario quedó fuera de lo dibujado (solo socios).
  const mineDrawn =
    !!opts.mine &&
    (drawnOnPodium.has(opts.mine.memberId) ||
      listRows.some((r) => r.memberId === opts.mine?.memberId))
  if (opts.mine && !mineDrawn) {
    const cardY = 1680
    ctx.fillStyle = '#ffffff'
    roundRectPath(ctx, 90, cardY, W - 180, 130, 28)
    ctx.fill()
    ctx.fillStyle = scale[600]
    ctx.font = '700 30px Montserrat, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('TU PUESTO', W / 2, cardY + 46)
    ctx.fillStyle = scale[900]
    const mineLabel = `#${opts.mine.rank} · ${opts.mine.displayName} · ${daysLabel(opts.mine.days)}`
    ctx.font = fitFont(ctx, mineLabel, W - 260, 60, 'Anton, sans-serif')
    ctx.fillText(mineLabel, W / 2, cardY + 106)
  }

  // Footer.
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = '500 30px Montserrat, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(fitText(ctx, `${opts.gymName} · Ranking mensual · by ${APP_NAME}`, W - 140), W / 2, 1856)

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas-toblob-failed'))), 'image/png')
  })
}

function drawPodiumColumn(
  ctx: CanvasRenderingContext2D,
  rows: RankingImageRow[],
  cfg: { x: number; baseY: number; pedestal: number; place: 1 | 2 | 3; scaleDark: string },
) {
  const { x, baseY, pedestal, place } = cfg
  const metal = METALS[place]
  const pedestalW = 260
  const vacant = rows.length === 0

  // Pedestal + medalla (atenuados si el puesto quedó vacante por un empate).
  ctx.globalAlpha = vacant ? 0.45 : 1
  ctx.fillStyle = metal.fill
  roundRectPath(ctx, x - pedestalW / 2, baseY - pedestal, pedestalW, pedestal, 22)
  ctx.fill()
  drawMedal(ctx, x, baseY - pedestal, metal.fill, metal.dark, String(place))
  ctx.globalAlpha = 1
  if (vacant) return

  const shown = rows.slice(0, 2)
  const extra = rows.length - shown.length

  const drawAvatar = (cx: number, cy: number, r: number, name: string) => {
    ctx.fillStyle = '#ffffff'
    circle(ctx, cx, cy, r + 6)
    ctx.fillStyle = metal.fill
    circle(ctx, cx, cy, r)
    ctx.fillStyle = cfg.scaleDark
    ctx.font = `700 ${Math.round(r * 0.75)}px Montserrat, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(initials(name), cx, cy + 2)
    ctx.textBaseline = 'alphabetic'
  }

  ctx.textAlign = 'center'
  if (shown.length === 1) {
    // Un solo dueño del puesto: avatar grande + nombre + días.
    const row = shown[0]
    drawAvatar(x, baseY - pedestal - 170, 68, row.displayName)
    ctx.fillStyle = '#ffffff'
    ctx.font = '600 38px Montserrat, sans-serif'
    ctx.fillText(fitText(ctx, row.displayName, 280), x, baseY - pedestal - 64)
    ctx.font = '800 40px Montserrat, sans-serif'
    ctx.fillText(daysLabel(row.days), x, baseY - pedestal - 18)
  } else {
    // Puesto compartido: dos avatares lado a lado + dos líneas de nombre.
    drawAvatar(x - 54, baseY - pedestal - 185, 50, shown[0].displayName)
    drawAvatar(x + 54, baseY - pedestal - 185, 50, shown[1].displayName)
    ctx.fillStyle = '#ffffff'
    ctx.font = '600 32px Montserrat, sans-serif'
    ctx.fillText(fitText(ctx, shown[0].displayName, 280), x, baseY - pedestal - 100)
    const secondLine = extra > 0 ? `${shown[1].displayName} +${extra}` : shown[1].displayName
    ctx.fillText(fitText(ctx, secondLine, 280), x, baseY - pedestal - 62)
    ctx.font = '800 38px Montserrat, sans-serif'
    ctx.fillText(daysLabel(shown[0].days), x, baseY - pedestal - 16)
  }
}

/**
 * Medalla colgando del borde superior del pedestal: cinta en V simétrica desde
 * el borde + círculo metálico con doble borde y el número del puesto.
 * `edgeY` = y del borde superior del pedestal (ancla común a las 3 columnas).
 */
function drawMedal(
  ctx: CanvasRenderingContext2D,
  x: number,
  edgeY: number,
  fill: string,
  dark: string,
  label: string,
) {
  const r = 40
  const cy = edgeY + 30 + r // 30px de cinta visible + el radio

  // Cinta en V simétrica (triángulo del borde del pedestal al centro del círculo).
  ctx.fillStyle = dark
  ctx.beginPath()
  ctx.moveTo(x - 30, edgeY)
  ctx.lineTo(x + 30, edgeY)
  ctx.lineTo(x, cy)
  ctx.closePath()
  ctx.fill()

  // Círculo con doble borde (aro exterior oscuro + aro interior claro).
  ctx.fillStyle = fill
  circle(ctx, x, cy, r)
  ctx.strokeStyle = dark
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.arc(x, cy, r - 3, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(x, cy, r - 10, 0, Math.PI * 2)
  ctx.stroke()

  // Número del puesto.
  ctx.fillStyle = dark
  ctx.font = `${Math.round(r * 1.1)}px Anton, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x, cy + 2)
  ctx.textBaseline = 'alphabetic'
}

function drawListRow(
  ctx: CanvasRenderingContext2D,
  row: RankingImageRow,
  y: number,
  h: number,
  isMine: boolean,
  darkText: string,
) {
  ctx.fillStyle = isMine ? '#ffffff' : 'rgba(255,255,255,0.14)'
  roundRectPath(ctx, 90, y, W - 180, h, 24)
  ctx.fill()
  const textColor = isMine ? darkText : '#ffffff'
  ctx.fillStyle = textColor
  ctx.font = '800 42px Montserrat, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(`#${row.rank}`, 130, y + h / 2 + 2)
  ctx.font = '600 40px Montserrat, sans-serif'
  ctx.fillText(fitText(ctx, row.displayName, 480), 250, y + h / 2 + 2)
  ctx.textAlign = 'right'
  ctx.font = '800 40px Montserrat, sans-serif'
  ctx.fillText(daysLabel(row.days), W - 130, y + h / 2 + 2)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
}

function daysLabel(days: number): string {
  return `${days} ${days === 1 ? 'día' : 'días'}`
}

/** Solo data URLs (sin taint del canvas); http(s) legacy → null (tile de iniciales). */
function loadDataUrlImage(url?: string): Promise<HTMLImageElement | null> {
  if (!url || !/^data:image\//i.test(url)) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Trunca con '…' si el texto supera maxWidth con la font actual del ctx. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1)
  return `${t}…`
}

/** Reduce el tamaño de fuente hasta que el texto entre en maxWidth. */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startPx: number,
  family: string,
): string {
  let px = startPx
  ctx.font = `${px}px ${family}`
  while (px > 28 && ctx.measureText(text).width > maxWidth) {
    px -= 4
    ctx.font = `${px}px ${family}`
  }
  return ctx.font
}
