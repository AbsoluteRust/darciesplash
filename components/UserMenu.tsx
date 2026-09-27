"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Me = {
  signedIn: boolean;
  user?: { id: string; name: string | null; image: string | null };
  roles?: { commissioner: boolean; darsubscribbler: boolean };
};

export default function UserMenu() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (!cancelled) setMe(d); })
      .catch(() => { if (!cancelled) setMe({ signedIn: false }); });
    return () => { cancelled = true; };
  }, []);

  if (!me) return null;

  if (!me.signedIn) {
    return (
      <Link href="/signin" className="user-menu user-menu--signed-out">
        Sign in
      </Link>
    );
  }

  return (
    <Link href="/profile" className="user-menu user-menu--signed-in">
      {me.user?.image && (
        <img src={me.user.image} alt="" className="user-menu__avatar" />
      )}
      <span className="user-menu__name">{me.user?.name ?? "Profile"}</span>
    </Link>
  );
}