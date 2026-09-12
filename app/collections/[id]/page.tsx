'use client';

import "./page.css";
import { use, useState, useEffect, useMemo, useCallback, useRef } from "react";
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

const COLLECTION_ORDER = ["darcie", "tobi", "madolche", "celestial", "halo"];

const COLLECTION_GLOW: Record<string, string> = {
  celestial: "rgba(125, 190, 255, 0.67)",
  madolche: "rgba(255, 180, 220, 0.67)",
  tobi: "rgba(125, 190, 255, 0.67)",
  darcie: "#fff",
  halo: "#fff",
};

const DEFAULT_GLOW = "rgba(125, 190, 255, 0.67)";

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

const WHEEL_THRESHOLD = 50;
const TOUCH_THRESHOLD = 60;
const TOUCH_SCROLL_TOLERANCE = 8;

export default function CollectionsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const rawParams = use(params);
  const id = rawParams.id;

  const [activeEmote, setActiveEmote] = useState<Card | null>(null);
  const [modalCollection, setModalCollection] = useState<string | null>(null);
  const [modalIndex, setModalIndex] = useState<number>(-1);
  const [nudge, setNudge] = useState(0);
  const [kvCards, setKvCards] = useState<Card[]>([]);
  const [deletedNames, setDeletedNames] = useState<string[]>([]);

  // ---- Load KV data ----
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

  // ---- Group cards by collection ----
  const allCardsByCollection = useMemo(() => {
    const deletedSet = new Set(deletedNames.map(n => n.toLowerCase()));
    const map: Record<string, Card[]> = {};
    for (const coll of COLLECTION_ORDER) {
      const collGlow = COLLECTION_GLOW[coll] || DEFAULT_GLOW;
      map[coll] = kvCards
        .filter(c => c.collection === coll)
        .filter(c => !deletedSet.has(c.name.toLowerCase()))
        .map(c => ({
          ...c,
          type: normalizeType(c.type),
          glow: c.glow || collGlow,
        }));
    }
    return map;
  }, [kvCards, deletedNames]);

  const mergedCards = allCardsByCollection[id] || [];

  const art = ITEMS.find(item => item.slug === id);
  const currentIndex = COLLECTION_ORDER.indexOf(id);
  const nextSlug = COLLECTION_ORDER[currentIndex + 1];
  const prevSlug = COLLECTION_ORDER[currentIndex - 1];

  // ---- Page scroll → next/prev collection (only when modal closed) ----
  useEffect(() => {
    if (activeEmote) return;
    if (!nextSlug && !prevSlug) return;
    let attempts = 0;

    const handleWheel = (e: WheelEvent) => {
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
  }, [activeEmote, nextSlug, prevSlug, router]);

  // ---- Refs so the modal handler reads fresh state without re-attaching ----
  const activeEmoteRef = useRef(activeEmote);
  const modalCollectionRef = useRef(modalCollection);
  const modalIndexRef = useRef(modalIndex);
  const allCardsByCollectionRef = useRef(allCardsByCollection);

  useEffect(() => { activeEmoteRef.current = activeEmote; }, [activeEmote]);
  useEffect(() => { modalCollectionRef.current = modalCollection; }, [modalCollection]);
  useEffect(() => { modalIndexRef.current = modalIndex; }, [modalIndex]);
  useEffect(() => { allCardsByCollectionRef.current = allCardsByCollection; }, [allCardsByCollection]);

  // ---- The one true "navigate to next/prev card" function ----
  const navigateModalCard = useCallback((direction: 1 | -1) => {
    const ae = activeEmoteRef.current;
    const mc = modalCollectionRef.current;
    const mi = modalIndexRef.current;
    const byColl = allCardsByCollectionRef.current;

    if (!ae || !mc) return;

    const cards = byColl[mc] || [];
    if (cards.length === 0) return;

    let nextIdx = mi + direction;
    let nextColl = mc;

    if (nextIdx >= cards.length) {
      const cur = COLLECTION_ORDER.indexOf(mc);
      const nxt = COLLECTION_ORDER[cur + 1];
      if (!nxt) return;
      const nxtCards = byColl[nxt] || [];
      if (nxtCards.length === 0) return;
      nextColl = nxt;
      nextIdx = 0;
    } else if (nextIdx < 0) {
      const cur = COLLECTION_ORDER.indexOf(mc);
      const prv = COLLECTION_ORDER[cur - 1];
      if (!prv) return;
      const prvCards = byColl[prv] || [];
      if (prvCards.length === 0) return;
      nextColl = prv;
      nextIdx = prvCards.length - 1;
    }

    const newCards = byColl[nextColl] || [];
    const newCard = newCards[nextIdx];
    if (!newCard) return;

    setModalCollection(nextColl);
    setModalIndex(nextIdx);
    setActiveEmote(newCard);

    // Always reflect the current card in the URL
    const slug = newCard.name.toLowerCase().replace(/\s+/g, "-");
    router.replace(`/collections/${nextColl}?card=${slug}`, { scroll: false });
  }, [router]);

  const navigateModalCardRef = useRef(navigateModalCard);
  useEffect(() => { navigateModalCardRef.current = navigateModalCard; }, [navigateModalCard]);

  // ---- Modal scroll (wheel + touch) → navigate between cards ----
  useEffect(() => {
    let wheelAccum = 0;
    let touchActive = false;
    let touchStartY = 0;
    let touchStartScroll = 0;

    const isModalOpen = () => !!activeEmoteRef.current && !!modalCollectionRef.current;

    const handleWheel = (e: WheelEvent) => {
      if (!isModalOpen()) return;
      e.preventDefault();
      wheelAccum += e.deltaY;
      if (Math.abs(wheelAccum) < WHEEL_THRESHOLD) return;
      const direction: 1 | -1 = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;
      navigateModalCardRef.current(direction);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (!isModalOpen()) return;
      const target = e.target as HTMLElement | null;
      // Let the user scroll the info box content without hijacking
      if (target?.closest(".emote-info-boxes")) {
        touchActive = false;
        return;
      }
      touchActive = true;
      touchStartY = e.touches[0].clientY;
      const overlay = document.querySelector(".emote-modal-overlay") as HTMLElement | null;
      touchStartScroll = overlay ? overlay.scrollTop : 0;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchActive) return;
      touchActive = false;

      const overlay = document.querySelector(".emote-modal-overlay") as HTMLElement | null;
      const scrollAfter = overlay ? overlay.scrollTop : 0;
      // If the modal itself scrolled during the gesture, treat as content-scroll
      if (Math.abs(scrollAfter - touchStartScroll) > TOUCH_SCROLL_TOLERANCE) return;

      const delta = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(delta) < TOUCH_THRESHOLD) return;
      const direction: 1 | -1 = delta > 0 ? 1 : -1;
      navigateModalCardRef.current(direction);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  // ---- Close modal + sync URL ----
  const closeModal = useCallback(() => {
    const coll = modalCollection || id;
    setActiveEmote(null);
    setModalCollection(null);
    setModalIndex(-1);
    router.replace(`/collections/${coll}`, { scroll: false });
  }, [modalCollection, id, router]);

  // ---- ESC ----
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (activeEmote) {
        closeModal();
        return;
      }
      router.push("/");
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [activeEmote, closeModal, router]);

  // ---- Freeze page when modal open ----
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

  // ---- Deep link via ?card= (initial only, ignored when modal already open) ----
  const searchParams = useSearchParams();
  const cardParam = searchParams.get("card");

  useEffect(() => {
    if (!cardParam) return;
    if (activeEmoteRef.current) return;

    for (const coll of COLLECTION_ORDER) {
      const cards = allCardsByCollection[coll] || [];
      const idx = cards.findIndex(
        c => c.name.toLowerCase().replace(/\s+/g, "-") === cardParam.toLowerCase()
      );
      if (idx >= 0) {
        const match = cards[idx];
        if (match.name.toLowerCase() === "banana") return;
        setActiveEmote(match);
        setModalCollection(coll);
        setModalIndex(idx);
        return;
      }
    }
  }, [cardParam, allCardsByCollection]);

  // ---- Card click ----
  const openCard = useCallback((piece: Card, index: number) => {
    setActiveEmote(piece);
    setModalCollection(id);
    setModalIndex(index);
    const slug = piece.name.toLowerCase().replace(/\s+/g, "-");
    router.push(`/collections/${id}?card=${slug}`, { scroll: false });
  }, [id, router]);

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
        <div className="emote-modal-overlay" onClick={closeModal}>
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
                onContactClick={closeModal}
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
          {mergedCards.map((piece, idx) => (
            <ProfileCard
              key={`${piece.name}|${idx}`}
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
              onContactClick={() => openCard(piece, idx)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}