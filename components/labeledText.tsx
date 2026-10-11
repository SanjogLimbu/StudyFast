import katex from "katex"
import "katex/dist/katex.min.css"

//

export default function LabeledText({ text }: { text: string }) {
    // Matches [[native script|romanization]], \$ (a literal dollar sign), $$display maths$$ and $inline maths$.
    // Inline maths can't start or end with a space or be followed by a digit, so "$5 and $10" stays as text.
    const regex = /\[\[([^|\]]+)\|([^\]]+)\]\]|\\\$|\$\$([^$]+)\$\$|\$([^\s$](?:[^$]*[^\s$])?)\$(?!\d)/g

    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match

    while ((match = regex.exec(text)) !== null) {
        // Add normal text before the special word
        parts.push(
            text.slice(lastIndex, match.index)
        )

        const nativeText = match[1]
        const romanization = match[2]
        const maths = match[3] ?? match[4]

        if (maths !== undefined) {
            parts.push(
                <span
                    key={match.index}
                    dangerouslySetInnerHTML={{
                        __html: katex.renderToString(maths, {
                            displayMode: match[3] !== undefined,
                            throwOnError: false
                        })
                    }}
                />
            )
        }
        else if (nativeText !== undefined) {
            parts.push(
                <ruby key={match.index}>
                    {romanization}
                    <rt className="text-sm">
                        {nativeText}
                    </rt>
                </ruby>
            )
        }
        else {
            parts.push("$")
        }


        lastIndex = regex.lastIndex
    }


    // Add whatever normal text remains afterwards
    parts.push(
        text.slice(lastIndex)
    )

    return (
        <span className="whitespace-pre-wrap">
            {parts}
        </span>
    )
}
