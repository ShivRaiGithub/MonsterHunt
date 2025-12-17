import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { AuthProvider, GameProvider } from "@/client/contexts"
import { Toaster } from "@/client/components/ui/toaster"
import "./globals.css"

export const metadata: Metadata = {
  title: "Werewolf Game",
  description: "Multiplayer social deduction game",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} dark`}>
        <AuthProvider>
          <GameProvider>
            <Suspense fallback={null}>{children}</Suspense>
          </GameProvider>
        </AuthProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
