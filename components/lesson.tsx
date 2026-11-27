import type { ComponentProps } from "react"
import Markdown, { type ExtraProps } from "react-markdown"
import { useState } from "react"

import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"
import Graph from "@/components/graph"

import { LessonQuestion, LessonData } from "@/lib/sharedTypes"

//

type Node = {
    type: string
    tagName?: string
    value?: string
    properties?: Record<string, unknown>
    children?: Node[]
    data?: { hProperties?: Record<string, unknown> }
    position?: { start: { offset?: number } }
}

//

function addDisplayMath(node: Node, file: { value: unknown }) {
    if (node.type == "inlineMath" && String(file.value).startsWith("$$", node.position?.start.offset)) {
        node.data!.hProperties!.className = ["language-math", "math-display"]
    }


    node.children?.forEach((child) => addDisplayMath(child, file))
}

const remarkDisplayMath = () => addDisplayMath

function addRuby(node: Node) {
    if (!node.children || node.tagName == "code") {
        return
    }

    node.children = node.children.flatMap((child) => {
        if (child.type != "text") {
            addRuby(child)

            return [child]
        }

        const text = child.value!
        const parts: Node[] = []
        let lastIndex = 0

        // A three-part [[kanji|kana|romanization]] keeps only the kana as the label.
        for (const match of text.matchAll(/\[\[(?:[^|\]]+\|)?([^|\]]+)\|([^|\]]+)\]\]/g)) {
            parts.push(
                {
                    type: "text",
                    value: text.slice(lastIndex, match.index)
                },
                {
                    type: "element",
                    tagName: "ruby",
                    properties: {},
                    children: [
                        {
                            type: "text",
                            value: match[2]
                        },
                        {
                            type: "element",
                            tagName: "rt",
                            properties: { className: ["text-sm"] },
                            children: [
                                {
                                    type: "text",
                                    value: match[1]
                                }
                            ]
                        }
                    ]
                }
            )

            lastIndex = match.index + match[0].length
        }

        parts.push({
            type: "text",
            value: text.slice(lastIndex)
        })

        return parts
    })
}

const rehypeRuby = () => addRuby

function escapeAnnotations(lesson: string) {
    return lesson.replace(/\[\[[^\]]+\]\]/g, (annotation) => annotation.replace(/\\?\|/g, "\\|"))
}

function CodeBlock({ node, children }: ComponentProps<"pre"> & ExtraProps) {
    const code = node?.children[0]

    if (code?.type == "element" && String(code.properties.className).includes("language-graph")) {
        const text = code.children[0]

        return <Graph source={text?.type == "text" ? text.value : ""} />
    }

    return (
        <pre>
            {children}
        </pre>
    )
}

//

function LessonMarkdown({ content }: { content: string }) {
    return (
        <Markdown
            remarkPlugins={[
                remarkGfm,
                remarkMath,
                remarkDisplayMath
            ]}
            rehypePlugins={[
                rehypeRuby,
                rehypeKatex
            ]}
            components={{ pre: CodeBlock }}
        >
            {escapeAnnotations(content)}
        </Markdown>
    )
}

