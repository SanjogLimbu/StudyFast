import LabeledText from "@/components/labeledText"

//

const OPTION_LETTERS = ["A", "B", "C", "D"]

export type QuestionData = {
    id: number,
    question: string,
    options: string[],
    difficulty: string
}

export type QuestionResponse = {
    correct: boolean,
    answer: string,
    mastery: number,
    finished?: boolean
}

//

export default function QuestionTask({
    question,
    selectedAnswer,
    questionResponse,
    onAnswer
}: {
    question: QuestionData
    selectedAnswer: string
    questionResponse?: QuestionResponse
    onAnswer: (answer: string) => void
}) {
    return (
        <div className="w-full">
            {/* Question */}
            <div className="min-h-32 flex items-center justify-center text-center text-2xl font-semibold leading-snug">
                <LabeledText text={question.question} />
            </div>


            {/* Answers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
                {question.options.map((option, index) => {
                    const isAnswer = questionResponse?.answer == option
                    const choseWrong = option == selectedAnswer && !questionResponse?.correct

                    return (
                        <button
                            key={index}
                            onClick={() => onAnswer(option)}
                            className={`
                                card min-h-16 px-4 py-3 flex items-center gap-4 text-left text-lg cursor-pointer
                                transition-colors duration-150 hover:border-primary hover:bg-primary-soft/40
                                ${isAnswer ? "border-success! bg-green-50!" : choseWrong ? "border-danger! bg-red-50!" : ""}
                            `}
                        >
                            <span className={`
                                w-7 h-7 shrink-0 rounded-md border flex items-center justify-center text-sm font-semibold
                                ${isAnswer ? "bg-success border-success text-white" : choseWrong ? "bg-danger border-danger text-white" : "border-border text-accent"}
                            `}>
                                {OPTION_LETTERS[index]}
                            </span>

                            <LabeledText text={option} />
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
