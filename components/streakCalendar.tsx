import { Fragment } from "react"

//

const WEEKS = 53
const DAY_MS = 24 * 60 * 60 * 1000

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""]

//

function describeDay(date: string, active: boolean) {
    const day = new Date(date)

    return `${active ? "Active" : "No activity"} on ${day.getUTCDate()} ${MONTHS[day.getUTCMonth()]} ${day.getUTCFullYear()}`
}

//

// days lists the UTC dates ("YYYY-MM-DD") a question task was completed.
export default function StreakCalendar({ days }: { days: string[] }) {
    const active = new Set(days)

    const now = new Date()
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())

    // Starts on a Sunday, so every column is a full week except the current one.
    const start = today - (new Date(today).getUTCDay() + (WEEKS - 1) * 7) * DAY_MS
    const weeks: string[][] = []

    for (let time = start; time <= today; time += DAY_MS) {
        if (new Date(time).getUTCDay() === 0) {
            weeks.push([])
        }


        weeks[weeks.length - 1].push(new Date(time).toISOString().slice(0, 10))
    }


    const months = weeks.map((week) => new Date(week[0]).getUTCMonth())

    let total = 0
    let longest = 0
    let current = 0
    let run = 0


    // Counted from the earliest day given, not just the squares shown, so a streak can be longer than a year.
    const first = Math.min(start, ...days.map((day) => Date.parse(day)))

    for (let time = first; time <= today; time += DAY_MS) {
        if (active.has(new Date(time).toISOString().slice(0, 10))) {
            run += 1

            // Only days on the grid count towards "in the last year".
            if (time >= start) {
                total += 1
            }
        } 
        else {
            run = 0
        }


        longest = Math.max(longest, run)

        
        // Today only breaks the streak once it ends with no activity.
        if (run > 0 || time < today) {
            current = run
        }
    }


    return (
        <div className="card w-fit max-w-full p-7 flex flex-col gap-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1">
                <p className="text-3xl font-extrabold tabular-nums">
                    {current}{" "}

                    <span className="text-base font-bold text-accent">
                        Day streak
                    </span>
                </p>

                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-accent">
                    <p>
                        Highest streak{" "}

                        <span className="font-bold text-foreground">
                            {longest}
                        </span>
                    </p>

                    <p>
                        Active days{" "}

                        <span className="font-bold text-foreground">
                            {total}
                        </span>
                    </p>
                </div>
            </div>

            <div className="flex gap-2 text-[10px] leading-2.75 text-accent">
                <div className="grid grid-rows-[12px_repeat(7,11px)] gap-0.75">
                    <span />

                    {WEEKDAYS.map((weekday, i) => (
                        <span key={i}>
                            {weekday}
                        </span>
                    ))}
                </div>


                {/* Reversed so that a narrow screen starts scrolled to the most recent week. */}
                <div className="flex flex-row-reverse overflow-x-auto pb-1">
                    <div className="grid grid-flow-col grid-rows-[12px_repeat(7,11px)] auto-cols-2.75 gap-0.75 shrink-0">
                        {weeks.map((week, i) => (
                            <Fragment key={week[0]}>

                                {/* A month is labelled once it spans two columns, so labels never overlap or get cut off. */}
                                <span className="whitespace-nowrap">
                                    {months[i] !== months[i - 1] && months[i] === months[i + 1] ? MONTHS[months[i]] : ""}
                                </span>

                                {week.map((date) => (
                                    <div
                                        key={date}
                                        title={describeDay(date, active.has(date))}
                                        className={`rounded-[3px] ${active.has(date) ? "bg-primary" : "bg-border"}`}
                                    />
                                ))}
                            </Fragment>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

