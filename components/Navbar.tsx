'use client'
import { MenuIcon, XIcon, HomeIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import WarpText from "@/components/WarpText";
import RarityModeToggle from "@/components/RarityModeToggle";

type NavCollection = {
  internalSlug: string;
  displayName: string;
  publicSlug: string;
};

const FALLBACK_COLLECTIONS: NavCollection[] = [
  { internalSlug: "darcie",    displayName: "Darcie",    publicSlug: "darcie" },
  { internalSlug: "tobi",      displayName: "Tobi",      publicSlug: "tobi" },
  { internalSlug: "madolche",  displayName: "Madolche",  publicSlug: "madolche" },
  { internalSlug: "celestial", displayName: "Celestial", publicSlug: "celestial" },
  { internalSlug: "lunalux",   displayName: "LunaLux",   publicSlug: "lunalux" },
  { internalSlug: "halo",      displayName: "Halo",      publicSlug: "halo" },
];

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [collections, setCollections] = useState<NavCollection[]>(FALLBACK_COLLECTIONS);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        let cancelled = false;
        fetch("/api/collections/meta", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (cancelled) return;
                if (d?.collections) {
                    setCollections(
                        d.collections.map((c: any) => ({
                            internalSlug: c.meta.internalSlug,
                            displayName: c.meta.displayName,
                            publicSlug: c.meta.publicSlug,
                        }))
                    );
                }
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    const match = pathname?.match(/^\/collections\/([^/]+)/);
    const urlSlug = match ? match[1] : null;
    const currentIdx = urlSlug ? collections.findIndex((c) => c.publicSlug === urlSlug) : -1;

    const isCollectionPage = currentIdx >= 0;
    const before = isCollectionPage ? collections.slice(0, currentIdx) : [];
    const after = isCollectionPage ? collections.slice(currentIdx + 1) : collections;
    const currentLabel = isCollectionPage ? collections[currentIdx].displayName : null;

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
                        className="hover:text-pink-500 transition flex items-center gap-2 cursor-pointer text-white/60 hover:text-white"
                        aria-label="Home"
                    >
                        <HomeIcon size={20} />
                    </button>
                    <div className="hidden md:flex items-center gap-6">
                        {before.map((c) => (
                            <Link
                                key={c.internalSlug}
                                href={`/collections/${c.publicSlug}`}
                                className="transition text-sm text-white/40 hover:text-pink-400"
                            >
                                {c.displayName}
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
                            pointerEvents: "none",
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

                {/* RIGHT — Upcoming collections */}
                <div className={`hidden md:flex items-center gap-6 relative z-10 ${isCollectionPage ? "pr-24" : ""}`}>
                    {after.map((c) => (
                        <Link
                            key={c.internalSlug}
                            href={`/collections/${c.publicSlug}`}
                            className="transition text-sm text-white/40 hover:text-pink-400"
                        >
                            {c.displayName}
                        </Link>
                    ))}
                </div>

                {/* RARITY TOGGLE — pinned near right edge */}
                {isCollectionPage && (
                    <div className="hidden md:block absolute right-3 md:right-5 lg:right-6 xl:right-8 top-1/2 -translate-y-1/2 z-20">
                        <RarityModeToggle />
                    </div>
                )}

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
                {collections.map((c) => (
                    <Link
                        key={c.internalSlug}
                        href={`/collections/${c.publicSlug}`}
                        onNavigate={() => setIsOpen(false)}
                    >
                        {c.displayName}
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