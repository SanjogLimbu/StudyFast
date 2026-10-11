import Markdown from "react-markdown"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"

//

type Node = {
    type: string
    tagName?: string
    value?: string
    properties?: Record<string, unknown>
    children?: Node[]
}

//

// Turns [[native script|romanization]] into ruby text, as LabeledText does outside of Markdown.
function addRuby(node: Node) {
    // Code and maths are left alone.
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

        for (const match of text.matchAll(/\[\[([^|\]]+)\|([^\]]+)\]\]/g)) {
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

//

export default function Lesson({
    lesson,
    onNext
}: {
    lesson: string
    onNext: () => void
}) {
    return (
        <div className="flex flex-col gap-6 items-center w-full">
            <div className="card w-full flex flex-col gap-4 p-8">
                <div className="lesson">
                    <Markdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeRuby, rehypeKatex]}
                    >
                        {lesson}
                    </Markdown>
                </div>
            </div>

            <button className="btn btn-primary w-48" onClick={onNext}>
                Next
            </button>
        </div>
    )
}
