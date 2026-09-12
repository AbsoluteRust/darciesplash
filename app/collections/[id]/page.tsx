'use client';

import "./page.css";
import { use, useState, useEffect, useMemo } from "react";
import Iridescence from "../../../components/Iridescence";
import ProfileCard from "@/components/ProfileCard";
import { ITEMS } from "@/sections/AccordionGallery";
import { useRouter } from "next/navigation";
import Link from "next/link";
import WarpText from "../../../components/WarpText";
import Silk from "@/components/Silk";
import { useSearchParams } from "next/navigation";

type Card = {
  name: string;
  type: string;
  image: string;
  glow?: string;
  description?: string;
  details?: string;
  link?: string;
  collection?: string;
};

const COLLECTION_ORDER = ["darcie", "celestial", "madolche", "tobi", "halo"];

// Fallback glow per collection (used when a KV card has no explicit glow field)
const COLLECTION_GLOW: Record<string, string> = {
  celestial: "rgba(125, 190, 255, 0.67)",
  madolche: "rgba(255, 180, 220, 0.67)",
  tobi: "rgba(125, 190, 255, 0.67)",
  darcie: "#fff",
  halo: "#fff",
};

const DEFAULT_GLOW = "rgba(125, 190, 255, 0.67)";

// Normalize type strings so "emote" / "Emote" / "EMOTE" all render the same
const TYPE_DISPLAY: Record<string, string> = {
  emote: "Emote",
  splash: "Splash Art",
  wallpaper: "Mobile Wallpaper",
  sticker: "Sticker",
  Emote: "Emote",
  "Splash Art": "Splash Art",
  "Mobile Wallpaper": "Mobile Wallpaper",
  Wallpaper: "Mobile Wallpaper",
  Sticker: "Sticker",
};

function normalizeType(t: string | undefined): string {
  if (!t) return "Emote";
  return TYPE_DISPLAY[t] || t;
}

