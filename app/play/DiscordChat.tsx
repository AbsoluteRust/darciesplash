'use client';

import dynamic from 'next/dynamic';

const WidgetBot = dynamic(import('@widgetbot/react-embed'), {
  ssr: false,
});

export default function DiscordChat() {
  return (
    <WidgetBot
      server="1216033209930747904" // Your GUILD_ID
      channel="1549120331866833046" // Your GAME_CHANNEL_ID
      style={{ width: '80%', height: '80%' }}
    />
  );
}