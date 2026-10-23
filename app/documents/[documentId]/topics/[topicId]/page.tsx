"use client"

import { useParams, useRouter } from "next/navigation"
import React, { useEffect, useState } from "react"

import Link from "next/link"
import NoticePrompt from "@/components/noticePrompt"
import HelpResponse from "@/components/helpResponse"
import ConfirmationPrompt from "@/components/confirmationPrompt"
import Lesson from "@/components/lesson"
import FlashcardTask, { type Flashcard } from "@/components/flashcardTask"
import QuestionTask, { type QuestionData, type QuestionResponse } from "@/components/questionTask"

//

type Data = {
    completion: number, 
    seconds_left: number
}


type LessonData = {
    name: string,
    lesson: string | null,
    read: boolean
}


// A card also says how much of the topic's flashcards are done.
type CardData = Flashcard & {
    completion: number
}

//

const STEPS = ["Lesson", "Flashcards", "Quiz"]

//

// The topic's steps, with the current one highlighted and its line filled as far as the user has got.
function StepBar({
    step,
    progress,
    documentId,
    onOpenLesson,
    onNext
}: {
    step: number
    progress: number
    documentId: string
    onOpenLesson?: () => void
    onNext?: () => void
}) {
    return (
        <header className="shrink-0">
            <div className="max-w-2xl mx-auto px-6 h-16 flex items-center gap-4 sm:gap-5">
                <Link
                    href={`/documents/${documentId}/topics`}
                    aria-label="Back to topics"
                    className="btn btn-ghost h-9 w-9 px-0 shrink-0"
                >
                    ✕
                </Link>

                <ol className="flex-1 grid grid-cols-3 gap-2">
                    {STEPS.map((name, i) => (
                        <li key={name} aria-current={i == step ? "step" : undefined} className="flex flex-col gap-1.5 min-w-0">
                            <span className={`text-xs font-semibold truncate ${i == step ? "text-foreground" : "text-accent"}`}>
                                {name}
                            </span>

                            <span className="h-1 rounded-full bg-border overflow-hidden">
                                <span
                                    className="block h-full bg-primary transition-all duration-500"
                                    style={{
                                        width: `${i < step ? 100 : i == step ? progress : 0}%`
                                    }}
                                />
                            </span>
                        </li>
                    ))}
                </ol>

                {onOpenLesson && (
                    <button className="btn btn-ghost h-9 px-3 text-sm shrink-0" onClick={onOpenLesson}>
                        Lesson
                    </button>
                )}

                {onNext && (
                    <button className="btn btn-primary h-9 px-4 text-sm shrink-0" onClick={onNext}>
                        Next
                    </button>
                )}
            </div>
        </header>
    )
}


// Opens over the task, so the user can look something up without losing their place.
function LessonPanel({
    lesson,
    onClose
}: {
    lesson: string
    onClose: () => void
}) {
    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

            <aside className="fixed inset-y-0 right-0 z-40 w-full sm:max-w-lg bg-surface border-l border-border shadow-xl flex flex-col">
                <div className="shrink-0 h-16 px-6 flex items-center justify-between border-b border-border">
                    <span className="font-bold">
                        Lesson
                    </span>

                    <button aria-label="Close lesson" className="btn btn-ghost h-9 w-9 px-0" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <Lesson lesson={lesson} />
                </div>
            </aside>
        </>
    )
}


function RestingPeriod({
    timeLeft,
    documentId
}: {
    timeLeft: string
    documentId: string
}) {
    return (
        <div className="w-full flex flex-col gap-2 items-center text-center">
            <span className="text-2xl font-bold">
                Break Time
            </span>

            <span className="text-accent">
                Your next cards will be ready in
            </span>

            <span className="text-5xl font-semibold tabular-nums my-4">
                {timeLeft}
            </span>

            <Link href={`/documents/${documentId}/topics`} className="btn btn-ghost mt-3">
                Back to topics
            </Link>
        </div>
    )
}


