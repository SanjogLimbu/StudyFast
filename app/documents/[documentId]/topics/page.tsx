"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getDocument } from "@/lib/document"
import Link from "next/link"
import ProgressBar from "@/components/progressBar"
import NoticePrompt from "@/components/noticePrompt"
import LabeledText from "@/components/labeledText"

//

type TopicData = {
    id: number
    name: string
    order_index: number
    mastery: number
    status: string
    content_status: string
}


type DocumentData = {
    title: string
    topics: TopicData[]
    mastery: number
}

const positions = [
    0,
    72,
    0,
    -72
]

//

function Topic({
    topic,
    index,
    isLast,
    documentId,
}: {
    topic: TopicData,
    index: number,
    isLast: boolean,
    documentId: string,
}) {
    const currentX = positions[index % positions.length]
    const nextX = positions[(index + 1) % positions.length]

    const differenceX = nextX - currentX
    const locked = topic.status == "locked"
    const generating = topic.content_status == "pending" || topic.content_status == "processing"

    return (
        <div
            className="flex flex-col gap-1.5 relative w-52"
            style={{
                transform: `translateX(${currentX}px)`
            }}
        >
            {!isLast && (
                <div
                    className={`
                        absolute top-[calc(100%-3.5rem)] left-1/2 w-1.5 h-48 rounded-full origin-top
                        ${locked ? "bg-border" : "bg-primary/40"}
                    `}
                    style={{
                        transform: `
                            translateX(-50%)
                            rotate(${differenceX > 0 ? "-22deg" : differenceX < 0 ? "22deg" : "0deg"})
                        `
                    }}
                />
            )}

            <ProgressBar progress={topic.mastery} />

            {locked ? (
                <div className="
                    min-h-28 py-2 rounded-2xl bg-background border-2 border-dashed border-border text-accent/70
                    flex flex-col justify-center items-center text-center px-3 select-none z-2
                ">
                    <p className="font-bold">
                        <LabeledText text={topic.name} />
                    </p>
                </div>
            ) : topic.content_status != "ready" ? (
                <div className="
                    card min-h-28 px-3 py-2 flex flex-col gap-2 justify-center items-center text-center z-2
                    border-2 border-primary/30
                ">
                    <p className="font-bold">
                        <LabeledText text={topic.name} />
                    </p>

                    {generating ? (
                        <span className="flex items-center gap-2 text-accent text-xs font-bold">
                            <span className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin" />
                            Generating...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2 text-accent text-xs font-bold">
                            <span className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin" />
                            ...
                        </span>
                    )}
                </div>
            ) : (
                <>
                    <Link
                        href={`/documents/${documentId}/topics/${topic.id}`}
                        className="
                            card min-h-28 px-3 py-2 flex justify-center items-center text-center font-bold z-2
                            border-2 border-primary/30 transition-all
                            hover:-translate-y-1 hover:shadow-lg hover:border-primary hover:text-primary
                        "
                    >
                        <LabeledText text={topic.name} />
                    </Link>
                </>
            )}
        </div>
    )
}

//

export default function Home() {
    const params = useParams()
    const documentId = params.documentId as string

    const [document, setDocument] = useState<DocumentData>()
    const [error, setError] = useState("")

    useEffect(() => {
        loadDocument()
    }, [documentId])


    // Poll every second while topics are generating so they open up without a page refresh.
    useEffect(() => {
        const generating = document?.topics.some(
            (topic) =>
                topic.content_status == "pending" ||
                topic.content_status == "processing"
        )


        if (!generating) {
            return
        }


        const timeout = setTimeout(() => {
            loadDocument()
        }, 1000)


        return () => clearTimeout(timeout)
    }, [document])


    async function loadDocument() {
        const data = await getDocument(documentId)

        if (data) {
            setDocument(data)
        }
    }
    

    return (
        <>
            <header className="
                fixed top-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-3xl
                card bg-surface/90 backdrop-blur px-4 py-3 flex items-center gap-4
            ">
                <Link href="/home" className="btn btn-ghost h-9 px-3 shrink-0">
                    ← Back
                </Link>

                <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <span className="text-sm font-bold truncate">
                        {document?.title}
                    </span>

                    <ProgressBar progress={document?.mastery || 0} />
                </div>
            </header>


            {document && (
                <div className="w-full min-h-screen flex justify-center pt-32 pb-20 overflow-x-hidden">
                    <div className="flex flex-col items-center gap-10">
                        {document.topics.map((topic, index) => (
                            <Topic
                                key={topic.id}
                                topic={topic}
                                index={index}
                                isLast={index==document.topics.length-1}
                                documentId={documentId}
                            />
                        ))}
                    </div>
                </div>
            )}


            {error && (
                <NoticePrompt
                    message={error}
                    onOkay={() => setError("")}
                />
            )}
        </>
    )
}
