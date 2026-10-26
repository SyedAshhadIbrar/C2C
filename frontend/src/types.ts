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
}
