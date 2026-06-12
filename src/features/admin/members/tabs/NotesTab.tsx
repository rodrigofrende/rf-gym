import { useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { NotebookPen, Plus, Target, Trash2, Weight } from 'lucide-react'
import type { NoteType } from '@/types'
import { useToast } from '@/providers/ToastProvider'
import { useCreateNote, useNotes, useRemoveNote } from '@/hooks/useMemberNotes'
import { Badge, Button, Card, EmptyState, Input, Select, Spinner } from '@/components/ui'
import { formatDate } from '@/utils/format'

const TYPE_META: Record<NoteType, { label: string; tone: 'brand' | 'green' | 'neutral'; icon: typeof Target }> = {
  objective: { label: 'Objetivo', tone: 'brand', icon: Target },
  weight: { label: 'Peso', tone: 'green', icon: Weight },
  observation: { label: 'Observación', tone: 'neutral', icon: NotebookPen },
}

/**
 * Tab de notas privadas del admin. Este componente y sus hooks NUNCA se importan
 * del lado del socio — es la barrera de UI (la otra barrera son las Security Rules).
 */
export function NotesTab({
  gymId,
  memberId,
  adminUid,
}: {
  gymId: string
  memberId: string
  adminUid: string
}) {
  const { notify } = useToast()
  const { data: notes = [], isLoading } = useNotes(gymId, memberId)
  const createNote = useCreateNote(gymId, memberId)
  const removeNote = useRemoveNote(gymId, memberId)
  const [type, setType] = useState<NoteType>('observation')
  const [value, setValue] = useState('')

  const add = async () => {
    if (!value.trim()) return
    try {
      await createNote.mutateAsync({
        type,
        value: value.trim(),
        date: Timestamp.now(),
        createdBy: adminUid,
      })
      setValue('')
      notify('Nota agregada', 'success')
    } catch {
      notify('No se pudo guardar la nota', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="mb-3 text-sm font-medium text-zinc-700">Agregar anotación privada</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="sm:w-44">
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as NoteType)}
              options={[
                { value: 'objective', label: 'Objetivo' },
                { value: 'weight', label: 'Peso' },
                { value: 'observation', label: 'Observación' },
              ]}
            />
          </div>
          <Input
            className="flex-1"
            placeholder="Ej. Objetivo: bajar 4kg en 2 meses / Peso: 82kg"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <Button leftIcon={<Plus className="size-4" />} loading={createNote.isPending} onClick={add}>
            Agregar
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <Spinner />
      ) : notes.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="Sin anotaciones"
          description="Registrá objetivos, seguimiento de peso u observaciones del socio."
        />
      ) : (
        <div className="space-y-2">
          {notes.map((note) => {
            const meta = TYPE_META[note.type]
            const Icon = meta.icon
            return (
              <Card key={note.id} className="flex items-start gap-3 p-4">
                <div className="mt-0.5 text-zinc-400">
                  <Icon className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <span className="text-xs text-zinc-400">{formatDate(note.date)}</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-700">{note.value}</p>
                </div>
                <button
                  onClick={() => removeNote.mutate(note.id)}
                  className="text-zinc-400 hover:text-red-500"
                  aria-label="Eliminar"
                >
                  <Trash2 className="size-4" />
                </button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
