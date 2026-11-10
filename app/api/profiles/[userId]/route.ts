  // Fetch Rich Streak Breakdown (via Bot)
  let streakTotal = 0;
  let streakScore = 0;
  let streakBreakdown: any[] = [];
  try {
    const streakRes = await fetch(`${botUrl}/api/user/streak-breakdown?userId=${userId}`, { headers: botHeaders, cache: "no-store" });
    if (streakRes.ok) {
      const data = await streakRes.json();
      streakTotal = data.total || 0;
      streakScore = data.streakScore || 0;
      streakBreakdown = data.breakdown || [];
    }
  } catch (err) {
    console.error("Failed to fetch streak breakdown:", err);
  }

  // ...

  return NextResponse.json({
    id: userId,
    ...userInfo,
    isOnline,
    badges,
    emotes,
    customColor,
    inventory,
    favorites,
    stats: {
      stardust,
      collectorPoints,
      packPoints,
      streakTotal,
      streakScore,
      streakBreakdown,
    }
  });