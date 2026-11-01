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

    function playVoice() {
        new Audio(`/api/flashcards/${card.id}/tts/${shown ? "back" : "front"}`).play()
    }

    async function generateVoice() {
        const side = shown ? "back" : "front"

        try {
            const response = await fetch(
                `/api/flashcards/${card.id}/tts/${side}`,
                {
                    credentials: "include",
                }
            )


            if (response.ok) {
                playVoice()
            }
            else {

            }
        }
        catch {

        }
    }


    return (
        <div className="flex flex-col gap-6 items-center w-full">
            <div className={`
                card w-full min-h-80 flex flex-col items-center justify-center text-center p-10 gap-4 relative
                text-2xl font-semibold leading-snug transition-all ${shown ? "border-primary/40" : ""}
            `}>
                <span className="text-xs font-bold uppercase tracking-wider text-accent">
                    {shown ? "Answer" : "Question"}
                </span>

                <button 
                    className="absolute top-0 right-0 p-5 cursor-pointer"
                    onClick={generateVoice}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16">
                        <g fill="currentColor">
                            <path d="M9.293 1c.39 0 .707.317.707.707v12.586a.707.707 0 0 1-1.207.5L5 11V5l3.793-3.793a.7.7 0 0 1 .5-.207M12 2.804a6 6 0 0 1 0 10.392l-.5-.866a5 5 0 0 0 0-8.66z"/>
                            <path d="M11 4.536a4 4 0 0 1 0 6.928l-.5-.866a3 3 0 0 0 0-5.196zM4 11H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1z"/>
                        </g>
                    </svg>
                </button>

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
