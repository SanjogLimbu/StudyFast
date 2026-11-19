import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import FlashcardTask from "@/components/flashcardTask"

//

const card = {
    id: 1,
    front: "What is the capital of France?",
    back: "Paris"
}

//

function renderCard(cardState: string, ready = true) {
    const onReveal = vi.fn()
    const onReview = vi.fn()

    render(
        <FlashcardTask
            card={card}
            cardState={cardState}
            onReveal={onReveal}
            onReview={onReview}
            error=""
            ready={ready}
            setError={vi.fn()}
        />
    )

    return { onReveal, onReview }
}

afterEach(cleanup)

//

describe("flashcardTask.FlashcardTask", () => {

    it("Only the front is shown before the answer is revealed.", () => {
        renderCard("hidden")

        expect(screen.queryByText(card.front)).not.toBeNull()
        expect(screen.queryByText(card.back)).toBeNull()
        expect(screen.queryByRole("button", { name: "Forgot" })).toBeNull()
        expect(screen.queryByRole("button", { name: "Remembered" })).toBeNull()
    })


    it("Show Answer calls onReveal.", () => {
        const { onReveal } = renderCard("hidden")

        fireEvent.click(screen.getByRole("button", { name: "Show Answer" }))
        expect(onReveal).toHaveBeenCalledTimes(1)
    })


    it("The back and the review buttons are shown after the answer is revealed.", () => {
        renderCard("shown")

        expect(screen.queryByText(card.back)).not.toBeNull()
        expect(screen.queryByText(card.front)).toBeNull()
        expect(screen.queryByRole("button", { name: "Show Answer" })).toBeNull()
        expect(screen.queryByRole("button", { name: "Forgot" })).not.toBeNull()
        expect(screen.queryByRole("button", { name: "Remembered" })).not.toBeNull()
    })


    it("Forgot reviews the card as again and Remembered as good.", () => {
        const { onReview } = renderCard("shown")

        fireEvent.click(screen.getByRole("button", { name: "Forgot" }))
        expect(onReview).toHaveBeenLastCalledWith("again")

        fireEvent.click(screen.getByRole("button", { name: "Remembered" }))
        expect(onReview).toHaveBeenLastCalledWith("good")
    })


    it("Review buttons are disabled while a request is in flight.", () => {
        const { onReview } = renderCard("shown", false)

        const forgot = screen.getByRole<HTMLButtonElement>("button", { name: "Forgot" })
        const remembered = screen.getByRole<HTMLButtonElement>("button", { name: "Remembered" })

        expect(forgot.disabled).toBe(true)
        expect(remembered.disabled).toBe(true)

        fireEvent.click(forgot)
        fireEvent.click(remembered)
        expect(onReview).not.toHaveBeenCalled()
    })

})
