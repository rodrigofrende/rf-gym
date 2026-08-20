/**
 * Historial de novedades que ve CUALQUIER usuario (socios incluidos) desde el
 * botón de Novedades. Lenguaje de USUARIO FINAL: qué mejora o arregla cada
 * versión, sin jerga técnica.
 *
 * QUÉ VA: features que el usuario puede usar, y arreglos de cosas que el usuario
 * vivió como un problema ("no podía entrar", "quedaba cargando").
 *
 * QUÉ NO VA:
 *  - Detalles internos: nombres de colecciones, índices, caché, chunks, reglas.
 *  - La FORMA del bug si le sirve a alguien para abusarlo, o si expone que hubo
 *    datos en un estado inconsistente.
 *  - Cambios que el usuario no puede ver (refactors, tests, observabilidad).
 *  - Nada de lo que se pueda deducir la arquitectura o el stack.
 * Ante la duda, describí el SÍNTOMA que dejó de pasar, no la causa.
 *
 * Al sacar una versión: agregar la entrada acá (la más nueva PRIMERO) y
 * mantener `version` en sync con package.json. El punto de "hay novedades"
 * del botón de Novedades se enciende solo comparando contra la primera entrada.
 */
export type ChangeKind = 'new' | 'improved' | 'fixed'

export interface ChangelogItem {
  kind: ChangeKind
  text: string
  /**
   * 'admin' → solo lo ven los admins del gym. Omitido = lo ve TODO el mundo,
   * socios incluidos (Novedades es accesible para todos los roles).
   *
   * Usalo para lo que pasa en pantallas de gestión: a un socio, "la lista de
   * socios ahora muestra el vencimiento" no le dice nada.
   */
  audience?: 'admin'
}

export interface ChangelogRelease {
  version: string
  /** Fecha de la release como YYYY-MM-DD (se formatea al mostrar). */
  date: string
  items: ChangelogItem[]
}

export const CHANGELOG: ChangelogRelease[] = [
  {
    version: '1.3.0',
    date: '2026-08-20',
    items: [
      {
        kind: 'new',
        text: 'Ahora podés ver las novedades de la app desde cualquier pantalla, con el botón de Novedades.',
      },
      {
        kind: 'new',
        text: 'Si escaneás el QR del gimnasio y tu email no está dado de alta, ahora podés escribirle al gimnasio directo desde ahí.',
      },
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
      {
        kind: 'improved',
        text: 'Al cargar el email de un socio, si el dominio parece tener un error de tipeo se te sugiere el correcto.',
        audience: 'admin',
      },
      {
        kind: 'fixed',
        text: 'El alta y la edición de socios quedan guardadas de forma más confiable.',
        audience: 'admin',
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
        text: 'Si el email no está dado de alta, el mensaje ahora explica mejor qué hacer.',
      },
      {
        kind: 'fixed',
        text: 'Sin señal ya no aparece “este email no está dado de alta”: ahora avisa que hubo un problema de conexión y que reintente.',
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
        audience: 'admin',
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
        audience: 'admin',
      },
      {
        kind: 'fixed',
        text: 'Se corrigió un error que impedía subir fotos de productos desde iPhone.',
        audience: 'admin',
      },
      {
        kind: 'improved',
        text: 'Mejoras visuales en la página pública del gimnasio: logo más grande y datos de contacto en Info rápida.',
        audience: 'admin',
      },
      {
        kind: 'improved',
        text: 'La ficha del socio muestra información más útil, sin datos repetidos.',
        audience: 'admin',
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
        audience: 'admin',
      },
      {
        kind: 'improved',
        text: 'Mejoras de visibilidad en buscadores y en la vista previa al compartir el sitio.',
        audience: 'admin',
      },
    ],
  },
]

export const LATEST_VERSION = CHANGELOG[0]?.version ?? ''