function KnowledgeCheck({
    question,
    documentId,
    topicId,
    setError,
    completedSections,
    setCompletedSections,
    lessonData, 
    setLessonData
}: {
    question: LessonQuestion;
    documentId: string,
    topicId: string,
    setError: React.Dispatch<React.SetStateAction<string>>,
    completedSections: number,
    setCompletedSections: React.Dispatch<React.SetStateAction<number>>,
    lessonData?: LessonData, 
    setLessonData?: React.Dispatch<React.SetStateAction<LessonData | undefined>>
}) {
    const [waiting, setWaiting] = useState(false)
    const [canSkip, setCanSkip] = useState(false)
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
    const answered = selectedAnswer !== null
    const isCorrect = selectedAnswer === question.answer_index

    async function answerQuestion(selectedAnswerIndex: number) {
        if (waiting) {
            return 
        }

        if (canSkip) {
            const nextSection = completedSections + 1

            if (lessonData && nextSection < lessonData.lesson_sections!.length) {
                setCompletedSections(nextSection)
            }
            else if (lessonData && setLessonData) {
                // Lesson is finished so we need to update state to re-render page
                setLessonData({
                    ...lessonData,
                    read: true,
                })
            }


            setCanSkip(false)

            return 
        }

        setWaiting(true)
        setSelectedAnswer(selectedAnswerIndex)

        const isCorrect = selectedAnswerIndex === question.answer_index

        if (isCorrect) {
            new Audio("/sfx/question_correct.mp3").play()
        } 
        else {
            new Audio("/sfx/question_wrong.mp3").play()
        }

        try {
            const response = await fetch(
                `/api/documents/${documentId}/topics/${topicId}/lesson/answer`,
                {
                    method: "POST",
                    credentials: "include",
                }
            )

            if (response.ok) {
                setCanSkip(true)
            }
            else {
                const data = await response.json()
                const detail = data.detail 
                setError(detail)
            }
        } 
        catch {
            setError("A network error occured.")
        }

        setWaiting(false)
    }

    return (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Knowledge Check
                </p>

                <div className="font-semibold">
                    <LessonMarkdown content={question.question}/>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                {question.options.map((option, index) => {
                    const isSelected = selectedAnswer === index
                    const isCorrect = index === question.answer_index

                    // Once answered, only show the selected and correct answers.
                    if (answered && !isSelected && !isCorrect) {
                        return null
                    }

                    return (
                        <button
                            key={index}
                            type="button"
                            onClick={() => answerQuestion(index)}
                            disabled={answered && !canSkip}
                            className={`
                                w-full rounded-lg border px-4 py-3 text-left
                                transition-colors cursor-pointer
                                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
                                ${answered && isCorrect
                                    ? "border-success bg-success/10 text-success"
                                    : answered && isSelected
                                        ? "border-danger bg-danger/10 text-danger"
                                        : "border-border bg-background hover:border-primary/60 hover:bg-primary-soft/40"
                                }
                            `}
                        >
                            <LessonMarkdown content={option} />
                        </button>
                    )
                })}
            </div>

            {answered && (
                <div className={`rounded-lg border-l-2 bg-background px-4 py-3 flex flex-col gap-2 ${
                    isCorrect ? "border-success" : "border-danger"
                }`}>
                    <p className={`font-semibold ${
                        isCorrect ? "text-success" : "text-danger"
                    }`}>
                        {isCorrect ? "Correct!" : "Not quite!"}
                    </p>

                    <LessonMarkdown content={question.explanation}/>
                </div>
            )}
        </div>
    );
}

export default function Lesson(
{ 
    lesson,
    question,
    documentId, 
    topicId,
    setError,
    completedSections,
    setCompletedSections,
    lessonData,
    setLessonData
}: { 
    lesson: string 
    question?: LessonQuestion
    documentId?: string 
    topicId?: string
    setError?: React.Dispatch<React.SetStateAction<string>>,
    completedSections?: number,
    setCompletedSections?: React.Dispatch<React.SetStateAction<number>>,
    lessonData?: LessonData, 
    setLessonData?: React.Dispatch<React.SetStateAction<LessonData | undefined>>
}) {
    const [showQuestion, setShowQuestion] = useState(false)

    if (!(question && documentId && topicId && setError && completedSections !== undefined && setCompletedSections)) {
        return (
            <div className="lesson">
                <LessonMarkdown content={lesson} />
            </div>
        )
    }

    return (
        <div className="lesson relative flex-1 min-h-0 overflow-hidden">
            <div className={`
                absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)]
                ${showQuestion ? "-translate-y-full" : ""}
            `}>
                <div inert={showQuestion} className="absolute inset-0 flex flex-col">
                    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
                        <div className="my-auto flex flex-col gap-3">
                            <LessonMarkdown content={lesson} />
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowQuestion(true)}
                        className="
                            shrink-0 mx-auto mt-6 mb-1 cursor-pointer rounded-full border border-border
                            px-5 py-3 transition-colors hover:border-primary/60 hover:bg-primary-soft/40
                            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
                        "
                    >
                        Knowledge Check
                    </button>
                </div>

                <div inert={!showQuestion} className="absolute inset-x-0 top-full h-full overflow-y-auto flex flex-col">
                    <div className="my-auto">
                        <KnowledgeCheck
                            key={question.question}
                            question={question}
                            documentId={documentId}
                            topicId={topicId}
                            setError={setError}
                            completedSections={completedSections}
                            setCompletedSections={setCompletedSections}
                            lessonData={lessonData}
                            setLessonData={setLessonData}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
