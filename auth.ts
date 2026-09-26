import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord({
      authorization: { params: { scope: "identify" } },
    }),
  ],
  callbacks: {
    jwt({ token, account, profile }) {
      if (account && profile) {
        // Discord's profile.id is the snowflake — pin it to the token
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