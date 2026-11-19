import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

//

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

//

const description = "Upload your notes, PDFs or slides and StudyFast turns them into practice questions, flashcards and mock tests that get graded. Track progress across your courses."

export const metadata: Metadata = {
  metadataBase: new URL("https://www.studyfast.now"),
  title: {
    default: "StudyFast – AI Practice Tests & Flashcards From Your Notes",
    template: "%s | StudyFast",
  },
  description,
  openGraph: {
    type: "website",
    siteName: "StudyFast",
    title: "StudyFast – AI Practice Tests & Flashcards From Your Notes",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body
        className={`${nunito.className} min-h-full flex flex-col`}
      >
        {children}
      </body>
    </html>
  );
}

