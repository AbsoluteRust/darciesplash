import { Poppins, Geist } from "next/font/google";
import "./globals.css";
import LenisScroll from "@/components/LenisScroll";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RarityModeProvider } from "@/components/RarityModeContext";
import { PageLoadingProvider } from "@/components/PageLoadingContext";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const poppins = Poppins({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-poppins",
});

export default function RootLayout({ children, }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={cn("font-sans", geist.variable)}>
            <head>
                <link rel="preload" href="/assets/background-splash.svg" as="image" />
            </head>
            <body>
                <LenisScroll />
                <PageLoadingProvider>
                    <RarityModeProvider>
                        <Navbar />
                        <div style={{ minHeight: '100vh' }}>{children}</div>
                        <Footer />
                    </RarityModeProvider>
                </PageLoadingProvider>
                <SpeedInsights />
            </body>
        </html>
    );
}