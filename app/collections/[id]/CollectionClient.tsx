'use client';

import "./page.css";
import { use, useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from "react";
import Iridescence from "../../../components/Iridescence";
import ProfileCard from "@/components/ProfileCard";
import LazyMount from "@/components/LazyMount";
import RelatedCardMini from "@/components/RelatedCardMini";
import { ITEMS } from "@/sections/AccordionGallery";
import { useRouter } from "next/navigation";
import Silk from "@/components/Silk";
import { useSearchParams } from "next/navigation";
import { useRarityMode } from "@/components/RarityModeContext";

type Card = {
  name: string;
  type: string;
  image: string;
  glow?: string;
  rarity?: string;
  description?: string;
  details?: string;
  link?: string;
  collection?: string;
  related?: string[];
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

function normalizeForMatch(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findEmoteCount(cardName: string, emoteTotals: Record<string, number>): number {
  const cardNorm = normalizeForMatch(cardName);
  if (!cardNorm) return 0;

  let best = 0;
  for (const [emoteName, count] of Object.entries(emoteTotals)) {
    const emoteNorm = normalizeForMatch(emoteName);
    if (emoteNorm === cardNorm || emoteNorm.endsWith(cardNorm)) {
      const n = Number(count);
      if (n > best) best = n;
    }
  }
  return best;
}

const WHEEL_THRESHOLD = 50;
const TOUCH_THRESHOLD = 60;
const TOUCH_SCROLL_TOLERANCE = 8;

const CARD_EXIT_MS = 220;
const CARD_ENTER_MS = 340;
const CARD_CROSSING_EXIT_MS = 300;
const CARD_CROSSING_ENTER_MS = 420;

const MODAL_OVERSCROLL_TRIGGER = 500;

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function CollectionClient({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const rawParams = use(params);
  const id = rawParams.id;

  const { mode: rarityMode } = useRarityMode();

  const [activeEmote, setActiveEmote] = useState<Card | null>(null);
  const [modalCollection, setModalCollection] = useState<string | null>(null);
  const [modalIndex, setModalIndex] = useState<number>(-1);
  const [nudge, setNudge] = useState(0);
  const [kvCards, setKvCards] = useState<Card[]>([]);
  const [deletedNames, setDeletedNames] = useState<string[]>([]);
  const [emoteTotals, setEmoteTotals] = useState<Record<string, number>>({});
  const [leaving, setLeaving] = useState<"next" | "prev" | null>(null);
  const [hintDirection, setHintDirection] = useState<"next" | "prev" | null>(null);
  const [hintProgress, setHintProgress] = useState(0);
  const [cardTransition, setCardTransition] = useState<{
    phase: "leaving" | "entering";
    direction: "next" | "prev";
    crossing: boolean;
  } | null>(null);

  const [modalHintDirection, setModalHintDirection] = useState<"next" | "prev" | null>(null);
  const [modalHintProgress, setModalHintProgress] = useState(0);
  const modalOverscrollRef = useRef(0);

  // ---- Transition helper ----
  const triggerTransition = useCallback((direction: "next" | "prev", slug: string) => {
    if (leaving) return;
    setLeaving(direction);
    setHintProgress(0);
    setHintDirection(null);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("collection-transition-entry", direction);
    }
    setTimeout(() => {
      router.push(`/collections/${slug}`);
    }, 300);
  }, [leaving, router]);

  const triggerTransitionRef = useRef(triggerTransition);
  useEffect(() => { triggerTransitionRef.current = triggerTransition; }, [triggerTransition]);

  // ---- Entry animation when arriving from a collection transition ----
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const dir = sessionStorage.getItem("collection-transition-entry");
    if (dir !== "next" && dir !== "prev") return;
    sessionStorage.removeItem("collection-transition-entry");

    const html = document.documentElement;
    html.classList.add(`entering-${dir}`);
    const t = setTimeout(() => html.classList.remove(`entering-${dir}`), 420);
    return () => {
      clearTimeout(t);
      html.classList.remove(`entering-${dir}`);
    };
  }, []);

  // ---- Load KV data ----
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [cardsRes, deletedRes, emotesRes] = await Promise.all([
          fetch("/api/cards/list", { cache: "no-store" }),
          fetch("/api/cards/deleted", { cache: "no-store" }),
          fetch("/api/emotes/totals", { cache: "no-store" }),
        ]);
        const cards = cardsRes.ok ? await cardsRes.json() : [];
        const deleted = deletedRes.ok ? await deletedRes.json() : [];
        const emoteTotals = emotesRes.ok ? await emotesRes.json() : {};
        if (!cancelled) {
          setKvCards(cards);
          setDeletedNames(deleted);
          setEmoteTotals(emoteTotals);
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
      let cards = kvCards
        .filter(c => c.collection === coll)
        .filter(c => !deletedSet.has(c.name.toLowerCase()))
        .map(c => ({
          ...c,
          type: normalizeType(c.type),
          glow: c.glow || collGlow,
        }));

      if (coll === "halo") {
        cards = shuffleArray(cards);
      }

      map[coll] = cards;
    }
    return map;
  }, [kvCards, deletedNames]);

  // ---- Card lookup by name (across all collections) ----
  const cardByName = useMemo(() => {
    const map = new Map<string, Card>();
    for (const coll of COLLECTION_ORDER) {
      for (const c of allCardsByCollection[coll] || []) {
        map.set(c.name, c);
      }
    }
    return map;
  }, [allCardsByCollection]);

  const mergedCards = allCardsByCollection[id] || [];

  const art = ITEMS.find(item => item.slug === id);
  const currentIndex = COLLECTION_ORDER.indexOf(id);
  const nextSlug = COLLECTION_ORDER[currentIndex + 1];
  const prevSlug = COLLECTION_ORDER[currentIndex - 1];

  // ---- Related cards for the active card ----
  const relatedCards = useMemo(() => {
    if (!activeEmote?.related || activeEmote.related.length === 0) return [];
    return activeEmote.related
      .map(name => cardByName.get(name))
      .filter((c): c is Card => Boolean(c));
  }, [activeEmote, cardByName]);

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
        const progress = Math.min(attempts / 12, 1);
        setNudge(-Math.min(Math.sqrt(attempts) * 10, 35));
        setHintDirection("next");
        setHintProgress(progress);
        if (attempts >= 12) triggerTransitionRef.current("next", nextSlug);
        return;
      }
      if (atTop && e.deltaY < 0 && prevSlug) {
        attempts++;
        const progress = Math.min(attempts / 12, 1);
        setNudge(Math.min(Math.sqrt(attempts) * 10, 35));
        setHintDirection("prev");
        setHintProgress(progress);
        if (attempts >= 12) triggerTransitionRef.current("prev", prevSlug);
        return;
      }
      attempts = 0;
      setNudge(0);
      setHintProgress(0);
      setHintDirection(null);
    };

    let touchActive = false;
    let touchStartY = 0;
    let overscroll = 0;
    const OVERSCROLL_TRIGGER = 220;

    const handleTouchStart = (e: TouchEvent) => {
      touchActive = true;
      touchStartY = e.touches[0].clientY;
      overscroll = 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchActive) return;

      const y = window.scrollY;
      const scrollPos = y + window.innerHeight;
      const pageHeight = document.body.scrollHeight;
      const atTop = y <= 2;
      const atBottom = scrollPos >= pageHeight - 2;

      const currentY = e.touches[0].clientY;
      const delta = touchStartY - currentY;

      if (atTop && delta < 0) {
        if (e.cancelable) e.preventDefault();
      }

      if (atBottom && delta > 0 && nextSlug) {
        overscroll = delta;
        const progress = Math.min(overscroll / OVERSCROLL_TRIGGER, 1);
        setNudge(-Math.min(overscroll / 8, 35));
        setHintDirection("next");
        setHintProgress(progress);
        if (overscroll > OVERSCROLL_TRIGGER) {
          touchActive = false;
          triggerTransitionRef.current("next", nextSlug);
        }
        return;
      }

      if (atTop && delta < 0 && prevSlug) {
        overscroll = -delta;
        const progress = Math.min(overscroll / OVERSCROLL_TRIGGER, 1);
        setNudge(Math.min(overscroll / 8, 35));
        setHintDirection("prev");
        setHintProgress(progress);
        if (overscroll > OVERSCROLL_TRIGGER) {
          touchActive = false;
          triggerTransitionRef.current("prev", prevSlug);
        }
        return;
      }

      overscroll = 0;
      setNudge(0);
      setHintProgress(0);
      setHintDirection(null);
    };

    const handleTouchEnd = () => {
      touchActive = false;
      overscroll = 0;
      setNudge(0);
      setHintProgress(0);
      setHintDirection(null);
    };

    window.addEventListener("wheel", handleWheel);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [activeEmote, nextSlug, prevSlug, router]);

  // ---- Refs ----
  const activeEmoteRef = useRef(activeEmote);
  const modalCollectionRef = useRef(modalCollection);
  const modalIndexRef = useRef(modalIndex);
  const allCardsByCollectionRef = useRef(allCardsByCollection);
  const cardTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ---- Card image preloading ----
  const PRELOAD_RADIUS = 2;
  const preloadedRef = useRef<Set<string>>(new Set());

  const preloadCardImage = useCallback((url: string) => {
    if (!url) return;
    if (preloadedRef.current.has(url)) return;
    preloadedRef.current.add(url);
    const img = new Image();
    img.src = url;
  }, []);

  const preloadAdjacent = useCallback((collId: string, idx: number) => {
    const cards = allCardsByCollectionRef.current[collId] || [];
    if (cards.length === 0) return;

    for (let d = -PRELOAD_RADIUS; d <= PRELOAD_RADIUS; d++) {
      const i = idx + d;
      if (i >= 0 && i < cards.length) preloadCardImage(cards[i].image);
    }

    if (idx >= cards.length - 1) {
      const cur = COLLECTION_ORDER.indexOf(collId);
      const nxt = COLLECTION_ORDER[cur + 1];
      if (nxt) {
        const nxtCards = allCardsByCollectionRef.current[nxt] || [];
        for (let i = 0; i <= PRELOAD_RADIUS && i < nxtCards.length; i++) {
          preloadCardImage(nxtCards[i].image);
        }
      }
    }

    if (idx <= 0) {
      const cur = COLLECTION_ORDER.indexOf(collId);
      const prv = COLLECTION_ORDER[cur - 1];
      if (prv) {
        const prvCards = allCardsByCollectionRef.current[prv] || [];
        for (let d = 0; d <= PRELOAD_RADIUS && d < prvCards.length; d++) {
          preloadCardImage(prvCards[prvCards.length - 1 - d].image);
        }
      }
    }
  }, [preloadCardImage]);

  useEffect(() => { activeEmoteRef.current = activeEmote; }, [activeEmote]);
  useEffect(() => { modalCollectionRef.current = modalCollection; }, [modalCollection]);
  useEffect(() => { modalIndexRef.current = modalIndex; }, [modalIndex]);
  useEffect(() => { allCardsByCollectionRef.current = allCardsByCollection; }, [allCardsByCollection]);

  useEffect(() => {
    return () => {
      cardTimeoutsRef.current.forEach(t => clearTimeout(t));
      cardTimeoutsRef.current = [];
    };
  }, []);

  // ---- Modal navigation (with slide transition) ----
  const navigateModalCard = useCallback((direction: 1 | -1) => {
    cardTimeoutsRef.current.forEach(t => clearTimeout(t));
    cardTimeoutsRef.current = [];

    modalOverscrollRef.current = 0;
    setModalHintProgress(0);
    setModalHintDirection(null);

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

    const dirLabel: "next" | "prev" = direction > 0 ? "next" : "prev";
    const crossing = nextColl !== mc;

    const exitMs = crossing ? CARD_CROSSING_EXIT_MS : CARD_EXIT_MS;
    const enterMs = crossing ? CARD_CROSSING_ENTER_MS : CARD_ENTER_MS;

    setCardTransition({ phase: "leaving", direction: dirLabel, crossing });

    const t1 = setTimeout(() => {
      setModalCollection(nextColl);
      setModalIndex(nextIdx);
      setActiveEmote(newCard);
      preloadAdjacent(nextColl, nextIdx);

      const slug = newCard.name.toLowerCase().replace(/\s+/g, "-");
      router.replace(`/collections/${nextColl}?card=${slug}`, { scroll: false });

      setCardTransition({ phase: "entering", direction: dirLabel, crossing });

      const t2 = setTimeout(() => {
        setCardTransition(null);
      }, enterMs);
      cardTimeoutsRef.current.push(t2);
    }, exitMs);
    cardTimeoutsRef.current.push(t1);
  }, [router, preloadAdjacent]);

  const navigateModalCardRef = useRef(navigateModalCard);
  useEffect(() => { navigateModalCardRef.current = navigateModalCard; }, [navigateModalCard]);

  // ---- Modal scroll (wheel + touch) with cross-collection hint ----
  useEffect(() => {
    let wheelAccum = 0;
    let touchActive = false;
    let touchStartY = 0;
    let touchStartScroll = 0;

    const isModalOpen = () => !!activeEmoteRef.current && !!modalCollectionRef.current;

    const getBoundaryInfo = (goingNext: boolean) => {
      const mc = modalCollectionRef.current;
      const mi = modalIndexRef.current;
      const byColl = allCardsByCollectionRef.current;
      if (!mc) return { atBoundary: false, nextCollSlug: null };

      const cards = byColl[mc] || [];
      const curIdx = COLLECTION_ORDER.indexOf(mc);

      if (goingNext) {
        const atLast = mi >= cards.length - 1;
        const nxt = COLLECTION_ORDER[curIdx + 1];
        if (atLast && nxt && (byColl[nxt] || []).length > 0) {
          return { atBoundary: true, nextCollSlug: nxt };
        }
      } else {
        const atFirst = mi <= 0;
        const prv = COLLECTION_ORDER[curIdx - 1];
        if (atFirst && prv && (byColl[prv] || []).length > 0) {
          return { atBoundary: true, nextCollSlug: prv };
        }
      }
      return { atBoundary: false, nextCollSlug: null };
    };

    const handleWheel = (e: WheelEvent) => {
      if (!isModalOpen()) return;
      e.preventDefault();

      const goingNext = e.deltaY > 0;
      const { atBoundary } = getBoundaryInfo(goingNext);

      if (atBoundary) {
        const direction = goingNext ? "next" : "prev";
        modalOverscrollRef.current += Math.abs(e.deltaY);
        const progress = Math.min(modalOverscrollRef.current / MODAL_OVERSCROLL_TRIGGER, 1);
        setModalHintDirection(direction);
        setModalHintProgress(progress);
        if (progress >= 1) {
          modalOverscrollRef.current = 0;
          setModalHintProgress(0);
          setModalHintDirection(null);
          navigateModalCardRef.current(goingNext ? 1 : -1);
        }
        return;
      }

      if (modalOverscrollRef.current > 0) {
        modalOverscrollRef.current = 0;
        setModalHintProgress(0);
        setModalHintDirection(null);
      }

      wheelAccum += e.deltaY;
      if (Math.abs(wheelAccum) < WHEEL_THRESHOLD) return;
      const direction: 1 | -1 = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;
      navigateModalCardRef.current(direction);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (!isModalOpen()) return;
      const target = e.target as HTMLElement | null;
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
      if (Math.abs(scrollAfter - touchStartScroll) > TOUCH_SCROLL_TOLERANCE) return;

      const delta = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(delta) < TOUCH_THRESHOLD) return;

      const goingNext = delta > 0;
      const { atBoundary } = getBoundaryInfo(goingNext);

      if (atBoundary) {
        const direction = goingNext ? "next" : "prev";
        modalOverscrollRef.current += Math.abs(delta);
        const progress = Math.min(modalOverscrollRef.current / (MODAL_OVERSCROLL_TRIGGER * 0.6), 1);
        setModalHintDirection(direction);
        setModalHintProgress(progress);
        if (progress >= 1) {
          modalOverscrollRef.current = 0;
          setModalHintProgress(0);
          setModalHintDirection(null);
          navigateModalCardRef.current(goingNext ? 1 : -1);
        }
        return;
      }

      if (modalOverscrollRef.current > 0) {
        modalOverscrollRef.current = 0;
        setModalHintProgress(0);
        setModalHintDirection(null);
      }

      navigateModalCardRef.current(goingNext ? 1 : -1);
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

  const closeModal = useCallback(() => {
    cardTimeoutsRef.current.forEach(t => clearTimeout(t));
    cardTimeoutsRef.current = [];
    setCardTransition(null);
    modalOverscrollRef.current = 0;
    setModalHintProgress(0);
    setModalHintDirection(null);

    const coll = modalCollection || id;
    setActiveEmote(null);
    setModalCollection(null);
    setModalIndex(-1);
    router.replace(`/collections/${coll}`, { scroll: false });
  }, [modalCollection, id, router]);

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
        preloadAdjacent(coll, idx);
        return;
      }
    }
  }, [cardParam, allCardsByCollection, preloadAdjacent]);

  const openCard = useCallback((piece: Card, index: number) => {
    setActiveEmote(piece);
    setModalCollection(id);
    setModalIndex(index);
    preloadAdjacent(id, index);
    const slug = piece.name.toLowerCase().replace(/\s+/g, "-");
    router.push(`/collections/${id}?card=${slug}`, { scroll: false });
  }, [id, router, preloadAdjacent]);

  // ---- Open card by name (used by Related panel) ----
  const openCardByName = useCallback((name: string) => {
    for (const coll of COLLECTION_ORDER) {
      const cards = allCardsByCollection[coll] || [];
      const idx = cards.findIndex(c => c.name === name);
      if (idx >= 0) {
        const newCard = cards[idx];
        cardTimeoutsRef.current.forEach(t => clearTimeout(t));
        cardTimeoutsRef.current = [];
        setCardTransition(null);
        modalOverscrollRef.current = 0;
        setModalHintProgress(0);
        setModalHintDirection(null);
        setActiveEmote(newCard);
        setModalCollection(coll);
        setModalIndex(idx);
        preloadAdjacent(coll, idx);
        const slug = newCard.name.toLowerCase().replace(/\s+/g, "-");
        router.replace(`/collections/${coll}?card=${slug}`, { scroll: false });
        return;
      }
    }
  }, [allCardsByCollection, preloadAdjacent, router]);

  if (!art) return null;

  const nextLabel = nextSlug ? (ITEMS.find(i => i.slug === nextSlug)?.label ?? "Next Collection") : "";
  const prevLabel = prevSlug ? (ITEMS.find(i => i.slug === prevSlug)?.label ?? "Previous Collection") : "";

  const modalTransitionClass = cardTransition
    ? ` card-${cardTransition.phase}-${cardTransition.direction}${cardTransition.crossing ? " card-crossing" : ""}`
    : "";

  const modalHintTargetSlug = modalHintDirection === "next"
    ? COLLECTION_ORDER[COLLECTION_ORDER.indexOf(modalCollection || "") + 1]
    : COLLECTION_ORDER[COLLECTION_ORDER.indexOf(modalCollection || "") - 1];
  const modalHintTargetLabel = modalHintTargetSlug
    ? (ITEMS.find(i => i.slug === modalHintTargetSlug)?.label ?? "Next Collection")
    : "";

  return (
    <div className={`collections-page${leaving ? ` leaving-${leaving}` : ""}`}>
      <div style={{ height: "140px" }} aria-hidden="true" />

      {id === "celestial" && (
        <Iridescence color={[1, 1, 1]} mouseReact amplitude={0.1} speed={0.25} className="iridescence-container" />
      )}
      {id === "madolche" && (
        <div className="madolche-bg">
          <Silk speed={5} scale={1} color="#4E2E69" noiseIntensity={1.2} rotation={0} />
        </div>
      )}

      {activeEmote && (
        <div className="emote-modal-overlay" onClick={closeModal}>
          <div
            className={`emote-modal emote-layout${modalTransitionClass}`}
            onClick={e => e.stopPropagation()}
          >
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

          {/* ⭐ Related cards panel (desktop only, hidden via CSS below 1200px) */}
          {relatedCards.length > 0 && (
            <div
              className="related-panel"
              onClick={e => e.stopPropagation()}
            >
              <div className="related-panel__label">Related</div>
              <div className="related-panel__grid">
                {relatedCards.map(rc => (
                  <RelatedCardMini
                    key={rc.name}
                    card={rc}
                    onClick={() => openCardByName(rc.name)}
                  />
                ))}
              </div>
            </div>
          )}

          {modalHintProgress > 0 && modalHintDirection && (
            <div
              className={`collection-hint collection-hint--modal collection-hint--${modalHintDirection}`}
              style={{
                opacity: Math.min(modalHintProgress * 1.4, 1),
                transform: `translateX(-50%) scale(${0.9 + modalHintProgress * 0.1})`,
              }}
            >
              <span className="collection-hint__arrow">
                {modalHintDirection === "next" ? "↓" : "↑"}
              </span>
              <span className="collection-hint__label">
                {modalHintDirection === "next" ? "End of collection" : "Start of collection"}
              </span>
              <span className="collection-hint__title">{modalHintTargetLabel}</span>
            </div>
          )}
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
            <LazyMount
              key={`${piece.name}|${idx}`}
              rootMargin="600px"
              placeholderHeight={560}
            >
              <ProfileCard
                name={piece.name}
                title={
                  piece.type === "Emote"
                    ? (() => {
                        const n = findEmoteCount(piece.name, emoteTotals);
                        return n > 0 ? `Emote • ${n.toLocaleString()}` : "Emote";
                      })()
                    : piece.type
                }
                handle={piece.name.toLowerCase().replace(/\s+/g, "-")}
                status="Online"
                contactText="View"
                avatarUrl={piece.image}
                rarity={rarityMode === 'off' ? undefined : piece.rarity}
                showUserInfo={false}
                enableTilt={true}
                enableMobileTilt={false}
                behindGlowColor={piece.glow || DEFAULT_GLOW}
                iconUrl={null}
                behindGlowEnabled
                innerGradient="linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)"
                onContactClick={() => openCard(piece, idx)}
              />
            </LazyMount>
          ))}
        </div>
      </div>

      {hintProgress > 0 && hintDirection && !leaving && (
        <div
          className={`collection-hint collection-hint--${hintDirection}`}
          style={{
            opacity: Math.min(hintProgress * 1.4, 1),
            transform: `translateX(-50%) scale(${0.9 + hintProgress * 0.1})`,
          }}
        >
          <span className="collection-hint__arrow">
            {hintDirection === "next" ? "↓" : "↑"}
          </span>
          <span className="collection-hint__label">Continue scrolling</span>
          <span className="collection-hint__title">
            {hintDirection === "next" ? nextLabel : prevLabel}
          </span>
        </div>
      )}
    </div>
  );
}