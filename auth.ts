import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import { kv } from "@vercel/kv";

const WELCOME_BONUS = 10000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord({
      issuer: "https://discord.com",
      authorization: { params: { scope: "identify" } },
    }),
    CredentialsProvider({
      id: "discord-dm",
      name: "Discord DM Login",
      credentials: {
        sessionId: { label: "Session ID", type: "text" },
        code: { label: "Code", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.sessionId || !credentials?.code) return null;

        // 1. Check the KV store for the code
        const authSession = await kv.get(`auth_session:${credentials.sessionId}`) as { userId: string, code: string } | null;
        
        if (!authSession) throw new Error("Code expired or invalid session.");
        if (authSession.code !== credentials.code) throw new Error("Incorrect code.");

        // 2. Delete the code so it can't be reused
        await kv.del(`auth_session:${credentials.sessionId}`);

        // 3. Fetch user data (avatar, name, roles) to build the session
        const userId = authSession.userId;
        let name = "Unknown User";
        let image = "https://cdn.discordapp.com/embed/avatars/0.png";
        let roles = { commissioner: false, darsubscribbler: false };

        try {
          // Fetch profile from bot
          const botUrl = process.env.PI_BOT_URL || "";
          const res = await fetch(`${botUrl}/api/user/profile?userId=${userId}`, {
            headers: { Authorization: `Bearer ${process.env.PI_BOT_SECRET}` }
          });
          if (res.ok) {
            const data = await res.json();
            name = data.name;
            image = data.avatarUrl;
          }

          // Fetch roles from KV
          const kvRoles = await kv.get(`account_roles:${userId}`);
          if (kvRoles) {
            roles = {
              commissioner: !!(kvRoles as any).commissioner,
              darsubscribbler: !!(kvRoles as any).darsubscribbler,
            };
          }
        } catch (err) {
          console.error("Failed to fetch user details during DM login", err);
        }

        return { id: userId, name, image, roles };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Grant welcome bonus for standard Discord OAuth
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
            console.error("[web-signin] welcome bonus grant failed:", err);
          }
        }
      }
      return true;
    },
    jwt({ token, account, profile, user }) {
      // Handle OAuth (Discord)
      if (account && profile) {
        token.sub = (profile as any).id ?? token.sub;
      }
      // Handle Credentials (DM Login)
      if (user) {
        token.sub = user.id;
        // @ts-ignore
        token.roles = user.roles;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.roles) {
        // @ts-ignore
        session.user.roles = token.roles;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
});