function TopicComplete({ documentId }: { documentId: string }) {
    return (
        <div className="w-full flex flex-col gap-3 items-center text-center">
            <span className="w-14 h-14 rounded-full bg-success/15 text-success text-2xl font-bold flex items-center justify-center">
                ✓
            </span>

            <span className="text-2xl font-bold">
                Topic Complete
            </span>

            <span className="text-accent">
                Nice work! Head back to continue with the next topic.
            </span>

            <Link href={`/documents/${documentId}/topics`} className="btn btn-primary mt-3">
                Back to topics
            </Link>
        </div>
    )
}


function PromptBar({ onAsk }: { onAsk: (prompt: string) => Promise<boolean> }) {
    const [prompt, setPrompt] = useState("")
    const [sending, setSending] = useState(false)

    async function submit() {
        setSending(true)
        const sent = await onAsk(prompt)
        setSending(false)

        if (sent) {
            setPrompt("")
        }
    }


    return (
        <div className="w-full h-15 bg-black/30 flex items-center justify-center border-t border-border">
            <form 
                className="flex gap-2"
                onSubmit={(event) => {
                    event.preventDefault()
                    submit()
                }}
            >
                <input
                    id="prompt"
                    required
                    autoFocus
                    placeholder="Can you explain this more?"
                    className="input w-70 text-sm" 
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                />

                <button 
                    className="btn btn-primary w-6 disabled:cursor-wait"
                    type="submit"
                    disabled={sending}
                >
                    {sending ? (
                        <span className="w-4 h-4 shrink-0 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        "→"
                    )}
                </button>
            </form>
        </div>
    )
}

//

