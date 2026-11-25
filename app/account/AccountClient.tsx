"use client"

import NavBar from "@/components/navbar"
import StreakCalendar from "@/components/streakCalendar"

import { useRouter } from "next/navigation"
import { useEffect, useState, type FormEvent } from "react"

import {
    MAX_DAILY_UPLOADS_FREE,
    MAX_DAILY_UPLOADS_PAID,
    MAX_DAILY_PROMPTS_FREE,
    MAX_DAILY_PROMPTS_PAID
} from "@/lib/constants"

//

type Subscription = {
    plan: "Free" | "Pro"
    status: string | null
}

//

export function UpgradeToPro({
    onClose
}: {
    onClose: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const features = [
        {
            name: "Daily uploads",
            free: MAX_DAILY_UPLOADS_FREE,
            pro: MAX_DAILY_UPLOADS_PAID
        },
        {
            name: "Daily prompts",
            free: MAX_DAILY_PROMPTS_FREE,
            pro: MAX_DAILY_PROMPTS_PAID
        },
        {
            name: "Basic features",
            free: true,
            pro: true
        },
        {
            name: "Mock tests",
            free: false,
            pro: true
        },
        {
            name: "Mock interviews",
            free: false,
            pro: true
        }
    ]

    async function handleUpgrade(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()

        setLoading(true)
        setError("")

        try {
            const response = await fetch(
                "/api/subscription/checkout",
                {
                    method: "POST",
                    credentials: "include"
                }
            )

            const data = await response.json()

            if (!response.ok || !data?.url) {
                throw new Error(
                    data?.detail || "Unable to upgrade"
                )
            }

            window.location.href = data.url
        }
        catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Something went wrong"
            )

            setLoading(false)
        }
    }

    function renderFeature(value: number | boolean) {
        if (typeof value === "boolean") {
            return (
                <span className={
                    value ? "text-green-500" : "text-red-500"
                }>
                    {value ? "✓" : "✕"}
                </span>
            )
        }

        return value
    }

    return (
        <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={loading ? undefined : onClose}
        >
            <form
                onSubmit={handleUpgrade}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="upgrade-title"
                className="w-full max-w-lg bg-background border border-border rounded-2xl p-6 flex flex-col gap-6 shadow-xl max-h-[90vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                            ✦ Premium
                        </span>

                        <h2
                            id="upgrade-title"
                            className="text-2xl font-bold"
                        >
                            Upgrade to Pro
                        </h2>

                        <p className="text-sm text-muted-foreground">
                            Unlock higher limits and get more out of your account.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        aria-label="Close"
                        className="text-muted-foreground hover:text-red-500 text-xl cursor-pointer disabled:opacity-50"
                    >
                        ✕
                    </button>
                </div>

                {/* Plan Comparison */}
                <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted">
                            <tr>
                                <th className="p-3 font-medium">
                                    Features
                                </th>

                                <th className="p-3 text-center font-medium">
                                    Free
                                </th>

                                <th className="p-3 text-center font-semibold text-primary">
                                    Pro
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {features.map((feature) => (
                                <tr
                                    key={feature.name}
                                    className="border-t border-border"
                                >
                                    <td className="p-3">
                                        {feature.name}
                                    </td>

                                    <td className="p-3 text-center text-muted-foreground">
                                        {renderFeature(feature.free)}
                                    </td>

                                    <td className="p-3 text-center font-semibold">
                                        {renderFeature(feature.pro)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pricing */}
                <div className="bg-muted/50 border border-border rounded-xl p-4 flex flex-col gap-2">
                    <span className="text-sm font-medium">
                        Pro Subscription
                    </span>

                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">
                            £4.50
                        </span>

                        <span className="text-sm text-muted-foreground">
                            / month
                        </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Billed monthly.
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <p
                        role="alert"
                        className="text-sm text-red-500"
                    >
                        {error}
                    </p>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full disabled:opacity-50"
                    >
                        {loading
                            ? "Redirecting..."
                            : "Upgrade to Pro"
                        }
                    </button>

                    <button
                        type="button"
                        disabled={loading}
                        onClick={onClose}
                        className="text-sm text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                        Stay on Free
                    </button>
                </div>
            </form>
        </div>
    )
}

//

export default function Account({
    subscription
}: {
    subscription: Subscription
}) {
    const router = useRouter()

    const [days, setDays] = useState([])
    const [upgrading, setUpgrading] = useState(false)
    const [managing, setManaging] = useState(false)
    const [error, setError] = useState("")

    const plan = subscription.plan
    const status = subscription.status

    const isPro = plan === "Pro"

    const hasSubscription = [
        "active",
        "trialing",
        "past_due",
        "unpaid",
        "incomplete",
        "paused"
    ].includes(status ?? "")

    const paymentOverdue = [
        "past_due",
        "unpaid"
    ].includes(status ?? "")

    const features = [
        "Access to basic features",

        `${isPro
            ? MAX_DAILY_UPLOADS_PAID
            : MAX_DAILY_UPLOADS_FREE
        } Daily uploads`,

        `${isPro
            ? MAX_DAILY_PROMPTS_PAID
            : MAX_DAILY_PROMPTS_FREE
        } Daily prompts`,

        ...(isPro ? [
            "Access to mock tests",
            "Access to mock interviews"
        ] : [])
    ]

    async function logout() {
        const response = await fetch(
            "/api/auth/logout",
            {
                method: "POST",
                credentials: "include"
            }
        )

        if (response.ok) {
            router.push("/")
            router.refresh()
        }
    }

    async function manageSubscription() {
        setManaging(true)
        setError("")

        try {
            const response = await fetch(
                "/api/subscription/portal",
                {
                    method: "POST",
                    credentials: "include"
                }
            )

            const data = await response.json()

            if (!response.ok || !data?.url) {
                throw new Error(
                    data?.detail || "Unable to manage subscription"
                )
            }

            window.location.href = data.url
        }
        catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Something went wrong"
            )

            setManaging(false)
        }
    }

    useEffect(() => {
        async function getActivity() {
            try {
                const response = await fetch(
                    "/api/auth/activity",
                    {
                        credentials: "include"
                    }
                )

                const json = await response.json()

                if (response.ok) {
                    setDays(json.days)
                }
            }
            catch (error) {
                console.error(error)
            }
        }

        getActivity()
    }, [])

    // Refresh the subscription after returning from Stripe.
    useEffect(() => {
        const params = new URLSearchParams(
            window.location.search
        )

        if (params.get("success") !== "true") {
            return
        }

        if (isPro) {
            router.replace("/account")
            return
        }

        let attempts = 0

        const interval = setInterval(() => {
            router.refresh()

            attempts++

            if (attempts >= 10) {
                clearInterval(interval)
            }
        }, 2000)

        return () => clearInterval(interval)
    }, [isPro, router])

    return (
        <>
            <NavBar />

            {upgrading && !isPro && !hasSubscription && (
                <UpgradeToPro
                    onClose={() => setUpgrading(false)}
                />
            )}

            <div className="w-full min-h-screen flex flex-col items-center justify-center p-6 pt-24">
                <div className="w-full max-w-3xl bg-background border border-border rounded-xl p-6 flex flex-col gap-6 shadow-sm">
                    <StreakCalendar days={days} />

                    {/* Subscription Card */}
                    <div className={`w-full card rounded-xl border p-6 flex flex-col gap-5 ${
                        isPro
                            ? "border-primary/50"
                            : "border-border"
                    }`}>

                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm text-muted-foreground">
                                    Your Subscription
                                </span>

                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    {plan} Plan

                                    {isPro && (
                                        <span className="text-primary">
                                            ✦
                                        </span>
                                    )}
                                </h2>

                                <p className="text-sm text-muted-foreground">
                                    {isPro
                                        ? "You have access to all StudyFast premium features."
                                        : "You are currently using the free version."
                                    }
                                </p>
                            </div>

                            <span className={`px-3 py-1 rounded-full text-xs font-medium border capitalize ${
                                paymentOverdue
                                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                                    : isPro
                                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                                        : "bg-muted border-border"
                            }`}>
                                {status
                                    ? status.replaceAll("_", " ")
                                    : "Free"
                                }
                            </span>
                        </div>

                        {/* Pro Pricing */}
                        {isPro && (
                            <div className="bg-muted/50 border border-border rounded-xl p-4 flex flex-col gap-2">
                                <span className="text-sm text-muted-foreground">
                                    Monthly Subscription
                                </span>

                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold">
                                        £4.50
                                    </span>

                                    <span className="text-sm text-muted-foreground">
                                        / month
                                    </span>
                                </div>

                                <span className="text-xs text-muted-foreground">
                                    Billed monthly. Manage or cancel your subscription through the billing portal.
                                </span>
                            </div>
                        )}

                        {/* Payment Warning */}
                        {paymentOverdue && (
                            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 flex flex-col gap-1">
                                <span className="text-sm font-semibold text-red-500">
                                    Payment overdue
                                </span>

                                <p className="text-sm text-red-500">
                                    Please update your payment method to restore your Pro subscription.
                                </p>
                            </div>
                        )}

                        {/* Features */}
                        <div className="flex flex-col gap-3">
                            {features.map((feature) => (
                                <div
                                    key={feature}
                                    className="flex items-center gap-3 text-sm"
                                >
                                    <span className="text-green-500">
                                        ✓
                                    </span>

                                    <span>
                                        {feature}
                                    </span>
                                </div>
                            ))}

                            {/* Locked Features */}
                            {!isPro && (
                                <>
                                    <div className="flex items-center gap-3 text-sm">
                                        <span className="text-red-500">
                                            X
                                        </span>

                                        <span className="text-muted-foreground">
                                            Mock tests
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 text-sm">
                                        <span className="text-red-500">
                                            X
                                        </span>

                                        <span className="text-muted-foreground">
                                            Mock interviews
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <p
                                role="alert"
                                className="text-sm text-red-500"
                            >
                                {error}
                            </p>
                        )}

                        {/* Subscription Actions */}
                        {isPro || hasSubscription ? (
                            <button
                                className="btn btn-primary w-full sm:w-fit px-6 disabled:opacity-50"
                                onClick={manageSubscription}
                                disabled={managing}
                            >
                                {managing
                                    ? "Redirecting..."
                                    : "Manage Subscription"
                                }
                            </button>
                        ) : (
                            <button
                                className="btn btn-primary w-full sm:w-fit px-6"
                                onClick={() => setUpgrading(true)}
                            >
                                Upgrade to Pro
                            </button>
                        )}
                    </div>

                    {/* Account Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-sm font-semibold">
                                Account
                            </h3>

                            <p className="text-sm text-muted-foreground">
                                Manage your account and session.
                            </p>
                        </div>

                        <button
                            className="btn btn-danger w-full sm:w-36"
                            onClick={logout}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}