import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { kv } from "@vercel/kv";

const WELCOME_BONUS = 10000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord({
      issuer: "https://discord.com",
      authorization: { params: { scope: "identify" } },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "discord" && profile) {
        const userId = String((profile as any).id ?? "");
        if (userId) {
          try {
            const alreadyClaimed = await kv.hget("welcome_bonus", userId);
            if (!alreadyClaimed) {
              await kv.hincrby("user_scores", userId, WELCOME_BONUS);
              await kv.hset("welcome_bonus", { [userId]: Date.now() });
            }
          } catch (err) {
            // Never block sign-in on a bonus failure
            console.error("[web-signin] welcome bonus grant failed:", err);
          }
        }
      }
      return true;
    },
    jwt({ token, account, profile }) {
      if (account && profile) {
        token.sub = (profile as any).id ?? token.sub;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
});