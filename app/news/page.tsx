'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { useSession } from 'next-auth/react';

type Revision = {
  title: string;
  section: string;
  content: string;
  editedAt: number;
};

type NewsPost = {
  id: string;
  title: string;
  section: string;
  content: string;
  timestamp: number;
  editedAt?: number;
  revisions?: Revision[];
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
  const { data: session } = useSession();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('all');

  // Admin check
  const adminIds = (process.env.NEXT_PUBLIC_ADMIN_IDS || "").split(",").map(id => id.trim());
  const isAdmin = !!session?.user?.id && adminIds.includes(session.user.id);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null);
  
  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formSection, setFormSection] = useState('website');
  const [formContent, setFormContent] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPosts = () => {
    fetch('/api/news')
      .then(res => res.json())
      .then(data => setPosts(data.posts || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const openCreateModal = () => {
    setEditingPost(null);
    setFormTitle('');
    setFormSection('website');
    setFormContent('');
    setIsModalOpen(true);
  };

  const openEditModal = (post: NewsPost) => {
    setEditingPost(post);
    setFormTitle(post.title);
    setFormSection(post.section);
    setFormContent(post.content);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) return;
    setSaving(true);

    const url = editingPost ? '/api/news/edit' : '/api/news/create';
    const body = editingPost 
      ? { id: editingPost.id, title: formTitle, section: formSection, content: formContent }
      : { title: formTitle, section: formSection, content: formContent };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchPosts(); // Refresh list
      } else {
        alert("Failed to save post.");
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredPosts = activeSection === 'all' 
    ? posts 
    : posts.filter(p => p.section === activeSection);

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 md:px-8 max-w-4xl mx-auto">
      
      {/* Header & Create Button */}
      <div className="flex flex-col items-center mb-12 relative">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400 tracking-widest uppercase mb-4">
          News & Updates
        </h1>
        <p className="text-white/50 text-center max-w-lg">
          The latest changelogs for the website, the games, and Darcie's collections.
        </p>
        
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="absolute right-0 top-0 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition"
          >
            + Create Post
          </button>
        )}
      </div>

      {/* Filters */}
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

      {/* Feed */}
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
              className="relative pl-8 md:pl-12 group"
            >
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
                    
                    {/* Edit History Hover Badge */}
                    {post.revisions && post.revisions.length > 0 && (
                      <div className="relative group/edit cursor-help">
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
                          Edited
                        </span>
                        
                        {/* Hover Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-80 bg-[#181820] border border-white/20 rounded-xl p-4 shadow-2xl opacity-0 invisible group-hover/edit:opacity-100 group-hover/edit:visible transition-all z-50 pointer-events-none">
                          <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 border-b border-white/10 pb-1">Edit History</p>
                          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-3">
                            {post.revisions.map((rev, idx) => (
                              <div key={idx} className="text-xs text-white/60 border-l-2 border-indigo-500/30 pl-2">
                                <span className="text-indigo-400 block mb-1">
                                  {new Date(rev.editedAt).toLocaleString()}
                                </span>
                                <p className="line-clamp-3 italic">"{rev.content}"</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Admin Edit Button */}
                    {isAdmin && (
                      <button 
                        onClick={() => openEditModal(post)}
                        className="text-white/30 hover:text-white transition-colors ml-2"
                        title="Edit Post"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                </div>

                <h2 className="text-xl font-bold text-white mb-2">{post.title}</h2>
                
                <div className="text-white/70 text-sm leading-relaxed prose prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      a: ({ node, ...props }) => (
                        <a {...props} className="text-indigo-400 hover:text-indigo-300 underline font-semibold transition-colors" target="_blank" rel="noopener noreferrer" />
                      ),
                      p: ({ node, ...props }) => <p {...props} className="mb-4 last:mb-0" />,
                      strong: ({ node, ...props }) => <strong {...props} className="font-bold text-white" />
                    }}
                  >
                    {post.content}
                  </ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-[#0a0a14] border border-white/10 rounded-3xl p-6 w-full max-w-2xl shadow-2xl flex flex-col gap-4"
            >
              <h2 className="text-2xl font-bold text-white mb-2">{editingPost ? 'Edit Post' : 'Create Post'}</h2>
              
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1">Title</label>
                <input 
                  type="text" 
                  value={formTitle} 
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1">Section</label>
                <select 
                  value={formSection} 
                  onChange={e => setFormSection(e.target.value)}
                  className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="website">Website</option>
                  <option value="games">Games</option>
                  <option value="darcie">Darcie</option>
                  <option value="emotes">Emotes</option>
                  <option value="collections">Collections</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1">Content (Markdown supported)</label>
                <textarea 
                  value={formContent} 
                  onChange={e => setFormContent(e.target.value)}
                  rows={6}
                  className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 resize-none custom-scrollbar"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving || !formTitle || !formContent}
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Post'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}