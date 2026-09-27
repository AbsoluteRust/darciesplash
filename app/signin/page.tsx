import { signIn } from "@/auth";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="signin-page">
      <div className="signin-card">
        <h1>Sign in</h1>
        <p>Connect your Discord account to see your card collection on the site.</p>
        <form
          action={async () => {
            "use server";
            await signIn("discord", { redirectTo: "/" });
          }}
        >
          <button type="submit" className="signin-discord-btn">
            <DiscordIcon />
            Continue with Discord
          </button>
        </form>
        <Link href="/" className="signin-back">← Back to the site</Link>
      </div>
    </div>
  );
}

function DiscordIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.32 4.37A19.79 19.79 0 0 0 15.43 3a.07.07 0 0 0-.07.03c-.21.38-.45.87-.61 1.25a18.27 18.27 0 0 0-5.49 0 12.4 12.4 0 0 0-.62-1.25A.08.08 0 0 0 8.57 3a19.74 19.74 0 0 0-4.89 1.37.07.07 0 0 0-.03.03A20.23 20.23 0 0 0 .1 17.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .08-.03 14.2 14.2 0 0 0 1.23-2 .08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1-.01-.13 10.2 10.2 0 0 0 .37-.29.07.07 0 0 1 .08 0 14.2 14.2 0 0 0 12.05 0 .07.07 0 0 1 .08 0c.12.1.25.2.37.29a.08.08 0 0 1-.01.13c-.6.35-1.22.64-1.87.89a.08.08 0 0 0-.04.11c.36.7.77 1.36 1.23 2a.08.08 0 0 0 .08.03 19.85 19.85 0 0 0 6.01-3.03.08.08 0 0 0 .03-.06 20.16 20.16 0 0 0-3.54-12.66.06.06 0 0 0-.03-.03ZM8.02 14.55c-1.18 0-2.15-1.08-2.15-2.41 0-1.33.95-2.41 2.15-2.41 1.2 0 2.17 1.09 2.15 2.41 0 1.33-.95 2.41-2.15 2.41Zm7.97 0c-1.18 0-2.15-1.08-2.15-2.41 0-1.33.95-2.41 2.15-2.41 1.2 0 2.17 1.09 2.15 2.41 0 1.33-.95 2.41-2.15 2.41Z" />
    </svg>
  );
}