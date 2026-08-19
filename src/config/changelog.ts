/**
 * Historial de novedades ("¿Qué hay de nuevo?") que ven los admins desde el
 * menú de Soporte. Lenguaje de USUARIO FINAL: qué mejora o arregla cada
 * versión, sin jerga técnica.
 *
 * Al sacar una versión: agregar la entrada acá (la más nueva PRIMERO) y
 * mantener `version` en sync con package.json. El punto de "hay novedades"
 * del botón de Soporte se enciende solo comparando contra la primera entrada.
 */
export type ChangeKind = 'new' | 'improved' | 'fixed'

export interface ChangelogItem {
  kind: ChangeKind
  text: string
}

export interface ChangelogRelease {
  version: string
  /** Fecha de la release como YYYY-MM-DD (se formatea al mostrar). */
  date: string
  items: ChangelogItem[]
}

export const CHANGELOG: ChangelogRelease[] = [
  {
    version: '1.2.3',
    date: '2026-08-19',
    items: [
      {
        kind: 'fixed',
        text: 'Si dejás la app abierta muchos días y sacamos una versión nueva, ya no queda cargando para siempre: se actualiza sola.',
      },
      {
        kind: 'improved',
        text: 'Cuando algo falla al cargar, ahora aparece un mensaje claro con un botón para reintentar en vez de una pantalla en blanco.',
      },
      {
        kind: 'improved',
        text: 'La app carga más rápido en visitas repetidas desde el celular.',
      },
    ],
  },
  {
    version: '1.2.2',
    date: '2026-08-19',
    items: [
      {
        kind: 'improved',
        text: 'Si el socio se equivoca en el email al crear su contraseña, la app le sugiere el correcto en vez de dejarlo trabado.',
      },
      {
        kind: 'improved',
        text: 'Cuando el socio intenta entrar con su email personal, ahora se le aclara que su acceso es el usuario que le dio el gimnasio.',
      },
      {
        kind: 'fixed',
        text: 'Sin señal ya no aparece “este email no está dado de alta”: ahora avisa que hubo un problema de conexión y que reintente.',
      },
      {
        kind: 'fixed',
        text: 'Al abrir la lista de socios, un socio con problemas ya no impide que se reparen los accesos de los demás.',
      },
    ],
  },
  {
    version: '1.2.1',
    date: '2026-08-18',
    items: [
      {
        kind: 'fixed',
        text: 'El QR de recepción registra la asistencia aunque el código se haya generado en otra pantalla o dominio.',
      },
      {
        kind: 'fixed',
        text: 'Si el socio ya marcó presente hoy, se lo informa y no puede sumar otro hasta mañana.',
      },
      {
        kind: 'fixed',
        text: 'El primer ingreso con email real ya no falla con “no encontramos un socio” cuando la ficha sí existía.',
      },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-08-17',
    items: [
      {
        kind: 'improved',
        text: 'El menú lateral se reorganizó en secciones para encontrar cada función más rápido.',
      },
      {
        kind: 'new',
        text: 'La lista de socios ahora muestra la fecha de vencimiento de la cuota y señala los pagos atrasados.',
      },
      {
        kind: 'fixed',
        text: 'Se corrigió un error que impedía subir fotos de productos desde iPhone.',
      },
      {
        kind: 'improved',
        text: 'Mejoras visuales en la página pública del gimnasio: logo más grande y datos de contacto en Info rápida.',
      },
      {
        kind: 'improved',
        text: 'La ficha del socio muestra información más útil, sin datos repetidos.',
      },
    ],
  },
  {
    version: '1.1.6',
    date: '2026-08-15',
    items: [
      {
        kind: 'new',
        text: 'Nueva página para restablecer la contraseña.',
      },
      {
        kind: 'new',
        text: 'Nuevo botón para compartir el enlace público del gimnasio.',
      },
      {
        kind: 'improved',
        text: 'Mejoras de visibilidad en buscadores y en la vista previa al compartir el sitio.',
      },
    ],
  },
]

export const LATEST_VERSION = CHANGELOG[0]?.version ?? ''
