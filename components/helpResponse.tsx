type Props = {
    question: string
    answer: string
    onClose: () => void
}

//

export default function HelpResponse({
    question,
    answer,
    onClose
}: Props) {
    return (
        <>
            <div className="hidden sm:block fixed inset-0 z-40 bg-black/20" onClick={onClose} />

            <aside
                className={`
                    shrink-0 w-full max-h-[50dvh] flex flex-col border-t border-border bg-background
                    sm:fixed sm:inset-y-0 sm:right-0 sm:z-40 sm:max-w-lg sm:max-h-none
                    sm:border-t-0 sm:border-l sm:bg-surface sm:shadow-xl
                `}
            >
                <div
                    className={`
                        shrink-0 w-full max-w-2xl mx-auto px-6 pt-5 flex items-start justify-between gap-4
                        sm:max-w-none sm:h-16 sm:pt-0 sm:items-center sm:border-b sm:border-border
                    `}
                >
                    <p className="sm:hidden pt-1 text-base text-accent line-clamp-2 wrap-break-word">
                        {question}
                    </p>

                    <span className="hidden sm:inline font-bold">
                        Answer
                    </span>

                    <button aria-label="Close answer" className="btn btn-ghost h-9 w-9 px-0 shrink-0" onClick={onClose}>
                        ✕
                    </button>
                </div>

                {/* The scrollbar is hidden, like the lesson's. */}
                <div className="overflow-y-auto sm:flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="w-full max-w-2xl mx-auto px-6 pt-3 pb-6 flex flex-col gap-5 sm:max-w-none sm:py-8">
                        <p className="hidden sm:block text-base text-accent border-l-2 border-border pl-3 wrap-break-word">
                            {question}
                        </p>

                        {/* Same size as the lesson text. */}
                        <p className="text-[17px] sm:text-lg leading-relaxed wrap-break-word">
                            {answer}
                        </p>
                    </div>
                </div>
            </aside>
        </>
    )
}
