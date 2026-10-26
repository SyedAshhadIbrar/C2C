export type Origin = 'ai' | 'user'

export interface Task {
  id: string
  title: string
  titleOrigin: Origin // "user" = title changed by the user (User-edited)
  owner: string | null
  ownerOrigin: Origin
  deadline: string | null // exact wording from the notes, never converted
  deadlineOrigin: Origin
  deadlineAmbiguous: boolean
  sourcePhrase: string | null // null only for user-added tasks
  blockedBy: string[]
  blockerNote: string | null
  origin: Origin // "user" = User-added
  warnings: string[]
  // Slice 7 (optional, not populated yet): evidence-backed, flagged inferences.
  inferences?: Inference[]
  deadlineType?: DeadlineType | null
}

export type DeadlineType = 'explicit_date' | 'relative' | 'conditional' | 'vague'

export interface Inference {
  field: 'task' | 'owner' | 'deadline' | 'dependency'
  evidence: string | null // verbatim quote from the notes; null = missing, which must stay visible
  note?: string | null
}

/** Slice 7 (optional, not populated yet): a decision or problem with its source quote. */
export interface NoteItem {
  text: string
  sourcePhrase: string | null
  warnings?: string[]
}

export interface Question {
  id: string
  text: string
  resolved: boolean
}

export type Mode = 'live' | 'sample'

export interface Plan {
  tasks: Task[]
  questions: Question[]
  mode: Mode
  decisions?: NoteItem[] // Slice 7, optional
  problems?: NoteItem[] // Slice 7, optional
}
