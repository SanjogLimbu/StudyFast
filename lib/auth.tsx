import "server-only"

import { cookies } from "next/headers"

//

type User = {
  id: number
  email: string
}

//

export async function getUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get("access_token")?.value

  // Browser doesn't have an access_token cookie.
  if (!token) {
    return 
  }


  const response = await fetch(
    `${process.env.API_URL}/auth/account`,
    {
      headers: {
        Cookie: `access_token=${token}`,
      },
      cache: "no-store",
    }
  )

  
  // Cookie exists, but the session is invalid/expired
  if (response.status === 401) {
    return
  }


  if (!response.ok) {
    return
  }


  return response.json()
}

