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

        const authSession = await kv.get(`auth_session:${credentials.sessionId}`) as { userId: string, code: string } | null;
        
        if (!authSession) throw new Error("Code expired or invalid session.");
        if (authSession.code !== credentials.code) throw new Error("Incorrect code.");

        await kv.del(`auth_session:${credentials.sessionId}`);

        const userId = authSession.userId.trim();

        if (!/^\d{17,20}$/.test(userId)) {
          throw new Error("Invalid Discord User ID format.");
        }

        let name = "Unknown User";
        let image = "https://cdn.discordapp.com/embed/avatars/0.png";
        let roles = { commissioner: false, darsubscribbler: false };

        try {
          const botUrl = process.env.PI_BOT_URL || "";
          const res = await fetch(`${botUrl}/api/user/profile?userId=${userId}`, {
            headers: { Authorization: `Bearer ${process.env.PI_BOT_SECRET}` }
          });
          
          if (!res.ok) throw new Error("User not found.");

          const data = await res.json();
          name = data.name;
          image = data.avatarUrl;

          const kvRoles = await kv.get(`account_roles:${userId}`);
          if (kvRoles) {
            roles = {
              commissioner: !!(kvRoles as any).commissioner,
              darsubscribbler: !!(kvRoles as any).darsubscribbler,
            };
          }
        } catch (err) {
          throw new Error("Invalid Discord User ID. Please check the ID and try again.");
        }

        return { id: userId, name, image, roles };
      }
    })
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
            console.error("[web-signin] welcome bonus grant failed:", err);
          }
        }
      }
      return true;
    },
    jwt({ token, account, profile, user }) {
      // FIX: Only use 'user' object if it's a DM Login, otherwise use the Discord profile ID
      if (account?.provider === "discord-dm" && user) {
        token.sub = user.id;
        // @ts-ignore
        token.roles = user.roles;
      } else if (account?.provider === "discord" && profile) {
        token.sub = String((profile as any).id ?? token.sub);
      }
      return token;
    },
    session({ session, token }) {
      // STRICT VALIDATION: Only accept valid Discord IDs into the session
      const sub = token.sub ? String(token.sub) : '';
      if (/^\d{17,20}$/.test(sub)) {
        session.user.id = sub;
      } else {
        // Clear any stale/invalid ID so downstream routes see no user
        (session.user as any).id = undefined;
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