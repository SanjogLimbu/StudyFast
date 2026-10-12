import { mkdirSync, writeFileSync } from "node:fs"
import { render } from "@react-email/components"
import VerifyEmail from "@/components/emails/verifyEmail"

//

const OUTPUT_PATH = "fastapi/api/emails"

//

// FastAPI can't render React, so emails are exported to HTML with placeholders that FastAPI fills in.
async function exportEmails() {
    mkdirSync(OUTPUT_PATH, { recursive: true })

    writeFileSync(
        `${OUTPUT_PATH}/verify_email.html`,
        await render(<VerifyEmail code="{{code}}" />)
    )
}

exportEmails()
