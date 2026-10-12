"use client"

import NavBar from "@/components/navbar"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ProgressBar from "@/components/progressBar"
import ConfirmationPrompt from "@/components/confirmationPrompt"
import NoticePrompt from "@/components/noticePrompt"
import { formatFileSize } from "@/lib/file_size"

//

type DocumentData = {
    id: number,
    title: string,
    status: string,
    mastery: number
}

const ACCEPTED_FILES = ".pdf,.docx,.txt"

//

function EmptyUpload(
{ 
    onUpload 
}: { 
    onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void 
}) {
    return (
        <div className="w-full min-h-screen flex justify-center items-center p-6 pt-24">
            <label
                htmlFor="file-upload"
                className="
                    card w-full max-w-2xl h-96 flex flex-col gap-3 justify-center items-center cursor-pointer
                    border-2 border-dashed transition-all hover:border-primary hover:bg-primary-soft group
                "
            >
                <input
                    id="file-upload"
                    type="file"
                    accept={ACCEPTED_FILES}
                    className="hidden"
                    onChange={onUpload}
                />

                <span className="
                    w-14 h-14 rounded-2xl bg-primary-soft text-primary text-3xl font-bold
                    flex items-center justify-center transition-all group-hover:scale-110
                ">
                    +
                </span>

                <p className="text-lg font-bold">
                    Upload your first document
                </p>

                <p className="text-accent text-sm">
                    PDF, DOCX, or TXT
                </p>
            </label>
        </div>
    )
}


function AddDocument({
    setOpenCreate
} : {
    setOpenCreate: React.Dispatch<React.SetStateAction<boolean>>
}
) {
    return (
        <button 
        onClick={() => setOpenCreate(true)}
        className="
            h-40 rounded-2xl border-2 border-dashed border-border bg-surface/60 text-accent
            flex flex-col gap-1 justify-center items-center cursor-pointer transition-all
            hover:border-primary hover:text-primary hover:bg-primary-soft
        ">
            <span className="text-3xl font-bold">
                +
            </span>

            <span className="text-sm font-bold">
                Add document
            </span>
        </button>
    )
}


function Document({
    document,
    onOpen,
    onDelete
}: {
    document: DocumentData
    onOpen: () => void
    onDelete: () => void
}) {
    const ready = document.status === "ready"
    const failed = document.status === "failed"

    return (
        <div className={`relative group transition-all ${ready ? "hover:-translate-y-1" : ""}`}>
            <button
                onClick={onOpen}
                disabled={!ready}
                className={`
                    card w-full h-40 p-4 flex flex-col justify-between text-left transition-all
                    enabled:cursor-pointer enabled:group-hover:shadow-lg
                    enabled:group-hover:border-primary
                    ${failed ? "border-danger/40 disabled:cursor-default" : "disabled:cursor-wait"}
                `}
            >
                {ready ? (
                    <span className="font-bold leading-snug line-clamp-3 pr-6">
                        {document.title}
                    </span>
                ) : failed ? (
                    <span className="flex flex-col gap-1.5">
                        <span className="flex items-start gap-2 text-danger text-sm font-bold">
                            <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 8v5M12 16h.01" />
                            </svg>

                            Course not created
                        </span>

                        <span className="text-xs text-accent leading-snug">
                            An error occured.
                        </span>
                    </span>
                ) : (
                    <span className="flex items-center gap-2 text-accent text-sm font-bold">
                        <span className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin" />
                        Processing...
                    </span>
                )}

                {!failed && (
                    <div className="flex flex-col gap-2 w-full">
                        {ready && <ProgressBar progress={document.mastery} />}
                    </div>
                )}
            </button>


            <button
                onClick={() => onDelete()}
                aria-label="Delete document"
                className={
                    failed ? "btn btn-danger absolute bottom-4 left-4 right-4" : 
                `
                    absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center
                    text-accent cursor-pointer transition-all opacity-60 group-hover:opacity-100
                    hover:bg-red-50 hover:text-danger
                `}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                </svg>

                {failed && "Delete"}
            </button>
        </div>
    )
}


