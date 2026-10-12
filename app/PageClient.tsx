"use client"

import Link from "next/link"
import Title from "@/components/title"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { validatePassword, validateEmail } from "@/lib/credential_validation"
 
//

export default function LandingPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [loading, setLoading] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState("")
  const [codeError, setCodeError] = useState("")

  const errorOccured = emailError != "" || passwordError != ""
  const canSubmit = !errorOccured
   && password.length >= 5 && password.length <= 128
   && email.length > 0 && email.length <= 320

  // The password is only sent with the code, as the account has no password until its email is verified.
  async function createAccount(event: React.SubmitEvent, email: string) {
    event.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(
        `/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        }
      )


      const status = response.status

      if (response.ok) {
        setCodeSent(true)
      }
      else if (status == 409) {
        setEmail("")
        setEmailError("Email is already being used.")
      }
      else {
        setEmail("")
        setPassword("")
        setPasswordError("A server error occured.")
      }

      
    } 
    catch {
      setEmail("")
      setPassword("")
      setPasswordError("A server error occured.")
    }


    setLoading(false)
  }


  async function verifyCode(event: React.SubmitEvent) {
    event.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(
        `/api/auth/verify-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            code,
            password,
          }),
        }
      )


      if (response.ok) {
        router.push("/home")
      }
      else if (response.status == 409) {
        const data = await response.json()

        setCode("")
        setCodeError(data.detail)
      }
      else {
        setCode("")
        setCodeError("A server error occured.")
      }


    }
    catch {
      setCode("")
      setCodeError("A server error occured.")
    }


    setLoading(false)
  }


  function updateEmail(event: React.ChangeEvent<HTMLInputElement>) {
    const newEmail = event.target.value 
    setEmail(newEmail)
    setEmailError(validateEmail(newEmail))
  }


  function updatePassword(event: React.ChangeEvent<HTMLInputElement>) {
    const newPassword = event.target.value 
    setPassword(newPassword)
    setPasswordError(validatePassword(newPassword))
  }


  function updateCode(event: React.ChangeEvent<HTMLInputElement>) {
    setCode(event.target.value.trim().toUpperCase())
    setCodeError("")
  }


  // Going back keeps the email and password, so submitting again sends a new code.
  function leaveCodeStep() {
    setCodeSent(false)
    setCode("")
    setCodeError("")
  }


  if (codeSent) {
    return (
      <>
        <div className="flex flex-col md:flex-row justify-center items-center gap-10 md:gap-16 w-full min-h-screen p-6">
          <Title />

          <form
            className="card flex flex-col gap-3 w-full max-w-sm p-7"
            onSubmit={verifyCode}
          >
              <h2 className="text-2xl font-extrabold mb-1">
                Check your email
              </h2>

              <p className="text-sm text-accent break-words">
                Enter the code we sent to {email}.
              </p>

              <div className="flex flex-col gap-1.5 group">
                  <label
                    htmlFor="code"
                    className="text-sm font-bold text-accent group-focus-within:text-primary transition-colors"
                  >
                      Code
                  </label>

                  <input
                      id="code"
                      type="text"
                      autoComplete="one-time-code"
                      maxLength={8}
                      required
                      autoFocus
                      value={code}
                      onChange={updateCode}
                      className={`input ${codeError != "" ? "input-error" : ""}`}
                  />

                  <p className="text-xs text-danger min-h-4">
                    {codeError}
                  </p>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={code.length != 8 || loading}
              >
                  {loading ? "Verifying..." : "Verify"}
              </button>

              <button
                type="button"
                className="btn btn-ghost w-full"
                onClick={leaveCodeStep}
              >
                  Back
              </button>
          </form>
        </div>
      </>
    )
  }


  return (
    <>
      <div className="flex flex-col md:flex-row justify-center items-center gap-10 md:gap-16 w-full min-h-screen p-6">
        <Title />

        <form
          className="card flex flex-col gap-3 w-full max-w-sm p-7"
          onSubmit={(event) => createAccount(event, email)}
        >
            <h2 className="text-2xl font-extrabold mb-1">
              Create an account
            </h2>

            <div className="flex flex-col gap-1.5 group">
                <label 
                  htmlFor="email" 
                  className="text-sm font-bold text-accent group-focus-within:text-primary transition-colors"
                >
                    Email
                </label>

                <input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={updateEmail}
                    className={`input ${emailError != "" ? "input-error" : ""}`}
                />

                <p className="text-xs text-danger min-h-4">
                  {emailError}
                </p>
            </div>

            <div className="flex flex-col gap-1.5 group">
                <label 
                  htmlFor="password" 
                  className="text-sm font-bold text-accent group-focus-within:text-primary transition-colors"
                >
                    Password
                </label>

                <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={updatePassword}
                    className={`input ${passwordError != "" ? "input-error" : ""}`}
                />

                <p className="text-xs text-danger min-h-4">
                  {passwordError}
                </p>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={!canSubmit || loading}
            >
                {loading ? "Creating..." : "Create Account"}
            </button>

            <div className="flex items-center gap-3 my-1 text-accent">
              <div className="flex-1 border-t border-border" />

              <span className="text-xs font-bold">
                OR
              </span>

              <div className="flex-1 border-t border-border" />
            </div>

            <a href="/api/auth/google/login" type="button" className="btn btn-ghost w-full">
              Continue with Google
            </a>

            <p className="text-sm text-center text-accent mt-2">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-primary hover:underline">
                Login
              </Link>
            </p>
        </form>
      </div>
    </>
  )
}
