type Props = {
    message: string
    onOkay: () => void
}

//

export default function NoticePrompt({
    message,
    onOkay
}: Props) {
    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50 p-4"
        >
            <div
                className="card p-6 w-full max-w-sm flex flex-col gap-6"
                onClick={(event) => event.stopPropagation()}
            >
                <p className="text-center text-lg font-bold wrap-break-word">
                    {message}
                </p>

                <div className="flex gap-3">
                    <button onClick={onOkay} className="btn btn-ghost flex-1">
                        Okay
                    </button>
                </div>
            </div>
        </div>
    )
}
