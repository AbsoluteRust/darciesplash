'use client'
import { MenuIcon, XIcon, HomeIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import WarpText from "@/components/WarpText";
import RarityModeToggle from "@/components/RarityModeToggle";

const COLLECTIONS = [
  { slug: "darcie",    label: "Darcie" },
  { slug: "tobi",      label: "Tobi" },
  { slug: "madolche",  label: "Madolche" },
  { slug: "celestial", label: "Celestial" },
  { slug: "halo",      label: "Halo" },
];

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const match = pathname?.match(/^\/collections\/([^/]+)/);
    const currentSlug = match ? match[1] : null;
    const currentIdx = currentSlug ? COLLECTIONS.findIndex(c => c.slug === currentSlug) : -1;

    const isCollectionPage = currentIdx >= 0;
    const before = isCollectionPage ? COLLECTIONS.slice(0, currentIdx) : [];
    const after = isCollectionPage ? COLLECTIONS.slice(currentIdx + 1) : COLLECTIONS;
    const currentLabel = isCollectionPage ? COLLECTIONS[currentIdx].label : null;

    return (
        <>
            <motion.nav
                className={`fixed top-0 z-50 flex items-center justify-between w-full px-6 md:px-16 lg:px-24 xl:px-32 backdrop-blur transition-all duration-300 ${
    isCollectionPage ? "py-8" : "py-4"
}`}
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 250, damping: 70, mass: 1 }}
            >
                {/* LEFT — Home + past collections */}
                <div className="flex items-center gap-6 relative z-10">
<button
    type="button"
    onClick={() => {
        if (pathname === "/") {
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            router.push("/");
        }
    }}
    className="hover:text-pink-500 transition flex items-center gap-2 cursor-pointer"
    aria-label="Home"
>
    <HomeIcon size={20} />
</button>
                    <div className="hidden md:flex items-center gap-6">
                        {before.map(c => (
                            <Link
                                key={c.slug}
                                href={`/collections/${c.slug}`}
                                className="hover:text-pink-500 transition text-sm"
                            >
                                {c.label}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* CENTER — WarpText (collection pages only) */}
{currentLabel && (
    <div
        className="absolute hidden md:flex items-center justify-center"
        style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "700px",
            height: "100px",
            pointerEvents: "none",   // ⭐ clicks pass through
            zIndex: 0,
        }}
    >
        <WarpText
            text={`The ${currentLabel} Collection`}
            color="#f8f5ff"
            warpStrength={0.06}
            warpScale={2}
            speed={0.55}
            pointerInfluence={0.3}
            pointerStrength={0.28}
            refraction={0.018}
            ripple
            fontSize={48}
            fontWeight={800}
            style={{ width: "100%", height: "100%", minHeight: 0 }}
            fontFamily="inherit"
            letterSpacing={-0.04}
            lineHeight={0.9}
        />
    </div>
)}
{/* RIGHT — Upcoming collections + rarity toggle */}
<div className="hidden md:flex items-center gap-6 relative z-10">
    {after.map(c => (
        <Link
            key={c.slug}
            href={`/collections/${c.slug}`}
            className="hover:text-pink-500 transition text-sm"
        >
            {c.label}
        </Link>
    ))}
    {isCollectionPage && <RarityModeToggle />}
</div>

                {/* Mobile menu button */}
                <button onClick={() => setIsOpen(true)} className="md:hidden">
                    <MenuIcon size={26} className="active:scale-90 transition" />
                </button>
            </motion.nav>

{/* Mobile menu */}
<div
    className={`fixed inset-0 z-100 bg-black/40 backdrop-blur flex flex-col items-center justify-center text-lg gap-8 md:hidden transition-transform duration-400 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
    }`}
>
    <Link href="/" onClick={() => setIsOpen(false)}>Home</Link>
    {COLLECTIONS.map(c => (
        <Link
            key={c.slug}
            href={`/collections/${c.slug}`}
            onNavigate={() => setIsOpen(false)}
        >
            {c.label}
        </Link>
    ))}
    {isCollectionPage && <RarityModeToggle />}
    <button
        onClick={() => setIsOpen(false)}
        className="active:ring-3 active:ring-white aspect-square size-10 p-1 items-center justify-center bg-pink-600 hover:bg-pink-700 transition text-white rounded-md flex"
    >
        <XIcon />
    </button>
</div>
        </>
    );
}