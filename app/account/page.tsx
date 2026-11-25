import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import AccountClient from "./AccountClient"

//

export default async function AccountPage() {
    const cookieStore = await cookies()

    const response = await fetch(
        `${process.env.API_URL}/subscription/status`,
        {
            headers: {
                Cookie: cookieStore.toString()
            },
            cache: "no-store"
        }
    )

    if (response.status === 401) {
        redirect("/login")
    }

    if (!response.ok) {
        throw new Error("Unable to retrieve subscription")
    }

    const subscription = await response.json()

    return (
        <AccountClient subscription={subscription} />
    )
}
