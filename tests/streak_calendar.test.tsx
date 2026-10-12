import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import StreakCalendar from "@/components/streakCalendar"

//

const TODAY = Date.UTC(2026, 9, 12)
const DAY_MS = 24 * 60 * 60 * 1000

//

function daysAgo(count: number) {
    return new Date(TODAY - count * DAY_MS).toISOString().slice(0, 10)
}


function currentStreak() {
    return parseInt(screen.getByText("day streak").parentElement?.textContent ?? "")
}

//

beforeEach(() => {
    vi.setSystemTime(TODAY + DAY_MS / 2)
})


afterEach(() => {
    cleanup()
    vi.useRealTimers()
})

//

describe("streakCalendar.StreakCalendar", () => {

    it("No activity shows a zero streak.", () => {
        render(<StreakCalendar days={[]} />)

        expect(currentStreak()).toBe(0)
        expect(screen.queryByText("0 days")).not.toBeNull()
        expect(screen.queryByText("0 active days in the last year")).not.toBeNull()
        expect(screen.queryAllByTitle(/^Active on/)).toHaveLength(0)
    })


    it("Consecutive days up to today count as the current streak.", () => {
        render(<StreakCalendar days={[daysAgo(2), daysAgo(1), daysAgo(0)]} />)

        expect(currentStreak()).toBe(3)
        expect(screen.queryByText("3 days")).not.toBeNull()
        expect(screen.queryByText("3 active days in the last year")).not.toBeNull()
    })


    it("The streak survives today having no activity yet.", () => {
        render(<StreakCalendar days={[daysAgo(2), daysAgo(1)]} />)

        expect(currentStreak()).toBe(2)
    })


    it("A missed day resets the current streak but not the longest.", () => {
        render(<StreakCalendar days={[daysAgo(6), daysAgo(5), daysAgo(4), daysAgo(0)]} />)

        expect(currentStreak()).toBe(1)
        expect(screen.queryByText("3 days")).not.toBeNull()
        expect(screen.queryByText("4 active days in the last year")).not.toBeNull()
    })


    it("Days before the grid extend the streak but not the yearly total.", () => {
        const days = Array.from({ length: 400 }, (_, i) => daysAgo(i))

        render(<StreakCalendar days={days} />)

        expect(currentStreak()).toBe(400)
        expect(screen.queryByText("366 active days in the last year")).not.toBeNull()
    })


    it("Only active days are highlighted.", () => {
        render(<StreakCalendar days={[daysAgo(0)]} />)

        expect(screen.getByTitle("Active on 12 Oct 2026").className).toContain("bg-primary")
        expect(screen.getByTitle("No activity on 11 Oct 2026").className).toContain("bg-border")
        expect(screen.queryByText("1 day")).not.toBeNull()
        expect(screen.queryByText("1 active day in the last year")).not.toBeNull()
    })


    it("The grid covers 53 weeks, starting on a Sunday and ending today.", () => {
        render(<StreakCalendar days={[]} />)

        const squares = screen.getAllByTitle(/ on /)

        // 52 full weeks, then Sunday and Monday of the current one.
        expect(squares).toHaveLength(52 * 7 + 2)
        expect(squares[0].title).toBe("No activity on 12 Oct 2025")
        expect(squares[squares.length - 1].title).toBe("No activity on 12 Oct 2026")
    })

})
