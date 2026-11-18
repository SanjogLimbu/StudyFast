export type LessonSection = {
    title: string
    content: string
    question: LessonQuestion
}

export type LessonQuestion = {
    question: string
    options: string[]
    answer_index: number
    explanation: string
}

export type LessonData = {
    name: string
    lesson: string | null
    lesson_sections: LessonSection[] | null
    sections_completed: number
    read: boolean
}
