"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import ProgressBar from "@/components/progressBar"
import Link from "next/link"
import NoticePrompt from "@/components/noticePrompt"
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
    lesson: string | null
}

//

function RestingPeriod({
    timeLeft,
    documentId
}: {
    timeLeft: string
    documentId: string
}) {
    return (
        <div className="card w-full min-h-80 flex flex-col gap-2 items-center justify-center text-center p-8">
            <span className="text-2xl font-extrabold">
                Break Time
            </span>

            <span className="text-accent">
                Your next cards will be ready in
            </span>

            <span className="text-5xl font-extrabold text-primary tabular-nums my-2">
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
        <div className="card w-full min-h-80 flex flex-col gap-3 items-center justify-center text-center p-8">
            <span className="w-16 h-16 rounded-full bg-green-50 text-success text-3xl font-extrabold flex items-center justify-center">
                ✓
            </span>

            <span className="text-3xl font-extrabold">
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

    const [currentCard, setCurrentCard] = useState<Flashcard>()
    const [breakData, setBreakData] = useState<Data>()
    const [breakTimeLeft, setBreakTimeLeft] = useState<string>("")

    const [questions, setQuestions] = useState<QuestionData[]>()
    const [currentQuestion, setCurrentQuestion] = useState<number>(0)
    const [questionResponse, setQuestionResponse] = useState<QuestionResponse>()
    const [selectedAnswer, setSelectedAnswer] = useState("")

    // Cleared when the user presses next, which reveals the task underneath.
    const [lesson, setLesson] = useState<LessonData>()

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


            if (response.ok) {
                const json = await response.json()
                setLesson(json)
            }
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


    const progress = questions ? Math.round(currentQuestion / questions.length * 1000) / 10 || 0 
    : undefined

    return (
        <>
            <div className="bg-black/80">
                {/* A lesson is held to the window height, so a long one scrolls inside its card instead of scrolling the page. */}
                <div className={`${lesson?.lesson ? "h-dvh" : "min-h-screen pb-10"} flex flex-col items-center px-4 pt-6`}>
                    {/* Break time has its own progress bar and back button, unless the lesson is covering it. */}
                    {(!breakData || lesson?.lesson) && (
                        <div className="w-full max-w-2xl flex items-center gap-4 h-10">
                            <Link
                                href={`/documents/${documentId}/topics`}
                                aria-label="Back to topics"
                                className="btn btn-ghost h-9 w-9 px-0 shrink-0"
                            >
                                ✕
                            </Link>

                            {progress !== undefined && (
                                <ProgressBar progress={progress} className="flex-1" />
                            )}
                        </div>
                    )}


                    <div className="flex-1 min-h-0 w-full max-w-2xl flex flex-col items-center justify-center py-8">
                        {lesson?.lesson ? (
                            <Lesson
                                lesson={lesson.lesson}
                                onNext={() => setLesson(undefined)}
                            />
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
                            <div className="w-full flex flex-col gap-3">
                                <ProgressBar progress={breakData.completion || 0} />
                                <RestingPeriod timeLeft={breakTimeLeft} documentId={documentId} />
                            </div>
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
                </div>


                {error != "" && (
                    <NoticePrompt 
                        message={error}
                        onOkay={() => setError("")}
                    />
                )}
            </div>
        </>
    )
}
