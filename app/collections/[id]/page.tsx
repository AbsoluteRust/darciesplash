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

const COLLECTION_ART = {
  celestial: [
  {
    name: "Stargazer Lily",
    type: "Splash Art",
    image: "/artpieces/lilyStargazer.png",
    glow: "rgba(125, 190, 255, 0.67)",
    description: "A depiction of Lily gazing into you from the cosmos.",
    details: "Created to celebrate 🍌's 24th birthday."
  },
  {
    name: "Think",
    type: "Emote",
    image: "/artpieces/celestial/lilyThink.png",
    glow: "rgba(125, 190, 255, 0.67)",
    description: "Lily pondering the universe.",
    details: "Get this emote at",
	link: "https://discord.gg/jbu5RNJ6dA",
  },
  {
  name: "Boop",
  type: "Emote",
  image: "/artpieces/celestial/lilyBoop.gif",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Lily giving Rasmus a gift from the stars: a lil boop :D",
  details: "Get the emote and sticker here:",
  link: "https://discord.gg/x4gJvderCB"
},
{
  name: "Celebration",
  type: "Emote",
  image: "/artpieces/celestial/lilyCelebration.gif",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Lily celebrating something awesome!",
  details: "Get the emote here:",
  link: "https://discord.gg/M3YH4A278x"
},
{
  name: "Cozy",
  type: "Emote",
  image: "/artpieces/celestial/lilyCozy.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Lily so so cozy and so so happy to be so cozy.",
  details: "Get the emote here:",
  link: "https://discord.gg/M3YH4A278x"
},
  {
    name: "Selfie",
    type: "Mobile Wallpaper",
    image: "/artpieces/celestial/lilySelfie.png",
    glow: "rgba(125, 190, 255, 0.67)",
    description: "She's sending you a quick pre-battle selfie :D",
    details: "",
	link: "",
  },
{
  name: "Doll",
  type: "Emote",
  image: "/artpieces/celestial/lilyDoll.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Lily in adorable doll form.",
  details: "Get the emote here:",
  link: "https://discord.gg/M3YH4A278x"
},
{
  name: "Fishing",
  type: "Emote",
  image: "/artpieces/celestial/lilyFishing.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "gone fishin'",
  details: "Get the emote here:",
  link: "https://discord.gg/M3YH4A278x"
},
{
  name: "Goddess",
  type: "Splash Art",
  image: "/artpieces/celestial/lilyGosling.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "What a day, hmm? You look lonely. I can fix that. You look like a good joe.",
  details: "Created to celebrate 🍌's 26th birthday",
  link: ""
},
{
  name: "Happy",
  type: "Emote",
  image: "/artpieces/celestial/lilyHappy.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "happiness.",
  details: "Get the emote here:",
  link: "https://discord.gg/fAMQSdwtnx"
},
{
  name: "Darcie",
  type: "Splash Art",
  image: "/artpieces/celestial/lilyDarcie.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Lily hanging out with Darcie.",
  details: "",
  link: ""
},
{
  name: "Lb",
  type: "Emote",
  image: "/artpieces/celestial/lilyLb.gif",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Definetly not Leblanc",
  details: "Get the emote here:",
  link: "https://discord.gg/dc7ywjB"
},
{
  name: "Milk",
  type: "Emote",
  image: "/artpieces/celestial/lilyMilk.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Lily sippin milk.",
  details: "Get the emote here:",
  link: "https://discord.gg/dc7ywjB"
},
{
  name: "Pout",
  type: "Emote",
  image: "/artpieces/celestial/lilyPout.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Lily pouting dramatically.",
  details: "Get the emote here:",
  link: "https://discord.gg/fAMQSdwtnx"
},
{
  name: "Sit",
  type: "Emote",
  image: "/artpieces/celestial/lilySit.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Lily sit",
  details: "Get the emote here:",
  link: "https://discord.gg/soraka"
},
{
  name: "InDaCave",
  type: "Sticker",
  image: "/artpieces/celestial/lilyInDaCave.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Lily chilling in the cave.",
  details: "Get the sticker here:",
  link: "https://discord.gg/HuMQzhXFd7"
},
{
  name: "Sleep",
  type: "Emote",
  image: "/artpieces/celestial/lilySleep.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Lily long gone to the land of dreams",
  details: "Get the emote here:",
  link: "https://discord.gg/M3YH4A278x"
},
{
  name: "SleepingTotallyDefinitely",
  type: "Emote",
  image: "/artpieces/celestial/lilySleepingTotallyDefinetly.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Lily is absolutely, definitely, sleeping. totally. yep. don't even question it.",
  details: "Get the emote here:",
  link: "https://discord.gg/M3YH4A278x"
},
{
  name: "Sitell Doll",
  type: "Emote",
  image: "/artpieces/celestial/lilySitellDoll.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Lily sitting in doll form.",
  details: "Get the sticker here:",
  link: "https://discord.gg/DBp6pB8R3N"
},
{
  name: "Sitgwen Doll",
  type: "Emote",
  image: "/artpieces/celestial/lilySitgwenDoll.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Gwen doll sitting with Lily energy.",
  details: "Get the sticker here:",
  link: "https://discord.gg/RZ4qWae"
},
{
  name: "Sitlily Doll",
  type: "Emote",
  image: "/artpieces/celestial/lilySitlilyDoll.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Another adorable Lily doll sitting.",
  details: "Get the sticker here:",
  link: "https://discord.gg/RZ4qWae"
},
{
  name: "Lux Hug Lily Doll",
  type: "Emote",
  image: "/artpieces/celestial/luxHugLilyDoll.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Lux hugging Lily doll tightly.",
  details: "Get the sticker here:",
  link: "https://discord.gg/WA5jN9r2Ad"
},
{
  name: "SitCat",
  type: "Emote",
  image: "/artpieces/celestial/lilySitCat.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Lily's original form, sitting",
  details: "",
  link: ""
},
{
  name: "Lul",
  type: "Emote",
  image: "/artpieces/celestial/lilyLul.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Lily laughing her heart out.",
  details: "Get the emote here:",
  link: "https://discord.gg/M3YH4A278x"
},
{
  name: "Love",
  type: "Emote",
  image: "/artpieces/celestial/lilyLove.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Lily surrounded by hearts and pure affection.",
  details: "Get the emote here:",
  link: "https://discord.gg/M3YH4A278x"
},
{
  name: "Uhoh",
  type: "Emote",
  image: "/artpieces/celestial/lilyUhoh.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Holding back tears, or Concerned?",
  details: "Get the emote here:",
  link: "https://discord.gg/V8X9G7UuwU"
},
{
  name: "ThisIsFine",
  type: "Emote",
  image: "/artpieces/celestial/lilyThisIsFine.gif",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "This is fine.",
  details: "Get the emote here:",
  link: "https://discord.gg/V8X9G7UuwU"
},
{
  name: "Banana",
  type: "Emote",
  image: "/artpieces/celestial/banana.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "A Banana from the celestial realm.",
  details: "Get the emote here:",
  link: "https://discord.gg/dc7ywjB"
},
{
  name: "Heart",
  type: "Emote",
  image: "/artpieces/celestial/heart.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "A Heart from the celestial realm.",
  details: "Get the emote here:",
  link: "https://discord.gg/dc7ywjB"
},
{
  name: "HeartExclamation",
  type: "Emote",
  image: "/artpieces/celestial/heart_exclamation.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "A Heart Exclamation from the celestial realm.",
  details: "Get the emote here:",
  link: "https://discord.gg/dc7ywjB"
},
{
  name: "RevolvingHearts",
  type: "Emote",
  image: "/artpieces/celestial/revolving_hearts.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Revolving Hearts from the celestial realm.",
  details: "Get the emote here:",
  link: "https://discord.gg/dc7ywjB"
},
{
  name: "Sparkle",
  type: "Emote",
  image: "/artpieces/celestial/sparkle.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "A Sparkle from the celestial realm.",
  details: "Get the emote here:",
  link: "https://discord.gg/dc7ywjB"
},
{
  name: "SparklingHeart",
  type: "Emote",
  image: "/artpieces/celestial/sparkling_heart.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "A Sparkling Heart from the celestial realm.",
  details: "Get the emote here:",
  link: "https://discord.gg/dc7ywjB"
},
{
  name: "TwoHearts",
  type: "Emote",
  image: "/artpieces/celestial/two_hearts.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Two Hearts from the celestial realm.",
  details: "Get the emote here:",
  link: "https://discord.gg/dc7ywjB"
}

  ],
  madolche: [
    { name: "Little Magileine", type: "Splash Art", image: "/artpieces/magiBoom.png", glow: "rgba(255, 180, 220, 0.67)" },
  {
    name: "Jingliu Doll",
    type: "Emote",
    image: "/artpieces/madolche/jingliuDoll.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Jingliu in adorable doll form.",
    details: "",
    link: ""
  },
  {
    name: "Jingliu Nom",
    type: "Emote",
    image: "/artpieces/madolche/jingliuNom.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Jingliu enjoying a tasty bite.",
    details: "",
    link: ""
  },
  {
    name: "Magi Despair",
    type: "Emote",
    image: "/artpieces/madolche/magiDespair.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi in full despair mode.",
    details: "",
    link: ""
  },
  {
    name: "Magi Gasp",
    type: "Emote",
    image: "/artpieces/madolche/magiGasp.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi gasping dramatically.",
    details: "",
    link: ""
  },
  {
    name: "Magi Gift",
    type: "Emote",
    image: "/artpieces/madolche/magiGift.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi offering a cute gift.",
    details: "",
    link: ""
  },
  {
    name: "Magi Birthday",
    type: "Splash Art",
    image: "/artpieces/madolche/magiBirthday.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi celebrating a special birthday.",
    details: "",
    link: ""
  },
  {
    name: "Magi Happy",
    type: "Emote",
    image: "/artpieces/madolche/magiHappy.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi smiling with pure joy.",
    details: "",
    link: ""
  },
  {
    name: "Magi Headempty",
    type: "Emote",
    image: "/artpieces/madolche/magiHeadempty.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi with head totally empty.",
    details: "",
    link: ""
  },
  {
    name: "Magi Heart",
    type: "Emote",
    image: "/artpieces/madolche/magiHeart.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi sending heart energy.",
    details: "",
    link: ""
  },
	{
    name: "Frieren Dolls",
    type: "Emote",
    image: "/artpieces/madolche/frierenDolls.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Frieren doll collection moment.",
    details: "",
    link: ""
  },
  {
    name: "Magi Hehe",
    type: "Emote",
    image: "/artpieces/madolche/magiHehe.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi giggling softly.",
    details: "",
    link: ""
  },
  {
    name: "Magi Hmph",
    type: "Emote",
    image: "/artpieces/madolche/magiHmph.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi giving a little hmph.",
    details: "",
    link: ""
  },
  {
    name: "Magi Horse",
    type: "Splash Art",
    image: "/artpieces/madolche/magiHorse.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi with a majestic horse.",
    details: "",
    link: ""
  },
  {
    name: "Magi Hug Lily",
    type: "Emote",
    image: "/artpieces/madolche/magiHuglily.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi hugging Lily warmly.",
    details: "",
    link: ""
  },
  {
    name: "Magi Hug Ralts",
    type: "Emote",
    image: "/artpieces/madolche/magiHugRalts.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi hugging Ralts tightly.",
    details: "",
    link: ""
  },
  {
    name: "Magi Huh",
    type: "Emote",
    image: "/artpieces/madolche/magiHuh.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi confused and adorable.",
    details: "",
    link: ""
  },
  {
    name: "Magi Mad",
    type: "Emote",
    image: "/artpieces/madolche/magiMad.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi getting a little spicy.",
    details: "",
    link: ""
  },
  {
    name: "Magi Nope",
    type: "Emote",
    image: "/artpieces/madolche/magiNope.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi absolutely saying nope.",
    details: "",
    link: ""
  },
  {
    name: "Magi Oh Snap",
    type: "Emote",
    image: "/artpieces/madolche/magiOhSnap.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi reacting with an oh snap.",
    details: "",
    link: ""
  },
  {
    name: "Magi Pichu Hug",
    type: "Emote",
    image: "/artpieces/madolche/magiPichuhug.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi hugging Pichu adorably.",
    details: "",
    link: ""
  },
  {
    name: "Magi Proud",
    type: "Emote",
    image: "/artpieces/madolche/magiPROUD.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi feeling very proud.",
    details: "",
    link: ""
  },
  {
    name: "Magi Read",
    type: "Emote",
    image: "/artpieces/madolche/magiRead.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi reading intently.",
    details: "",
    link: ""
  },
  {
    name: "Magi Shrug",
    type: "Emote",
    image: "/artpieces/madolche/magiShrug.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi shrugging it off.",
    details: "",
    link: ""
  },
  {
    name: "Magi Sigh",
    type: "Emote",
    image: "/artpieces/madolche/magiSigh.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi letting out a sigh.",
    details: "",
    link: ""
  },
  {
    name: "Magi Sip",
    type: "Emote",
    image: "/artpieces/madolche/magiSip.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi sipping something tasty.",
    details: "",
    link: ""
  },
  {
    name: "Magi Sit",
    type: "Emote",
    image: "/artpieces/madolche/magiSit.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi sitting calmly.",
    details: "",
    link: ""
  },
  {
    name: "Magis Mug",
    type: "Emote",
    image: "/artpieces/madolche/magisMug.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi with a signature mug.",
    details: "",
    link: ""
  },
  {
    name: "Magi Snooze",
    type: "Emote",
    image: "/artpieces/madolche/magiSnooze.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi snoozing peacefully.",
    details: "",
    link: ""
  },
  {
    name: "Magi Stamp",
    type: "Emote",
    image: "/artpieces/madolche/magiStamp.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi stamping approval.",
    details: "",
    link: ""
  },
  {
    name: "Magi Think",
    type: "Emote",
    image: "/artpieces/madolche/magiThink.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi deep in thought.",
    details: "",
    link: ""
  },
  {
    name: "Magi Thumbsup",
    type: "Emote",
    image: "/artpieces/madolche/magiThumbsup.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi giving a confident thumbs up.",
    details: "",
    link: ""
  },
  {
    name: "Magi WAAA",
    type: "Emote",
    image: "/artpieces/madolche/magiWAAA.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi screaming WAAAA.",
    details: "",
    link: ""
  },
  {
    name: "Magi Wave",
    type: "Emote",
    image: "/artpieces/madolche/magiWave.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi waving hello.",
    details: "",
    link: ""
  },
  {
    name: "Magi Whaat",
    type: "Emote",
    image: "/artpieces/madolche/magiWhaat.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi reacting with a big whaat.",
    details: "",
    link: ""
  },
  {
    name: "Magi Wink",
    type: "Emote",
    image: "/artpieces/madolche/magiWink.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Magi giving a cheeky wink.",
    details: "",
    link: ""
  },
  {
    name: "Mavuika Doll",
    type: "Emote",
    image: "/artpieces/madolche/mavuikaDoll.png",
    glow: "rgba(255, 180, 220, 0.67)",
    description: "Mavuika in cute doll form.",
    details: "",
    link: ""
  }
  ],
tobi: [
  {
    name: "Tobi Drip",
    type: "Splash Art",
    image: "/artpieces/tobi/tobiDrip.png",
    glow: "rgba(125, 190, 255, 0.67)",
    description: "Tobi showing off some serious drip.",
    details: "",
    link: ""
  },
  {
    name: "Tobi Picnic",
    type: "Splash Art",
    image: "/artpieces/tobi/tobiPicnic.png",
    glow: "rgba(125, 190, 255, 0.67)",
    description: "A peaceful picnic moment with Tobi.",
    details: "",
    link: ""
  },
  {
    name: "Tobi Twenty Three",
    type: "Splash Art",
    image: "/artpieces/tobi/tobiTwentyThree.png",
    glow: "rgba(125, 190, 255, 0.67)",
    description: "Tobi celebrating twenty‑three in style.",
    details: "",
    link: ""
  },
  {
    name: "Tobi Twenty Two",
    type: "Splash Art",
    image: "/artpieces/tobi/tobiTwentyTwo.png",
    glow: "rgba(125, 190, 255, 0.67)",
    description: "Tobi’s vibrant twenty‑two artwork.",
    details: "",
    link: ""
  },
  {
  name: "Tobi Gift",
  type: "Emote",
  image: "/artpieces/tobi/tobiGift.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Tobi offering a thoughtful gift.",
  details: "",
  link: ""
},
{
  name: "Tobi Hug",
  type: "Emote",
  image: "/artpieces/tobi/tobiHug.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "A warm and gentle Tobi hug.",
  details: "",
  link: ""
},
{
  name: "Tobi Nom",
  type: "Emote",
  image: "/artpieces/tobi/tobiNom.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Tobi enjoying a tasty bite.",
  details: "",
  link: ""
},
{
  name: "Tobi Sparkle",
  type: "Emote",
  image: "/artpieces/tobi/tobiSparkle.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Tobi sparkling with energy.",
  details: "",
  link: ""
},
{
  name: "Tobi BLEP",
  type: "Emote",
  image: "/artpieces/tobi/tobiTongue.png",
  glow: "rgba(125, 190, 255, 0.67)",
  description: "Tobi sticking out a playful tongue.",
  details: "",
  link: ""
}

],
darcie: [
    {
      name: "Sleepy heads",
      type: "Splash Art",
      image: "/artpieces/darcie/darCollection.png",
      glow: "#fff",
      description: "darcie & quinn",
      details: "",
      link: ""
    },
  ],
    halo: [
    {
      name: "Halo Art",
      type: "Splash Art",
      image: "/artpieces/allComms/haloCollection.png",
      glow: "#fff",
      description: "",
      details: "",
      link: ""
    },
  ],
};


