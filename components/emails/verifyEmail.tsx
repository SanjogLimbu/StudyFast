import { Body, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components"

//

type Props = {
    code: string
}

// Email clients don't support CSS variables, so the theme colors from globals.css are repeated here.
const BACKGROUND = "#fafbfc"
const FOREGROUND = "#2f2e33"
const ACCENT = "#6b6a72"
const PRIMARY = "#4f9cf0"
const BORDER = "#e3e5ea"
const SURFACE = "#ffffff"

//

export default function VerifyEmail({
    code
}: Props) {
    return (
        <Html lang="en">
            <Head />

            <Preview>
                {`Your StudyFast verification code is ${code}`}
            </Preview>

            <Body
                style={{
                    margin: 0,
                    backgroundColor: BACKGROUND,
                    color: FOREGROUND,
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                }}
            >
                <Container style={{ maxWidth: 440, padding: "40px 16px" }}>
                    <Text style={{ margin: "0 0 20px", fontSize: 28, fontWeight: 800, textAlign: "center" }}>
                        Study<span style={{ color: PRIMARY }}>Fast</span>
                    </Text>

                    <Section
                        style={{
                            padding: 28,
                            backgroundColor: SURFACE,
                            border: `1px solid ${BORDER}`,
                            borderRadius: 16
                        }}
                    >
                        <Heading as="h1" style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
                            Verify your email
                        </Heading>

                        <Text style={{ margin: "12px 0 24px", fontSize: 15, lineHeight: "24px", color: ACCENT }}>
                            Enter this code on the sign up page to finish creating your account. It will expire in 30 minutes.
                        </Text>

                        <Text
                            style={{
                                margin: 0,
                                padding: "16px 0",
                                backgroundColor: BACKGROUND,
                                border: `1px solid ${BORDER}`,
                                borderRadius: 12,
                                fontSize: 28,
                                lineHeight: "36px",
                                fontWeight: 800,
                                letterSpacing: 6,
                                textAlign: "center"
                            }}
                        >
                            {code}
                        </Text>
                    </Section>

                    <Text style={{ margin: "20px 0 0", fontSize: 13, lineHeight: "20px", color: ACCENT, textAlign: "center" }}>
                        If you didn&apos;t try to create a StudyFast account, you can ignore this email.
                    </Text>
                </Container>
            </Body>
        </Html>
    )
}