export default function Topic() {
    const router = useRouter()
    const params = useParams()
    const documentId = params.documentId as string 
    const topicId = params.topicId as string 


    // States - flashcards, questions, complete
    const [state, setState] = useState("flashcards")

    // Card states - hidden, shown
    const [cardState, setCardState] = useState("hidden")

    // Request states - ready, waiting
    const [requestState, setRequestState] = useState("ready")

    const [error, setError] = useState("")
    const [promptResponse, setPromptResponse] = useState<{ question: string, answer: string }>()

    const [currentCard, setCurrentCard] = useState<CardData>()
    const [breakData, setBreakData] = useState<Data>()
    const [breakTimeLeft, setBreakTimeLeft] = useState<string>("")

    const [questions, setQuestions] = useState<QuestionData[]>()
    const [currentQuestion, setCurrentQuestion] = useState<number>(0)
    const [questionResponse, setQuestionResponse] = useState<QuestionResponse>()
    const [selectedAnswer, setSelectedAnswer] = useState("")

    const [lesson, setLesson] = useState<LessonData>()
    const [lessonOpen, setLessonOpen] = useState(false)

    {/*
        getFlashcard also checks if user has finished flashcard tasks.
        If user has finished flashcard tasks, question task will start.
        The lesson is loaded first so the task never shows before it.
    */}
    useEffect(() => {
        getLesson().then(getFlashcard)
    }, [])


    useEffect(() => {
        if (state == "questions") { 
            getQuestions()
        }
    }, [state])


    {/* Client calculated break timer that switches back to showing flashcards after period ends. */}
    useEffect(() => {
        if (!breakData) {
            return 
        }


        // Deadline is built from the browser's own clock so a server/browser clock difference can't end the break early.
        const due = Date.now() + breakData.seconds_left * 1000

        function calcBreakTime() {
            const now = Date.now()
            const timeLeft = Math.round((due - now) / 1000)
            
            if (timeLeft < 0) {
                setBreakTimeLeft("")
                setBreakData(undefined)
                getFlashcard()

                return 
            }


            const hours = Math.floor(timeLeft / 3600)
            const minutes = Math.floor((timeLeft % 3600) / 60)
            const seconds = timeLeft % 60

            setBreakTimeLeft(
                `${String(hours).padStart(2, "0")}:` +
                `${String(minutes).padStart(2, "0")}:` +
                `${String(seconds).padStart(2, "0")}`
            )
        }


        calcBreakTime()

        const interval = setInterval(calcBreakTime, 1000)

        return () => clearInterval(interval)
    }, [breakData])


    async function submitAnswer(user_answer: string) {
        if (selectedAnswer != "" && !questionResponse?.correct) {
            setQuestionResponse(undefined)
            setSelectedAnswer("")

            if (questionResponse?.finished) { 
                setQuestions(undefined)
                setState("complete")
                setCurrentQuestion(0)
            }
            else {
                setCurrentQuestion(Math.min(questions!.length - 1, currentQuestion + 1))
            }


            return 
        }


        try {
            const response = await fetch(
                `/api/questions/${topicId}/${questions![currentQuestion].id}/answer`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        user_answer
                    })
                }
            )


            if (response.ok) {
                const json = await response.json()
                setQuestionResponse(json)
                setSelectedAnswer(user_answer)

                if (json.correct) {
                    new Audio("/sfx/question_correct.mp3").play()

                    setTimeout(() => {
                        setQuestionResponse(undefined)
                        setSelectedAnswer("")
                        setCurrentQuestion(Math.min(questions!.length - 1, currentQuestion + 1))
                    }, 1500)

                    if (json.finished) {
                        setCurrentQuestion(questions!.length)

                        setTimeout(() => {
                            setQuestionResponse(undefined)
                            setSelectedAnswer("")
                            setCurrentQuestion(0)
                            setQuestions(undefined)
                            setState("complete")
                        }, 1500)
                    }
                }
                else {
                    new Audio("/sfx/question_wrong.mp3").play()
                }
            }
        }
        catch {

        }
    }


    async function getQuestions() {
        try {
            const response = await fetch(
                `/api/questions/${topicId}`,
                {
                    credentials: "include"
                }
            )


            if (response.ok) {
                const json = await response.json()
                setQuestions(json["questions"])
                setCurrentQuestion(json["current_question_index"])
            }
            else if (response.status == 409) {
                setState("complete")
            }
        }
        catch {
            
        }
    }


    async function getLesson() {
        try {
            const response = await fetch(
                `/api/documents/${documentId}/topics/${topicId}/lesson`,
                {
                    credentials: "include"
                }
            )


            const data = await response.json()

            if (response.ok) {
                setLesson(data)
            }
            else {
                setError(data.detail || "A server error occured.")
            }
        }
        catch {
            setError("A network error occured.")
        }
    }


    // The lesson closes straight away. If saving fails, it just opens by itself again on the next visit.
    async function readLesson() {
        setLesson({ ...lesson!, read: true })

        try {
            await fetch(
                `/api/documents/${documentId}/topics/${topicId}/lesson/read`,
                {
                    method: "POST",
                    credentials: "include"
                }
            )
        }
        catch {

        }
    }


    async function getFlashcard() {
        try {
            const response = await fetch(
                `/api/flashcards/${topicId}`,
                {
                    credentials: "include"
                }
            )


            if (response.ok) {
                const json = await response.json() 

                if (!("state" in json)) {
                    setCurrentCard(undefined)
                    setBreakData(undefined)

                    return 
                }


                const responseState = json["state"]
                
                if (responseState == "card") {
                    setCurrentCard(json)
                    setBreakData(undefined)
                }
                else if (responseState == "break") {
                    setCurrentCard(undefined)
                    setBreakData(json)
                }
                else if (responseState == "complete") {
                    setCurrentCard(undefined)
                    setBreakData(undefined)
                    setState("questions")
                }
            }
            else if (response.status == 403 || response.status == 409) {
                router.replace(`/documents/${documentId}/topics`)
            }
        }
        catch {
            setError("A network error occured.")
        }
    }


    async function review(answer: string) {
        setRequestState("waiting")

        try {
            const response = await fetch(
                `/api/flashcards/${currentCard!.id}/review`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        response: answer
                    })
                }
            )


            if (response.ok) {
                await getFlashcard()
                setCardState("hidden")
            }
            else {
                setError("A server error occured.")
            }


            setRequestState("ready")
        }
        catch {
            setError("A server error occured.")
            setRequestState("ready")
        }
    }


    async function askQuestion(prompt: string) {
        if (prompt.length < 5) {
            setError("Enter at least 5 characters.")

            return false
        }
        else if (prompt.length >= 10000) {
            setError("Prompt is too long.")

            return false
        }


        // Checked in the same order as the page picks what to show, so the help is about what is on screen.
        // The server uses the lesson when neither a flashcard nor a question is sent.
        const question = questions?.[Math.min(currentQuestion, questions.length - 1)]

        const onScreen = unreadLesson ? {}
        : currentCard ? {
            flashcard: {
                front: currentCard.front,
                back: currentCard.back
            }
        }
        : !breakData && question ? {
            question: {
                question: question.question,
                options: question.options,
                answer: questionResponse?.answer
            }
        }
        : {}


        try {
            const response = await fetch(
                `/api/documents/${documentId}/topics/${topicId}/help`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        user_prompt: prompt,
                        ...onScreen
                    })
                }
            )


            const data = await response.json()

            if (response.ok) {
                setPromptResponse({
                    question: prompt,
                    answer: data.response
                })
            }
            else {
                setError(data.detail || "A server error occured.")
            }
        }
        catch {
            setError("A network error occured.")
        }


        return true
    }


    // The lesson opens by itself until it has been read, and from the Lesson button after that.
    const unreadLesson = lesson?.read ? undefined : lesson?.lesson

    // 0 is the lesson, 1 the flashcards, 2 the quiz and 3 a finished topic.
    const step = unreadLesson ? 0 : state == "questions" ? 2 : state == "complete" ? 3 : 1

    const progress = unreadLesson ? 0
    : questions ? Math.round(currentQuestion / questions.length * 1000) / 10 || 0
    : breakData ? breakData.completion
    : currentCard?.completion ?? 0

    return (
        <>
            <div className="h-dvh flex flex-col bg-surface">
                <StepBar
                    step={step}
                    progress={progress}
                    documentId={documentId}
                    onOpenLesson={lesson?.lesson && !unreadLesson ? () => setLessonOpen(true) : undefined}
                    onNext={unreadLesson ? readLesson : undefined}
                />


                {/* The scrollbar is hidden, but the page still scrolls with the wheel, touch and keyboard. */}
                <main className="flex-1 flex flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="flex-1 w-full max-w-2xl mx-auto px-6 py-10 flex flex-col items-center justify-center">
                        {unreadLesson ? (
                            <div className="w-full text-[17px] sm:text-lg">
                                <Lesson lesson={unreadLesson} />
                            </div>
                        ) : currentCard ? (
                            <FlashcardTask
                                card={currentCard}
                                cardState={cardState}
                                onReveal={() => setCardState("shown")}
                                onReview={review}
                                error={error} 
                                ready={requestState == "ready"}
                            />
                        ) : breakData ? (
                            <RestingPeriod timeLeft={breakTimeLeft} documentId={documentId} />
                        ) : questions ? (
                            <QuestionTask
                                question={questions[Math.min(currentQuestion, questions.length - 1)]}
                                selectedAnswer={selectedAnswer}
                                questionResponse={questionResponse}
                                onAnswer={submitAnswer}
                            />
                        ) : state == "complete" && (
                            <TopicComplete documentId={documentId} />
                        )}
                    </div>
                </main>


                {lessonOpen && lesson?.lesson && (
                    <LessonPanel
                        lesson={lesson.lesson}
                        onClose={() => setLessonOpen(false)}
                    />
                )}


                {error && (
                    <NoticePrompt 
                        message={error}
                        onOkay={() => setError("")}
                    />
                )}


                {promptResponse && (
                    <HelpResponse
                        question={promptResponse.question}
                        answer={promptResponse.answer}
                        onClose={() => setPromptResponse(undefined)}
                    />
                )}


                {!breakData && state != "complete" && (
                    <PromptBar onAsk={askQuestion} />
                )}
            </div>
        </>
    )
}