function Create(
{
    onUpload,
    onPromptUpload,
    onClose,
    prompt,
    setPrompt,
} : {
    onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void,
    onPromptUpload: (prompt: string) => void,
    onClose: () => void,
    prompt: string,
    setPrompt: React.Dispatch<React.SetStateAction<string>>
}
) {
    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50 p-4"
            onClick={onClose}
        >
            <div
                className="card p-6 w-full max-w-150 flex flex-col gap-6 h-100"
                onClick={(event) => event.stopPropagation()}
            >
                {/* Upload document and turn it into a course */}
                <label className="
                    h-60 rounded-2xl border-2 border-dashed border-border bg-surface/60 text-accent
                    flex flex-col gap-1 justify-center items-center cursor-pointer transition-all
                    hover:border-primary hover:text-primary hover:bg-primary-soft
                ">
                    <span className="text-3xl font-bold">
                        +
                    </span>

                    <span className="text-sm font-bold">
                        Upload document
                    </span>

                    <input
                        type="file"
                        accept={ACCEPTED_FILES}
                        className="hidden"
                        onChange={onUpload}
                    />
                </label>
                
                <div className="flex items-center gap-3 my-1 text-accent">
                    <div className="flex-1 border-t border-border" />

                    <span className="text-xs font-bold">
                        OR
                    </span>

                    <div className="flex-1 border-t border-border" />
                </div>


                {/* Enter prompt and turn it into a course */}
                <div className="flex flex-col gap-1.5 group">
                    <label 
                        htmlFor="prompt" 
                        className="text-sm font-bold text-accent group-focus-within:text-primary transition-colors"
                    >
                        Prompt 
                    </label>

                    <form 
                        onSubmit={(event) => {
                            event.preventDefault()
                            onPromptUpload(prompt)
                        }}
                        className="relative"
                    >
                        <input
                            id="prompt"
                            placeholder="I want to learn English."
                            className="input pr-10"
                            onChange={(event) => setPrompt(event.target.value)}
                            value={prompt}
                        />

                        <button
                            type="submit"
                            aria-label="Submit prompt"
                            className={`
                                absolute top-1.5 right-1.5 w-7 h-7 rounded-full text-white flex items-center justify-center 
                                cursor-pointer transition-all hover:brightness-110 active:scale-95 
                                ${prompt.length < 5 || prompt.length > 100000 ? "bg-danger" : "bg-primary"}
                            `}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 19V5M5 12l7-7 7 7" />
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

//

export default function Home() {
    const router = useRouter()
    const [documents, setDocuments] = useState<DocumentData[]>()
    const [documentToDelete, setDocumentToDelete] = useState<number>()
    const [uploadError, setUploadError] = useState("")
    const [openCreate, setOpenCreate] = useState(false)
    const [prompt, setPrompt] = useState("")

    useEffect(() => {
        getDocuments()
    }, [])

    
    // Poll user's documents every second so they can see the status of their documents live.
    useEffect(() => {
        const processing = documents?.some(
            (document) =>
                document.status == "pending" ||
                document.status == "processing"
        )


        if (!processing) {
            return
        }


        const timeout = setTimeout(() => {
            getDocuments()
        }, 1000)


        return () => clearTimeout(timeout)

    }, [documents])


    async function deleteDocument(documentId: number) {
        try {
            const response = await fetch(
                `/api/documents/${documentId}`,
                {
                    method: "DELETE",
                    credentials: "include"
                }
            )


            if (response.ok) {
                setDocuments(prev =>
                    prev?.filter(document => document.id !== documentId)
                )
            }
        }
        catch {
            setUploadError("A network error occured.")
        }
    }


    async function getDocuments() {
        try {
            const response = await fetch(
                `/api/documents`,
                {
                    "credentials": "include"
                }
            )


            if (!response.ok) {
                setDocuments([])
                return
            }


            const data = await response.json()
            setDocuments(data)
        }
        catch {
            setDocuments([])
        }
    }


    async function uploadFile(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0] ?? null

        // Reset so selecting the same file again still triggers onChange.
        event.target.value = ""

        if (!file) {
            return
        }


        const formData = new FormData()
        formData.append("file", file)
        setUploadError("")

        try {
            const response = await fetch(
                `/api/documents/upload`,
                {
                    "method": "POST",
                    "credentials": "include",
                    "body": formData
                }
            )


            setOpenCreate(false)

            if (!response.ok) {
                const json = await response.json().catch(() => ({}))
                setUploadError(json.detail ?? "Upload failed.")

                return
            }
        }
        catch {
            setOpenCreate(false)
            setUploadError("Upload failed.")

            return
        }


        getDocuments()
    }


    async function uploadPrompt(prompt: string) {
        setPrompt("")

        const promptLength = prompt.length

        if (promptLength < 5) {
            setUploadError("Prompt must be at least 5 characters long.")
        }
        else if (promptLength > 255) {
            setUploadError("Prompt must be at least 5 characters long.")
        }


        try {
            const response = await fetch(
                "/api/documents/prompt",
                {
                    "method": "POST",
                    "headers": {
                        "Content-Type": "application/json"
                    },
                    "credentials": "include",
                    "body": JSON.stringify({ user_prompt: prompt })
                }
            )


            const json = await response.json()

            if (response.ok) {
                setOpenCreate(false)
                getDocuments()
            }
            else {
                setUploadError(typeof json.detail === "string" ? json.detail : "Could not submit prompt.")
            }
        }
        catch {
            setUploadError("A network error occured.")
        }
    }


    return (
        <>
            <NavBar />

            {!documents ? (
                <div className="w-full min-h-screen flex items-center justify-center">
                    <span className="w-8 h-8 border-3 border-border border-t-primary rounded-full animate-spin" />
                </div>
            ) : documents.length == 0 ? (
                <EmptyUpload onUpload={uploadFile} />
            ) : (
                <div className="w-full max-w-5xl mx-auto px-4 pt-28 pb-10">
                    <h1 className="text-3xl font-extrabold mb-6">
                        Your documents
                    </h1>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <AddDocument 
                            setOpenCreate={setOpenCreate}
                        />

                        {documents.map((document) => (
                            <Document
                                key={document.id}
                                document={document}
                                onOpen={() => router.push(`/documents/${document.id}/topics`)}
                                onDelete={() => {
                                    if (document.status === "failed") {
                                        deleteDocument(document.id)
                                    }
                                    else {
                                        setDocumentToDelete(document.id)
                                    }
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {uploadError ? (
                <NoticePrompt 
                    message={uploadError}
                    onOkay={() => setUploadError("")}
                />
            ): openCreate && (
                <Create 
                    onUpload={uploadFile} 
                    onPromptUpload={uploadPrompt}
                    onClose={() => setOpenCreate(false)}
                    prompt={prompt}
                    setPrompt={setPrompt} 
                />
            )}

            {documentToDelete && (
                <ConfirmationPrompt
                    message="Delete this document?"
                    onNo={() => setDocumentToDelete(undefined)}
                    onYes={() => {
                        deleteDocument(documentToDelete)
                        setDocumentToDelete(undefined)
                    }}
                />
            )}
        </>
    )
}
