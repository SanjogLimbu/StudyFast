import type { ComponentProps } from "react"
import Markdown, { type ExtraProps } from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"
import Graph from "@/components/graph"

//

type Node = {
    type: string
    tagName?: string
    value?: string
    properties?: Record<string, unknown>
    children?: Node[]
    data?: { hProperties?: Record<string, unknown> }
    position?: { start: { offset?: number } }
}

//

// remark-math only gives $$...$$ its own line when each $$ is on a separate line, so a one-line $$...$$ is marked as display math here.
function addDisplayMath(node: Node, file: { value: unknown }) {
    if (node.type == "inlineMath" && String(file.value).startsWith("$$", node.position?.start.offset)) {
        node.data!.hProperties!.className = ["language-math", "math-display"]
    }


    node.children?.forEach((child) => addDisplayMath(child, file))
}


const remarkDisplayMath = () => addDisplayMath

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

// A code block in the "graph" language is drawn as a graph instead of shown as code.
function CodeBlock({ node, children }: ComponentProps<"pre"> & ExtraProps) {
    const code = node?.children[0]

    if (code?.type == "element" && String(code.properties.className).includes("language-graph")) {
        const text = code.children[0]

        return <Graph source={text?.type == "text" ? text.value : ""} />
    }


    return <pre>{children}</pre>
}

//

export default function Lesson({ lesson }: { lesson: string }) {
    return (
        <div className="lesson">
            <Markdown
                remarkPlugins={[remarkGfm, remarkMath, remarkDisplayMath]}
                rehypePlugins={[rehypeRuby, rehypeKatex]}
                components={{ pre: CodeBlock }}
            >
                {escapeAnnotations(lesson)}
            </Markdown>
        </div>
    )
}
