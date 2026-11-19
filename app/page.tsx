import { getUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import LandingPage from "./PageClient"
import type { Metadata } from "next"

//

export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

export default async function Root() {
  // A logged in user does not need to sign up or login so we check if they are logged in.
  // If they are logged in, redirect them to home page.
  const user = await getUser()

  if (user) {
    redirect("/home")
  }


  return (
    <>
      <LandingPage />
    </>
  )
}

