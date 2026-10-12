import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import QuestionTask, { type QuestionResponse } from "@/components/questionTask"

//

const question = {
    id: 1,
    question: "What is the capital of France?",
    options: ["London", "Paris", "Berlin", "Madrid"],
    difficulty: "easy"
}

//

function renderQuestion(selectedAnswer = "", questionResponse?: QuestionResponse) {
    const onAnswer = vi.fn()

    render(
        <QuestionTask
            question={question}
            selectedAnswer={selectedAnswer}
            questionResponse={questionResponse}
            onAnswer={onAnswer}
        />
    )

    return { onAnswer }
}


function optionButton(option: string) {
    return screen.getByRole("button", { name: new RegExp(option) })
}


afterEach(cleanup)

//

describe("questionTask.QuestionTask", () => {

    it("The question and every option are shown.", () => {
        renderQuestion()

        expect(screen.queryByText(question.question)).not.toBeNull()
        expect(screen.getAllByRole("button")).toHaveLength(4)

        for (const option of question.options) {
            expect(screen.queryByText(option)).not.toBeNull()
        }
    })


    it("Clicking an option calls onAnswer with that option.", () => {
        const { onAnswer } = renderQuestion()

        fireEvent.click(optionButton("Berlin"))
        expect(onAnswer).toHaveBeenCalledTimes(1)
        expect(onAnswer).toHaveBeenCalledWith("Berlin")
    })


    it("No option is highlighted before answering.", () => {
        renderQuestion()

        for (const option of question.options) {
            expect(optionButton(option).className).not.toContain("border-success!")
            expect(optionButton(option).className).not.toContain("border-danger!")
        }
    })


    it("Only the correct option is highlighted after a correct answer.", () => {
        renderQuestion("Paris", { correct: true, answer: "Paris", mastery: 4 })

        expect(optionButton("Paris").className).toContain("border-success!")
        expect(optionButton("Paris").className).not.toContain("border-danger!")

        for (const option of ["London", "Berlin", "Madrid"]) {
            expect(optionButton(option).className).not.toContain("border-success!")
            expect(optionButton(option).className).not.toContain("border-danger!")
        }
    })


    it("A wrong pick is marked and the correct option is highlighted.", () => {
        renderQuestion("London", { correct: false, answer: "Paris", mastery: 0 })

        expect(optionButton("London").className).toContain("border-danger!")
        expect(optionButton("Paris").className).toContain("border-success!")

        for (const option of ["Berlin", "Madrid"]) {
            expect(optionButton(option).className).not.toContain("border-success!")
            expect(optionButton(option).className).not.toContain("border-danger!")
        }
    })

})
