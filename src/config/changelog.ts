/**
 * Historial de novedades que ve CUALQUIER usuario (socios incluidos) desde el
 * botón de Novedades.
 *
 * CÓMO SE ESCRIBE. Es lo primero que un socio lee de nosotros, así que se escribe
 * como se le habla a una persona, no como se documenta un commit:
 *  - **El beneficio primero.** Qué puede hacer ahora, o qué dejó de sufrir. No
 *    qué tocamos nosotros. "Ya no te dice que tu email no existe" y no "se
 *    corrigió la validación del índice".
 *  - **Voseo, frases cortas, cero jerga.** Si aparece la palabra caché, índice,
 *    chunk, batch o validación, está mal escrito.
 *  - **Pocas líneas y contundentes.** Mejor 3 que se entienden que 8 que se
 *    hojean. Si dos arreglos se viven como una sola mejora, van juntos.
 *  - **Nada invisible.** Si el usuario no lo puede ver ni sentir, no va: los
 *    refactors, los tests y la observabilidad no son novedades.
 *
 * QUÉ NO VA, además: detalles internos, la forma de un bug que alguien pueda
 * aprovechar, y nada que sugiera que hubo datos en un estado inconsistente. Ante
 * la duda, contá el síntoma que dejó de pasar, no la causa.
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
    version: '1.3.1',
    date: '2026-08-21',
    items: [
      {
        kind: 'new',
        text: 'Después de marcar presente, podés decir qué vas a entrenar hoy. Es opcional: si no elegís, todo sigue igual.',
      },
      {
        kind: 'improved',
        text: 'Si elegiste músculos, en Mis rutinas ves primero los ejercicios de esos grupos.',
      },
      {
        kind: 'new',
        text: 'En el ranking ves qué se entrenó más en el gym este mes y el músculo más frecuente de cada socio.',
      },
      {
        kind: 'improved',
        text: 'El ranking se lee mejor cuando hay empates: ves a todos los que comparten el puesto, sin podios raros.',
      },
      {
        kind: 'improved',
        text: 'En Asistencias de hoy ves los músculos que eligió cada socio.',
        audience: 'admin',
      },
      {
        kind: 'improved',
        text: 'Las tarifas quedan agrupadas por servicio, con el precio a la vista.',
        audience: 'admin',
      },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-08-20',
    items: [
      {
        kind: 'new',
        text: '¿Escaneaste el QR del gimnasio y no te reconoció? Ahora le escribís al gimnasio en el momento, desde la misma pantalla.',
      },
      {
        kind: 'improved',
        text: 'La app abre más rápido. Y si sacamos una versión nueva mientras la tenías abierta, se actualiza sola en vez de quedarse cargando.',
      },
      {
        kind: 'new',
        text: 'Novedades: entrá cuando quieras a ver qué cambió, desde cualquier pantalla.',
      },
      {
        kind: 'improved',
        text: '¿Necesitás una mano o se te ocurre una mejora? Escribinos desde cualquier pantalla, estamos para ayudarte.',
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
        text: 'Crear tu contraseña por primera vez es más fácil: si te equivocás al escribir tu email, te sugerimos el correcto en vez de dejarte trabado.',
      },
      {
        kind: 'fixed',
        text: 'Si se te corta la señal, te decimos que es la conexión. Antes parecía que tu email no estaba dado de alta.',
      },
    ],
  },
  {
    version: '1.2.1',
    date: '2026-08-18',
    items: [
      {
        kind: 'fixed',
        text: 'Si ya marcaste presente hoy, te lo avisamos y no te suma otro.',
      },
      {
        kind: 'fixed',
        text: 'El QR de recepción registra la asistencia siempre, sin importar desde qué pantalla se generó.',
        audience: 'admin',
      },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-08-17',
    items: [
      {
        kind: 'improved',
        text: 'El menú está ordenado por secciones: llegás a cada cosa en menos toques.',
      },
      {
        kind: 'new',
        text: 'En la lista de socios ves de una quién está al día.',
        audience: 'admin',
      },
      {
        kind: 'improved',
        text: 'Tu página pública quedó mejor: logo más grande y los datos de contacto a la vista.',
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
        text: 'Si te olvidás la contraseña, la recuperás solo, sin depender de nadie.',
      },
      {
        kind: 'new',
        text: 'Compartí el link de tu gimnasio con un botón, listo para mandar por WhatsApp.',
        audience: 'admin',
      },
    ],
  },
]

export const LATEST_VERSION = CHANGELOG[0]?.version ?? ''