const COLLECTION_ORDER = ["darcie", "celestial", "madolche", "tobi", "halo"];

const DEFAULT_GLOW = "rgba(125, 190, 255, 0.67)";

export default function CollectionsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const rawParams = use(params);
  const id = rawParams.id;

  const [activeEmote, setActiveEmote] = useState<Card | null>(null);
  const [nudge, setNudge] = useState(0);
  const [remixExpanded, setRemixExpanded] = useState(false);

  // ---- Dynamic data from KV ----
  const [kvCards, setKvCards] = useState<Card[]>([]);
  const [deletedNames, setDeletedNames] = useState<string[]>([]);

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
        console.error("Failed to load dynamic cards:", err);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ---- Merge hardcoded + KV, apply overrides, filter deleted ----
  const mergedCards = useMemo(() => {
    const base = COLLECTION_ART[id] ?? [];
    const deletedSet = new Set(deletedNames.map(n => n.toLowerCase()));

    // Start with hardcoded, keyed by lowercase name
    const byName = new Map<string, Card>();
    for (const c of base) {
      byName.set(c.name.toLowerCase(), { ...c });
    }

    // Apply KV cards for this collection (merge non-empty fields over hardcoded)
    const kvForCollection = kvCards.filter(c => c.collection === id);
    for (const c of kvForCollection) {
      const key = c.name.toLowerCase();
      const existing = byName.get(key);
      if (existing) {
        const merged: Card = { ...existing };
        for (const k of Object.keys(c) as (keyof Card)[]) {
          const v = c[k];
          if (v !== "" && v != null) merged[k] = v as never;
        }
        byName.set(key, merged);
      } else {
        byName.set(key, { ...c, glow: c.glow || DEFAULT_GLOW });
      }
    }

    return Array.from(byName.values()).filter(c => !deletedSet.has(c.name.toLowerCase()));
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
              key={piece.name}
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