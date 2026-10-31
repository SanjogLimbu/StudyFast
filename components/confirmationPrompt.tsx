type Props = {
    message: string
    yesText?: string
    onYes: () => void
    onNo: () => void
}

//

export default function ConfirmationPrompt({
    message,
    yesText = "Delete",
    onYes,
    onNo
}: Props) {
    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50 p-4"
            onClick={onNo}
        >
            <div
                className="card p-6 w-full max-w-sm flex flex-col gap-6"
                onClick={(event) => event.stopPropagation()}
            >
                <p className="text-center text-lg font-bold wrap-break-word">
                    {message}
                </p>

                <div className="flex gap-3">
                    <button onClick={onNo} className="btn btn-ghost flex-1">
                        Cancel
                    </button>

                    <button onClick={onYes} className="btn btn-danger flex-1">
                        {yesText}
                    </button>
                </div>
            </div>
        </div>
    )
}
