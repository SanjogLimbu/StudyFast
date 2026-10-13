type Evaluate = (x: number) => number

export type Graph = {
    functions: { text: string, evaluate: Evaluate }[]
    lines: { axis: "x" | "y", value: number }[]
    points: { x: number, y: number, label: string }[]
    x: [number, number]
    y?: [number, number]
}

//

const NUMBER = /^\d*\.?\d+$/

const FUNCTIONS = new Map<string, Evaluate>([
    ["sqrt", Math.sqrt],
    ["cbrt", Math.cbrt],
    ["abs", Math.abs],
    ["sin", Math.sin],
    ["cos", Math.cos],
    ["tan", Math.tan],
    ["ln", Math.log],
    ["log", Math.log10],
    ["exp", Math.exp]
])

const CONSTANTS = new Map([
    ["pi", Math.PI],
    ["e", Math.E]
])

//

// Turns an expression such as 2x^2 - 3(x + 1) into a function of x.
// The model writes it, so it is parsed here and never run as code.
export function compile(expression: string): Evaluate {
    const tokens = expression.match(/\d*\.?\d+|[a-z]+|\S/g) ?? []
    let position = 0

    function expect(token: string) {
        if (tokens[position++] != token) {
            throw new Error(`Expected ${token} in ${expression}`)
        }
    }


    function primary(): Evaluate {
        const token = tokens[position++] ?? ""
        const call = FUNCTIONS.get(token)
        const constant = CONSTANTS.get(token)

        if (call || token == "(") {
            if (call) {
                expect("(")
            }


            const inner = sum()
            expect(")")

            return call ? (x) => call(inner(x)) : inner
        }
        else if (token == "x") {
            return (x) => x
        }
        else if (constant !== undefined) {
            return () => constant
        }
        else if (NUMBER.test(token)) {
            return () => Number(token)
        }
        else {
            throw new Error(`Unexpected ${token} in ${expression}`)
        }
    }


    function power(): Evaluate {
        const base = primary()

        if (tokens[position] != "^") {
            return base
        }


        position++
        const exponent = negation()

        return (x) => base(x) ** exponent(x)
    }


    // Binds looser than a power, so -x^2 is -(x^2).
    function negation(): Evaluate {
        if (tokens[position] != "-") {
            return power()
        }


        position++
        const operand = negation()

        return (x) => -operand(x)
    }


    function product(): Evaluate {
        let left = negation()

        while (position < tokens.length) {
            const token = tokens[position]
            const previous = left

            if (token == "*" || token == "/") {
                position++
                const right = negation()

                left = token == "*" ? (x) => previous(x) * right(x) : (x) => previous(x) / right(x)
            }
            // A number, name or bracket straight after a value multiplies it, as in 2x or 3(x + 1).
            else if (/^[\d.a-z(]/.test(token)) {
                const right = power()

                left = (x) => previous(x) * right(x)
            }
            else {
                break
            }
        }


        return left
    }


    function sum(): Evaluate {
        let left = product()

        while (tokens[position] == "+" || tokens[position] == "-") {
            const subtract = tokens[position++] == "-"
            const previous = left
            const right = product()

            left = subtract ? (x) => previous(x) - right(x) : (x) => previous(x) + right(x)
        }


        return left
    }


    const result = sum()

    if (position < tokens.length) {
        throw new Error(`Unexpected ${tokens[position]} in ${expression}`)
    }


    return result
}


// Reads the lines of a graph block in a lesson.
// Returns nothing if any line is not understood, so a wrong graph is never drawn.
export function parseGraph(source: string): Graph | undefined {
    const graph: Graph = { functions: [], lines: [], points: [], x: [-10, 10] }

    // A number can be written as an expression, such as -1/2 or 2pi.
    function number(text: string) {
        const value = compile(text)(NaN)

        if (!Number.isFinite(value)) {
            throw new Error(`Not a number: ${text}`)
        }


        return value
    }


    try {
        for (const line of source.split("\n")) {
            const text = line.trim()
            const curve = text.match(/^y\s*=\s*(.+)$/)

            // A vertical line is dashed even without the word, because x = 2 cannot be a curve.
            const dashed = text.match(/^dashed\s+([xy])\s*=\s*(.+)$/) ?? text.match(/^(x)\s*=\s*(.+)$/)
            const point = text.match(/^point\s*\(([^,()]+),([^,()]+)\)\s*(.*)$/)
            const range = text.match(/^([xy])\s+from\s+(.+)\s+to\s+(.+)$/)

            if (dashed) {
                graph.lines.push({ axis: dashed[1] as "x" | "y", value: number(dashed[2]) })
            }
            else if (curve) {
                graph.functions.push({ text, evaluate: compile(curve[1]) })
            }
            else if (point) {
                graph.points.push({ x: number(point[1]), y: number(point[2]), label: point[3] })
            }
            else if (range) {
                graph[range[1] as "x" | "y"] = [number(range[2]), number(range[3])]
            }
            else if (text) {
                throw new Error(`Unknown line: ${text}`)
            }
        }


        if (graph.x[0] >= graph.x[1] || (graph.y && graph.y[0] >= graph.y[1])) {
            throw new Error("A range ends before it starts")
        }
    }
    catch {
        return undefined
    }


    return graph
}
