import { parseGraph } from "@/lib/graph"

//

const WIDTH = 320
const HEIGHT = 240

// The plot leaves room for the axis numbers on its left and below it.
const LEFT = 38
const TOP = 10
const PLOT_WIDTH = WIDTH - LEFT - 12
const PLOT_HEIGHT = HEIGHT - TOP - 24

const SAMPLES = 240

// Roughly how wide one letter of a point's label is, to keep the labels off each other.
const LETTER_WIDTH = 6.5
const COLORS = ["var(--primary)", "var(--danger)", "var(--success)"]

//

// Round numbers to label an axis with, about six across its range.
function ticks([low, high]: [number, number]) {
    const rough = (high - low) / 6
    const magnitude = 10 ** Math.floor(Math.log10(rough))
    const step = [1, 2, 5, 10].map((multiple) => multiple * magnitude).find((size) => size >= rough)!
    const values = []

    for (let i = Math.ceil(low / step); i <= Math.floor(high / step); i++) {
        // Rounded to hide floating point error, such as 0.30000000000000004.
        values.push(Number((i * step).toPrecision(12)))
    }


    return values
}


function describe(value: number) {
    return String(value).replace("-", "−")
}

//

// source is the text of a graph block in a lesson, which lib/graph reads.
export default function Graph({ source }: { source: string }) {
    const graph = parseGraph(source)

    if (!graph) {
        return null
    }


    const [xMin, xMax] = graph.x
    const xs = Array.from({ length: SAMPLES + 1 }, (_, i) => xMin + (xMax - xMin) * i / SAMPLES)
    const curves = graph.functions.map((curve) => xs.map(curve.evaluate))

    let yRange = graph.y

    // Without a y range, the graph fits everything drawn on it, and always shows the x-axis.
    if (!yRange) {
        const sorted = curves.flat().filter(Number.isFinite).sort((a, b) => a - b)
        const tenth = sorted[Math.floor(sorted.length * 0.1)]
        const ninetieth = sorted[Math.floor(sorted.length * 0.9)]
        let fitted = [sorted[0], sorted[sorted.length - 1]]

        // Next to an asymptote a curve shoots far past the rest of the graph, so only its ordinary part is fitted.
        if (fitted[1] - fitted[0] > 5 * (ninetieth - tenth)) {
            fitted = [2 * tenth - ninetieth, 2 * ninetieth - tenth]
        }


        const level = graph.lines.filter((line) => line.axis == "y").map((line) => line.value)
        const values = [0, ...fitted, ...level, ...graph.points.map((point) => point.y)].filter(Number.isFinite)
        const low = Math.min(...values)
        const high = Math.max(...values)
        const margin = (high - low) * 0.1 || 1

        yRange = [low - margin, high + margin]
    }


    const [yMin, yMax] = yRange
    const toX = (x: number) => (x - xMin) / (xMax - xMin) * PLOT_WIDTH
    const toY = (y: number) => (yMax - y) / (yMax - yMin) * PLOT_HEIGHT

    const paths = curves.map((values) => {
        let path = ""

        values.forEach((value, i) => {
            const previous = values[i - 1]

            // A new stroke starts after a gap in the function, and where it jumps across the plot at an asymptote.
            const joined = Number.isFinite(previous) && !(previous > yMax && value < yMin) && !(previous < yMin && value > yMax)

            if (Number.isFinite(value)) {
                // Kept near the plot, so a steep curve does not produce huge coordinates.
                const y = Math.max(yMin - (yMax - yMin), Math.min(yMax + (yMax - yMin), value))

                path += `${joined ? "L" : "M"}${toX(xs[i]).toFixed(1)} ${toY(y).toFixed(1)}`
            }
        })


        return path
    })


    const dots = graph.points.map((point) => ({ x: LEFT + toX(point.x), y: TOP + toY(point.y), text: point.label }))

    // Each box is the left, top, right and bottom of something a label must not cover: every point, and the labels placed so far.
    const boxes = dots.map((dot) => [dot.x - 5, dot.y - 5, dot.x + 5, dot.y + 5])

    const labels = dots.map(({ x, y, text }) => {
        const width = text.length * LETTER_WIDTH

        // Up and to the right of the point is tried first, then the other three corners.
        const corners = [[x + 7, y - 19], [x + 7, y + 6], [x - 7 - width, y - 19], [x - 7 - width, y + 6]].map(
            ([left, top]) => [left, top, left + width, top + 14]
        )

        // A corner is free if the label stays on the plot and off every box.
        const box = corners.find((corner) => (
            corner[0] >= LEFT && corner[2] <= LEFT + PLOT_WIDTH && corner[1] >= TOP && corner[3] <= TOP + PLOT_HEIGHT
            && !boxes.some((other) => corner[0] < other[2] && corner[2] > other[0] && corner[1] < other[3] && corner[3] > other[1])
        )) ?? corners[0]

        boxes.push(box)

        return { x, y, box, text }
    })


    return (
        <figure className="w-full max-w-md self-center flex flex-col gap-2">
            <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                role="img"
                aria-label={`Graph of ${graph.functions.map((curve) => curve.text).join(" and ")}`}
                fontSize={11}
            >
                {ticks(graph.x).map((value) => (
                    <g key={value}>
                        <line
                            x1={LEFT + toX(value)}
                            x2={LEFT + toX(value)}
                            y1={TOP}
                            y2={TOP + PLOT_HEIGHT}
                            className={value == 0 ? "stroke-accent" : "stroke-border"}
                        />

                        <text x={LEFT + toX(value)} y={TOP + PLOT_HEIGHT + 15} textAnchor="middle" className="fill-accent">
                            {describe(value)}
                        </text>
                    </g>
                ))}

                {ticks(yRange).map((value) => (
                    <g key={value}>
                        <line
                            x1={LEFT}
                            x2={LEFT + PLOT_WIDTH}
                            y1={TOP + toY(value)}
                            y2={TOP + toY(value)}
                            className={value == 0 ? "stroke-accent" : "stroke-border"}
                        />

                        <text x={LEFT - 6} y={TOP + toY(value) + 4} textAnchor="end" className="fill-accent">
                            {describe(value)}
                        </text>
                    </g>
                ))}


                {/* The inner svg clips the curves to the plot. */}
                <svg x={LEFT} y={TOP} width={PLOT_WIDTH} height={PLOT_HEIGHT}>
                    {graph.lines.map((line, i) => (
                        <line
                            key={i}
                            x1={line.axis == "x" ? toX(line.value) : 0}
                            x2={line.axis == "x" ? toX(line.value) : PLOT_WIDTH}
                            y1={line.axis == "x" ? 0 : toY(line.value)}
                            y2={line.axis == "x" ? PLOT_HEIGHT : toY(line.value)}
                            strokeDasharray="5 4"
                            strokeWidth={1.5}
                            className="stroke-accent"
                        />
                    ))}

                    {paths.map((path, i) => (
                        <path
                            key={i}
                            d={path}
                            fill="none"
                            stroke={COLORS[i % COLORS.length]}
                            strokeWidth={2.5}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                    ))}
                </svg>


                {labels.map((label, i) => (
                    <g key={i}>
                        <circle cx={label.x} cy={label.y} r={4} strokeWidth={1.5} className="fill-foreground stroke-surface" />

                        {/* The outline keeps the label readable where it crosses a curve or a grid line. */}
                        <text
                            x={label.box[0]}
                            y={label.box[3] - 3}
                            fontWeight={700}
                            strokeWidth={3}
                            paintOrder="stroke"
                            className="fill-foreground stroke-surface"
                        >
                            {label.text}
                        </text>
                    </g>
                ))}
            </svg>

            {/* One curve is named by the lesson, so only several need telling apart. */}
            {graph.functions.length > 1 && (
                <figcaption className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-accent">
                    {graph.functions.map((curve, i) => (
                        <span key={i} className="flex items-center gap-1.5">
                            <span className="w-4 h-0.5" style={{ backgroundColor: COLORS[i % COLORS.length] }} />

                            {curve.text}
                        </span>
                    ))}
                </figcaption>
            )}
        </figure>
    )
}
