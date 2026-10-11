import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
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

// A | ends a table cell, so the one inside [[native script|romanization]] is escaped.
function escapeAnnotations(lesson: string) {
    return lesson.replace(/\[\[([^|\]]+?)\\?\|([^\]]+)\]\]/g, "[[$1\\|$2]]")
}

//

export default function Lesson({
    lesson,
    onNext
}: {
    lesson: string
    onNext: () => void
}) {
    return (
        <div className="flex flex-col gap-6 items-center w-full min-h-0">
            {/* The card clips the scrollbar of the div inside it, which keeps its corners rounded. */}
            <div className="card w-full flex flex-col overflow-hidden">
                <div className="p-8 overflow-y-auto">
                    <div className="lesson">
                        <Markdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeRuby, rehypeKatex]}
                        >
                            {escapeAnnotations(lesson)}
                        </Markdown>
                    </div>
                </div>
            </div>

            <button className="btn btn-primary w-48 shrink-0" onClick={onNext}>
                Next
            </button>
        </div>
    )
}
