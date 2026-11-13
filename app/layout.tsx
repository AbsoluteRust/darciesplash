import { Poppins, Geist } from "next/font/google";
import "./globals.css";
import LenisScroll from "@/components/LenisScroll";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RarityModeProvider } from "@/components/RarityModeContext";
import { CollectionFilterProvider } from "@/components/CollectionFilterContext";
import { PageLoadingProvider } from "@/components/PageLoadingContext";
import { PreviewModeProvider } from "@/components/PreviewModeContext";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { cn } from "@/lib/utils";
import Heartbeat from "@/components/Heartbeat";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { kv } from "@vercel/kv";
import { ADMIN_IDS } from "@/lib/admin";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const poppins = Poppins({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-poppins",
});

export default async function RootLayout({ children, }: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await auth();
    const userId = session?.user?.id ?? null;

    const isRealAdmin = !!userId && ADMIN_IDS.has(userId);

    let isRealDarsubscriber = false;
    if (userId) {
        const roles = await kv.get(`account_roles:${userId}`).catch(() => null);
        isRealDarsubscriber = !!(roles as any)?.darsubscribbler;
    }

    return (
        <html lang="en" className={cn("font-sans", geist.variable)}>
            <head>
                <link rel="preload" href="/assets/background-splash.svg" as="image" />
            </head>
            <body>
                <SessionProvider session={session}>
                    <PreviewModeProvider
                        userId={userId}
                        initialIsRealAdmin={isRealAdmin}
                        initialIsRealDarsubscriber={isRealDarsubscriber}
                    >
                        <Heartbeat />
                        <LenisScroll />
                        <PageLoadingProvider>
                            <RarityModeProvider>
                                <CollectionFilterProvider>
                                    <Navbar />
                                    <div style={{ minHeight: '100vh' }}>{children}</div>
                                </CollectionFilterProvider>
                            </RarityModeProvider>
                        </PageLoadingProvider>
                    </PreviewModeProvider>
                </SessionProvider>
                <SpeedInsights />
                <Analytics />
            </body>
        </html>
    );
}