export default function CollectionsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const rawParams = use(params);
  const id = rawParams.id;

  const [activeEmote, setActiveEmote] = useState<Card | null>(null);
  const [nudge, setNudge] = useState(0);
  const [kvCards, setKvCards] = useState<Card[]>([]);
  const [deletedNames, setDeletedNames] = useState<string[]>([]);

  // ---- Load KV data on mount ----
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [cardsRes, deletedRes] = await Promise.all([
          fetch("/api/cards/list", { cache: "no-store" }),
          fetch("/api/cards/deleted", { cache: "no-store" }),
        ]);
        const cards = cardsRes.ok ? await cardsRes.json() : [];
        const deleted = deletedRes.ok ? await deletedRes.json() : [];
        if (!cancelled) {
          setKvCards(cards);
          setDeletedNames(deleted);
        }
      } catch (err) {
        console.error("Failed to load cards:", err);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ---- Filter + normalize for the current collection ----
  const mergedCards = useMemo(() => {
    const deletedSet = new Set(deletedNames.map(n => n.toLowerCase()));
    const collectionGlow = COLLECTION_GLOW[id] || DEFAULT_GLOW;

    return kvCards
      .filter(c => c.collection === id)
      .filter(c => !deletedSet.has(c.name.toLowerCase()))
      .map(c => ({
        ...c,
        type: normalizeType(c.type),
        glow: c.glow || collectionGlow,
      }));
  }, [id, kvCards, deletedNames]);

  const art = ITEMS.find(item => item.slug === id);
  const currentIndex = COLLECTION_ORDER.indexOf(id);
  const nextSlug = COLLECTION_ORDER[currentIndex + 1];
  const prevSlug = COLLECTION_ORDER[currentIndex - 1];

  // ---- Overscroll → next/prev collection ----
  useEffect(() => {
    if (!nextSlug && !prevSlug) return;
    let attempts = 0;

    const handleWheel = (e: WheelEvent) => {
      if (activeEmote) return;
      const y = window.scrollY;
      const scrollPos = y + window.innerHeight;
      const pageHeight = document.body.scrollHeight;
      const atTop = y <= 2;
      const atBottom = scrollPos >= pageHeight - 2;

      if (atBottom && e.deltaY > 0 && nextSlug) {
        attempts++;
        setNudge(-Math.min(Math.sqrt(attempts) * 10, 35));
        if (attempts >= 12) router.push(`/collections/${nextSlug}`);
        return;
      }
      if (atTop && e.deltaY < 0 && prevSlug) {
        attempts++;
        setNudge(Math.min(Math.sqrt(attempts) * 10, 35));
        if (attempts >= 12) router.push(`/collections/${prevSlug}`);
        return;
      }
      attempts = 0;
      setNudge(0);
    };

    window.addEventListener("wheel", handleWheel);
    return () => window.removeEventListener("wheel", handleWheel);
  }, [nextSlug, prevSlug, router, activeEmote]);

  // ---- ESC navigation ----
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (activeEmote) {
        setActiveEmote(null);
        router.push(`/collections/${id}`, { scroll: false });
        return;
      }
      router.push("/");
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [activeEmote, router, id]);

  // ---- Freeze page when modal is open ----
  useEffect(() => {
    if (!activeEmote) return;
    const y = window.scrollY;
    const x = window.scrollX;
    window.scrollTo(x, y);
    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      const html = document.documentElement;
      const prev = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, y);
      html.style.scrollBehavior = prev;
    };
  }, [activeEmote]);

  // ---- Deep link via ?card= ----
  const searchParams = useSearchParams();
  const cardParam = searchParams.get("card");

  useEffect(() => {
    if (!cardParam) return;
    const match = mergedCards.find(
      p => p.name.toLowerCase().replace(/\s+/g, "-") === cardParam.toLowerCase()
    );
    if (match && match.name.toLowerCase() !== "banana") {
      setActiveEmote(match);
    }
  }, [cardParam, mergedCards]);

  if (!art) return null;

  return (
    <div className="collections-page">
      <Link href="/" className="home-button">Esc</Link>

      {id === "celestial" && (
        <Iridescence color={[1, 1, 1]} mouseReact amplitude={0.1} speed={0.25} className="iridescence-container" />
      )}
      {id === "madolche" && (
        <div className="madolche-bg">
          <Silk speed={5} scale={1} color="#4E2E69" noiseIntensity={1.2} rotation={0} />
        </div>
      )}

      <div className="art-content warp-title">
        <WarpText
          text={`The ${id.charAt(0).toUpperCase() + id.slice(1)} Collection`}
          color="#f8f5ff" warpStrength={0.08} warpScale={2} speed={0.55}
          pointerInfluence={0.42} pointerStrength={0.38} refraction={0.021}
          ripple fontSize={116} fontWeight={800}
          style={{ height: "320px" }}
          fontFamily="inherit" letterSpacing={-0.06} lineHeight={0.9}
        />
      </div>

      {activeEmote && (
        <div
          className="emote-modal-overlay"
          onClick={() => {
            setActiveEmote(null);
            router.push(`/collections/${id}`, { scroll: false });
          }}
        >
          <div className="emote-modal emote-layout" onClick={e => e.stopPropagation()}>
            {activeEmote.type === "Emote" && (
              <ProfileCard
                key={activeEmote.name}
                name={activeEmote.name}
                title="Emote"
                handle={activeEmote.name.toLowerCase().replace(/\s+/g, "-")}
                status="Online"
                contactText="Close"
                avatarUrl={activeEmote.image}
                showUserInfo={false}
                enableTilt={false}
                enableMobileTilt={false}
                behindGlowColor={activeEmote.glow || DEFAULT_GLOW}
                iconUrl={null}
                behindGlowEnabled
                innerGradient="linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)"
                isModal={true}
                onContactClick={() => setActiveEmote(null)}
              />
            )}

            {(activeEmote.type === "Mobile Wallpaper" ||
              activeEmote.type === "Splash Art" ||
              activeEmote.type === "Sticker") && (
              <div className="art-layout">
                <img className="full-wallpaper" src={activeEmote.image} alt={activeEmote.name} />
              </div>
            )}

            <div className="emote-info-boxes">
              {activeEmote.description?.trim() && (
                <div className="emote-info-box">
                  <p>{activeEmote.description}</p>
                </div>
              )}
              {((activeEmote.details?.trim()) || (activeEmote.link?.trim())) && (
                <div className="emote-info-box">
                  {activeEmote.details?.trim() && <p>{activeEmote.details}</p>}
                  {activeEmote.link?.trim() && (
                    <a href={activeEmote.link} target="_blank" rel="noopener noreferrer" className="emote-link">
                      {activeEmote.link}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid-container">
        <div
          className="card-grid"
          style={{
            transform: `translateY(${nudge}px)`,
            transition: nudge === 0
              ? "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)"
              : "transform 80ms ease-out",
          }}
        >
          {mergedCards.map(piece => (
            <ProfileCard
              key={`${piece.name}|${piece.collection}`}
              name={piece.name}
              title={piece.type}
              handle={piece.name.toLowerCase().replace(/\s+/g, "-")}
              status="Online"
              contactText="View"
              avatarUrl={piece.image}
              showUserInfo={false}
              enableTilt={true}
              enableMobileTilt={false}
              behindGlowColor={piece.glow || DEFAULT_GLOW}
              iconUrl={null}
              behindGlowEnabled
              innerGradient="linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)"
              onContactClick={() => {
                const slugified = piece.name.toLowerCase().replace(/\s+/g, "-");
                router.push(`?card=${slugified}`, { scroll: false });
                setActiveEmote(piece);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}