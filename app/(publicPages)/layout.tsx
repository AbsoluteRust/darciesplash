import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import React from "react";


export const metadata = {
    title: "The Commissioner's Collection",
    description: "🌷",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Navbar />
            {children}
            <Footer />
        </>
    );
}