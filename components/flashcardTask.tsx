import LabeledText from "@/components/labeledText"

//

export type Flashcard = {
    id: number
    front: string
    back: string
}

//

export default function FlashcardTask({
    card,
    cardState,
    onReveal,
    onReview,
    error,
    ready
}: {
    card: Flashcard
    cardState: string
    onReveal: () => void
    onReview: (answer: string) => void
    error: string,
    ready: boolean
}) {
    const shown = cardState == "shown"

    return (
        <div className="flex flex-col gap-6 items-center w-full">
            <div className={`
                card w-full min-h-80 flex flex-col items-center justify-center text-center p-10 gap-4
                text-2xl font-semibold leading-snug transition-all ${shown ? "border-primary/40" : ""}
            `}>
                <span className="text-xs font-bold uppercase tracking-wider text-accent">
                    {shown ? "Answer" : "Question"}
                </span>

                <LabeledText text={shown ? card.back : card.front} />
            </div>

            {!shown ? (
                <button className="btn btn-primary w-48" onClick={onReveal}>
                    Show Answer
                </button>
            ) : (
                <div className="flex gap-3 w-full max-w-sm">
                    <button
                        className={`btn btn-danger flex-1 ${error != "" && "btn-ghost"}`}
                        disabled={!ready}
                        onClick={() => onReview("again")}
                    >
                        Forgot
                    </button>

                    <button
                        className={`btn btn-success flex-1 ${error != "" && "btn-ghost"}`}
                        disabled={!ready}
                        onClick={() => onReview("good")}
                    >
                        Remembered
                    </button>
                </div>
            )}
        </div>
    )
}
