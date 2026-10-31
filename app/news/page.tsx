'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

type NewsPost = {
  id: string;
  title: string;
  section: string;
  content: string;
  timestamp: number;
  author: {
    name: string;
    avatar: string;
  };
};

const SECTIONS = [
  { id: 'all', label: 'All Updates' },
  { id: 'website', label: 'Website' },
  { id: 'games', label: 'Games' },
  { id: 'darcie', label: 'Darcie' },
  { id: 'emotes', label: 'Emotes' },
  { id: 'collections', label: 'Collections' },
];

const SECTION_COLORS: Record<string, string> = {
  website: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  games: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  darcie: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  emotes: 'bg-green-500/20 text-green-300 border-green-500/30',
  collections: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
};

export default function NewsPage() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('all');

  useEffect(() => {
    fetch('/api/news')
      .then(res => res.json())
      .then(data => setPosts(data.posts || []))
      .finally(() => setLoading(false));
  }, []);

  const filteredPosts = activeSection === 'all' 
    ? posts 
    : posts.filter(p => p.section === activeSection);

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 md:px-8 max-w-4xl mx-auto">
      <div className="flex flex-col items-center mb-12">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400 tracking-widest uppercase mb-4">
          News & Updates
        </h1>
        <p className="text-white/50 text-center max-w-lg">
          The latest changelogs for the website, the games, and Darcie's collections.
        </p>
      </div>

      {/* Section Filters */}
      <div className="flex flex-wrap justify-center gap-2 mb-12">
        {SECTIONS.map(sec => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`
              px-4 py-2 rounded-full text-sm font-bold transition-all border
              ${activeSection === sec.id 
                ? 'bg-white text-black border-white' 
                : 'bg-transparent text-white/60 border-white/10 hover:bg-white/5 hover:text-white'
              }
            `}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {/* News Feed */}
      {loading ? (
        <div className="text-center text-white/50 animate-pulse">Loading feed...</div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center text-white/50 italic">No updates in this section yet.</div>
      ) : (
        <div className="relative border-l border-white/10 ml-4 md:ml-6 space-y-12 pb-12">
          {filteredPosts.map((post, i) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              key={post.id} 
              className="relative pl-8 md:pl-12"
            >
              {/* Timeline Dot */}
              <div className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
              
              <div className="bg-[#0a0a14]/80 border border-white/10 rounded-2xl p-6 shadow-xl hover:border-white/20 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <img src={post.author.avatar} alt={post.author.name} className="w-8 h-8 rounded-full border border-white/20" />
                    <span className="text-white/80 font-bold">{post.author.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${SECTION_COLORS[post.section] || 'bg-white/10 text-white/70'}`}>
                      {post.section}
                    </span>
                    <span className="text-white/40 text-xs">
                      {new Date(post.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-white mb-2">{post.title}</h2>
                <div className="text-white/70 whitespace-pre-wrap text-sm leading-relaxed">
                  {post.content}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}