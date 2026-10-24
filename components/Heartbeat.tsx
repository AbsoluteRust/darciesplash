'use client';

import { useEffect } from 'react';

export default function Heartbeat() {
  useEffect(() => {
    const ping = () => {
      fetch('/api/heartbeat', { method: 'POST' }).catch(() => {});
    };
    
    // Ping immediately on load
    ping();
    
    // Then ping every 60 seconds
    const interval = setInterval(ping, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return null; // This component doesn't render anything visually
}