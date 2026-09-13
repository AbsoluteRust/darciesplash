// migrate-cards.js — run with: node migrate-cards.js
require('dotenv').config({ path: '.env.local' });
const { kv } = require('@vercel/kv');

const CARDS = [
  // ---- CELESTIAL ----
  { name: "Stargazer Lily", type: "Splash Art", collection: "celestial", image: "/artpieces/lilyStargazer.png", description: "A depiction of Lily gazing into you from the cosmos.", details: "Created to celebrate 🍌's 24th birthday.", link: "" },
  { name: "Think", type: "Emote", collection: "celestial", image: "/artpieces/celestial/lilyThink.png", description: "Lily pondering the universe.", details: "Get this emote at", link: "https://discord.gg/jbu5RNJ6dA" },
  { name: "Boop", type: "Emote", collection: "celestial", image: "/artpieces/celestial/lilyBoop.gif", description: "Lily giving Rasmus a gift from the stars: a lil boop :D", details: "Get the emote and sticker here:", link: "https://discord.gg/x4gJvderCB" },
  { name: "Celebration", type: "Emote", collection: "celestial", image: "/artpieces/celestial/lilyCelebration.gif", description: "Lily celebrating something awesome!", details: "Get the emote here:", link: "https://discord.gg/M3YH4A278x" },
  { name: "Cozy", type: "Emote", collection: "celestial", image: "/artpieces/celestial/lilyCozy.png", description: "Lily so so cozy and so so happy to be so cozy.", details: "Get the emote here:", link: "https://discord.gg/M3YH4A278x" },
  { name: "Selfie", type: "Mobile Wallpaper", collection: "celestial", image: "/artpieces/celestial/lilySelfie.png", description: "She's sending you a quick pre-battle selfie :D", details: "", link: "" },
  { name: "Doll", type: "Emote", collection: "celestial", image: "/artpieces/celestial/lilyDoll.png", description: "Lily in adorable doll form.", details: "Get the emote here:", link: "https://discord.gg/M3YH4A278x" },
  { name: "Fishing", type: "Emote", collection: "celestial", image: "/artpieces/celestial/lilyFishing.png", description: "gone fishin'", details: "Get the emote here:", link: "https://discord.gg/M3YH4A278x" },
  { name: "Goddess", type: "Splash Art", collection: "celestial", image: "/artpieces/celestial/lilyGosling.png", description: "What a day, hmm? You look lonely. I can fix that. You look like a good joe.", details: "Created to celebrate 🍌's 26th birthday", link: "" },
  { name: "Happy", type: "Emote", collection: "celestial", image: "/artpieces/celestial/lilyHappy.png", description: "happiness.", details: "Get the emote here:", link: "https://discord.gg/fAMQSdwtnx" },
  { name: "Darcie", type: "Splash Art", collection: "celestial", image: "/artpieces/celestial/lilyDarcie.png", description: "Lily hanging out with Darcie.", details: "", link: "" },
  { name: "Lb", type: "Emote", collection: "celestial", image: "/artpieces/celestial/lilyLb.gif", description: "Definetly not Leblanc", details: "Get the emote here:", link: "https://discord.gg/dc7ywjB" },
  { name: "Milk", type: "Emote", collection: "celestial", image: "/artpieces/celestial/lilyMilk.png", description: "Lily sippin milk.", details: "Get the emote here:", link: "https://discord.gg/dc7ywjB" },
  { name: "Pout", type: "Emote", collection: "celestial", image: "/artpieces/celestial/lilyPout.png", description: "Lily pouting dramatically.", details: "Get the emote here:", link: "https://discord.gg/fAMQSdwtnx" },
  { name: "Sit", type: "Emote", collection: "celestial", image: "/artpieces/celestial/lilySit.png", description: "Lily sit", details: "Get the emote here:", link: "https://discord.gg/soraka" },
  { name: "InDaCave", type: "Sticker", collection: "celestial", image: "/artpieces/celestial/lilyInDaCave.png", description: "Lily chilling in the cave.", details: "Get the sticker here:", link: "https://discord.gg/HuMQzhXFd7" },
  { name: "Sleep", type: "Emote", collection: "celestial", image: "/artpieces/celestial/lilySleep.png", description: "Lily long gone to the land of dreams", details: "Get the emote here:", link: "https://discord.gg/M3YH4A278x" },
  { name: "SleepingTotallyDefinitely", type: "Emote", collection: "celestial", image: "/artpieces/celestial/lilySleepingTotallyDefinetly.png", description: "Lily is absolutely, definitely, sleeping. totally. yep. don't even question it.", details: "Get the emote here:", link: "https://discord.gg/M3YH4A278x" },
  { name: "Sitell Doll", type: "Emote", collection: "celestial", image: "/artpieces/celestial/lilySitellDoll.png", description: "Lily sitting in doll form.", details: "Get the sticker here:", link: "https://discord.gg/DBp6pB8R3N" },
  { name: "Sitgwen Doll", type: "Emote", collection: "celestial", image: "/artpieces/celestial/lilySitgwenDoll.png", description: "Gwen doll sitting with Lily energy.", details: "Get the sticker here:", link: "https://discord.gg/RZ4qWae" },
  { name: "Sitlily Doll", type: "Emote", collection: "celestial", image: "/artpieces/celestial/lilySitlilyDoll.png", description: "Another adorable Lily doll sitting.", details: "Get the sticker here:", link: "https://discord.gg/RZ4qWae" },
  { name: "Lux Hug Lily Doll", type: "Emote", collection: "celestial", image: "/artpieces/celestial/luxHugLilyDoll.png", description: "Lux hugging Lily doll tightly.", details: "Get the sticker here:", link: "https://discord.gg/WA5jN9r2Ad" },
  { name: "SitCat", type: "Emote", collection: "celestial", image: "/artpieces/celestial/lilySitCat.png", description: "Lily's original form, sitting", details: "", link: "" },
  { name: "Lul", type: "Emote", collection: "celestial", image: "/artpieces/celestial/lilyLul.png", description: "Lily laughing her heart out.", details: "Get the emote here:", link: "https://discord.gg/M3YH4A278x" },
  { name: "Love", type: "Emote", collection: "celestial", image: "/artpieces/celestial/lilyLove.png", description: "Lily surrounded by hearts and pure affection.", details: "Get the emote here:", link: "https://discord.gg/M3YH4A278x" },
  { name: "Uhoh", type: "Emote", collection: "celestial", image: "/artpieces/celestial/lilyUhoh.png", description: "Holding back tears, or Concerned?", details: "Get the emote here:", link: "https://discord.gg/V8X9G7UuwU" },
  { name: "ThisIsFine", type: "Emote", collection: "celestial", image: "/artpieces/celestial/lilyThisIsFine.gif", description: "This is fine.", details: "Get the emote here:", link: "https://discord.gg/V8X9G7UuwU" },
  { name: "Banana", type: "Emote", collection: "celestial", image: "/artpieces/celestial/banana.png", description: "A Banana from the celestial realm.", details: "Get the emote here:", link: "https://discord.gg/dc7ywjB" },
  { name: "Heart", type: "Emote", collection: "celestial", image: "/artpieces/celestial/heart.png", description: "A Heart from the celestial realm.", details: "Get the emote here:", link: "https://discord.gg/dc7ywjB" },
  { name: "HeartExclamation", type: "Emote", collection: "celestial", image: "/artpieces/celestial/heart_exclamation.png", description: "A Heart Exclamation from the celestial realm.", details: "Get the emote here:", link: "https://discord.gg/dc7ywjB" },
  { name: "RevolvingHearts", type: "Emote", collection: "celestial", image: "/artpieces/celestial/revolving_hearts.png", description: "Revolving Hearts from the celestial realm.", details: "Get the emote here:", link: "https://discord.gg/dc7ywjB" },
  { name: "Sparkle", type: "Emote", collection: "celestial", image: "/artpieces/celestial/sparkle.png", description: "A Sparkle from the celestial realm.", details: "Get the emote here:", link: "https://discord.gg/dc7ywjB" },
  { name: "SparklingHeart", type: "Emote", collection: "celestial", image: "/artpieces/celestial/sparkling_heart.png", description: "A Sparkling Heart from the celestial realm.", details: "Get the emote here:", link: "https://discord.gg/dc7ywjB" },
  { name: "TwoHearts", type: "Emote", collection: "celestial", image: "/artpieces/celestial/two_hearts.png", description: "Two Hearts from the celestial realm.", details: "Get the emote here:", link: "https://discord.gg/dc7ywjB" },

  // ---- MADOLCHE ----
  { name: "Little Magileine", type: "Splash Art", collection: "madolche", image: "/artpieces/magiBoom.png", description: "", details: "", link: "" },
  { name: "Jingliu Doll", type: "Emote", collection: "madolche", image: "/artpieces/madolche/jingliuDoll.png", description: "Jingliu in adorable doll form.", details: "", link: "" },
  { name: "Jingliu Nom", type: "Emote", collection: "madolche", image: "/artpieces/madolche/jingliuNom.png", description: "Jingliu enjoying a tasty bite.", details: "", link: "" },
  { name: "Magi Despair", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiDespair.png", description: "Magi in full despair mode.", details: "", link: "" },
  { name: "Magi Gasp", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiGasp.png", description: "Magi gasping dramatically.", details: "", link: "" },
  { name: "Magi Gift", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiGift.png", description: "Magi offering a cute gift.", details: "", link: "" },
  { name: "Magi Birthday", type: "Splash Art", collection: "madolche", image: "/artpieces/madolche/magiBirthday.png", description: "Magi celebrating a special birthday.", details: "", link: "" },
  { name: "Magi Happy", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiHappy.png", description: "Magi smiling with pure joy.", details: "", link: "" },
  { name: "Magi Headempty", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiHeadempty.png", description: "Magi with head totally empty.", details: "", link: "" },
  { name: "Magi Heart", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiHeart.png", description: "Magi sending heart energy.", details: "", link: "" },
  { name: "Frieren Dolls", type: "Emote", collection: "madolche", image: "/artpieces/madolche/frierenDolls.png", description: "Frieren doll collection moment.", details: "", link: "" },
  { name: "Magi Hehe", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiHehe.png", description: "Magi giggling softly.", details: "", link: "" },
  { name: "Magi Hmph", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiHmph.png", description: "Magi giving a little hmph.", details: "", link: "" },
  { name: "Magi Horse", type: "Splash Art", collection: "madolche", image: "/artpieces/madolche/magiHorse.png", description: "Magi with a majestic horse.", details: "", link: "" },
  { name: "Magi Hug Lily", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiHuglily.png", description: "Magi hugging Lily warmly.", details: "", link: "" },
  { name: "Magi Hug Ralts", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiHugRalts.png", description: "Magi hugging Ralts tightly.", details: "", link: "" },
  { name: "Magi Huh", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiHuh.png", description: "Magi confused and adorable.", details: "", link: "" },
  { name: "Magi Mad", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiMad.png", description: "Magi getting a little spicy.", details: "", link: "" },
  { name: "Magi Nope", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiNope.png", description: "Magi absolutely saying nope.", details: "", link: "" },
  { name: "Magi Oh Snap", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiOhSnap.png", description: "Magi reacting with an oh snap.", details: "", link: "" },
  { name: "Magi Pichu Hug", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiPichuhug.png", description: "Magi hugging Pichu adorably.", details: "", link: "" },
  { name: "Magi Proud", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiPROUD.png", description: "Magi feeling very proud.", details: "", link: "" },
  { name: "Magi Read", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiRead.png", description: "Magi reading intently.", details: "", link: "" },
  { name: "Magi Shrug", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiShrug.png", description: "Magi shrugging it off.", details: "", link: "" },
  { name: "Magi Sigh", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiSigh.png", description: "Magi letting out a sigh.", details: "", link: "" },
  { name: "Magi Sip", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiSip.png", description: "Magi sipping something tasty.", details: "", link: "" },
  { name: "Magi Sit", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiSit.png", description: "Magi sitting calmly.", details: "", link: "" },
  { name: "Magis Mug", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magisMug.png", description: "Magi with a signature mug.", details: "", link: "" },
  { name: "Magi Snooze", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiSnooze.png", description: "Magi snoozing peacefully.", details: "", link: "" },
  { name: "Magi Stamp", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiStamp.png", description: "Magi stamping approval.", details: "", link: "" },
  { name: "Magi Think", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiThink.png", description: "Magi deep in thought.", details: "", link: "" },
  { name: "Magi Thumbsup", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiThumbsup.png", description: "Magi giving a confident thumbs up.", details: "", link: "" },
  { name: "Magi WAAA", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiWAAA.png", description: "Magi screaming WAAAA.", details: "", link: "" },
  { name: "Magi Wave", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiWave.png", description: "Magi waving hello.", details: "", link: "" },
  { name: "Magi Whaat", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiWhaat.png", description: "Magi reacting with a big whaat.", details: "", link: "" },
  { name: "Magi Wink", type: "Emote", collection: "madolche", image: "/artpieces/madolche/magiWink.png", description: "Magi giving a cheeky wink.", details: "", link: "" },
  { name: "Mavuika Doll", type: "Emote", collection: "madolche", image: "/artpieces/madolche/mavuikaDoll.png", description: "Mavuika in cute doll form.", details: "", link: "" },

  // ---- TOBI ----
  { name: "Tobi Drip", type: "Splash Art", collection: "tobi", image: "/artpieces/tobi/tobiDrip.png", description: "Tobi showing off some serious drip.", details: "", link: "" },
  { name: "Tobi Picnic", type: "Splash Art", collection: "tobi", image: "/artpieces/tobi/tobiPicnic.png", description: "A peaceful picnic moment with Tobi.", details: "", link: "" },
  { name: "Tobi Twenty Three", type: "Splash Art", collection: "tobi", image: "/artpieces/tobi/tobiTwentyThree.png", description: "Tobi celebrating twenty‑three in style.", details: "", link: "" },
  { name: "Tobi Twenty Two", type: "Splash Art", collection: "tobi", image: "/artpieces/tobi/tobiTwentyTwo.png", description: "Tobi's vibrant twenty‑two artwork.", details: "", link: "" },
  { name: "Tobi Gift", type: "Emote", collection: "tobi", image: "/artpieces/tobi/tobiGift.png", description: "Tobi offering a thoughtful gift.", details: "", link: "" },
  { name: "Tobi Hug", type: "Emote", collection: "tobi", image: "/artpieces/tobi/tobiHug.png", description: "A warm and gentle Tobi hug.", details: "", link: "" },
  { name: "Tobi Nom", type: "Emote", collection: "tobi", image: "/artpieces/tobi/tobiNom.png", description: "Tobi enjoying a tasty bite.", details: "", link: "" },
  { name: "Tobi Sparkle", type: "Emote", collection: "tobi", image: "/artpieces/tobi/tobiSparkle.png", description: "Tobi sparkling with energy.", details: "", link: "" },
  { name: "Tobi BLEP", type: "Emote", collection: "tobi", image: "/artpieces/tobi/tobiTongue.png", description: "Tobi sticking out a playful tongue.", details: "", link: "" },

  // ---- DARCIE ----
  { name: "Sleepy heads", type: "Splash Art", collection: "darcie", image: "/artpieces/darcie/darCollection.png", description: "darcie & quinn", details: "", link: "" },

  // ---- HALO ----
  { name: "Halo Art", type: "Splash Art", collection: "halo", image: "/artpieces/allComms/haloCollection.png", description: "", details: "", link: "" },
];

(async () => {
  console.log('Fetching existing KV cards...');
  const existing = (await kv.get('cards')) || [];
  console.log('Existing KV cards:', existing.length);

  // Merge by name — existing KV entries take priority, then add any static ones missing
  const byName = new Map();
  for (const c of existing) byName.set(c.name.toLowerCase(), c);
  for (const c of CARDS) {
    const key = c.name.toLowerCase();
    if (!byName.has(key)) byName.set(key, c);
  }

  const merged = Array.from(byName.values());
  await kv.set('cards', merged);
  console.log(`Wrote ${merged.length} cards to KV (added ${merged.length - existing.length} new)`);
  process.exit(0);
})();