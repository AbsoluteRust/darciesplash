'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { useSession } from 'next-auth/react';
import TextDiff from '@/components/TextDiff';

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

type Section = {
  id: string;
  label: string;
  color: string;
};

export default function NewsPage() {
  const { data: session } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('all');
  
  const [hoveredDiffId, setHoveredDiffId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/me/admin').then(res => res.json()),
      fetch('/api/news').then(res => res.json()),
      fetch('/api/news/sections').then(res => res.json())
    ]).then(([adminData, newsData, sectionsData]) => {
      setIsAdmin(adminData.isAdmin);
      setPosts(newsData.posts || []);
      setSections(sectionsData.sections || []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || posts.length === 0) return;
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;

    setActiveSection('all');
    setTimeout(() => {
      const element = document.getElementById(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-4', 'ring-offset-black');
        setTimeout(() => element.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-4', 'ring-offset-black'), 2500);
      }
    }, 100);
  }, [loading, posts]);

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/news#${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const getSectionColor = (id: string) => {
    const sec = sections.find(s => s.id === id);
    return sec?.color || '#3b82f6';
  };

  const getSectionLabel = (id: string) => {
    const sec = sections.find(s => s.id === id);
    return sec?.label || id;
  };

  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSection, setFormSection] = useState('general');
  const [formContent, setFormContent] = useState('');
  const [saving, setSaving] = useState(false);

  const openCreateModal = () => {
    setEditingPost(null);
    setFormTitle('');
    setFormSection(sections[0]?.id || 'general');
    setFormContent('');
    setIsPostModalOpen(true);
  };

  const openEditModal = (post: NewsPost) => {
    setEditingPost(post);
    setFormTitle(post.title);
    setFormSection(post.section);
    setFormContent(post.content);
    setIsPostModalOpen(true);
  };

  const handleSavePost = async () => {
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
        setIsPostModalOpen(false);
        fetch('/api/news').then(r => r.json()).then(d => setPosts(d.posts || []));
      } else {
        alert("Failed to save post.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch('/api/news/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) setPosts(prev => prev.filter(p => p.id !== id));
    } catch (err) { alert("Error deleting post."); }
  };

  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionColor, setNewSectionColor] = useState('#3b82f6');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [editingSectionColor, setEditingSectionColor] = useState('#3b82f6');

  const handleCreateSection = async () => {
    if (!newSectionName.trim()) return;
    const res = await fetch('/api/news/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', label: newSectionName.trim(), color: newSectionColor })
    });
    if (res.ok) {
      const data = await res.json();
      setSections(data.sections);
      setNewSectionName('');
      setNewSectionColor('#3b82f6');
    }
  };

  const handleEditSection = async (id: string) => {
    if (!editingSectionName.trim()) return;
    const res = await fetch('/api/news/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit', id, label: editingSectionName.trim(), color: editingSectionColor })
    });
    if (res.ok) {
      const data = await res.json();
      setSections(data.sections);
      setEditingSectionId(null);
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!window.confirm("Delete this section? All posts in it will be moved to 'Latest'.")) return;
    const res = await fetch('/api/news/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id })
    });
    if (res.ok) {
      const data = await res.json();
      setSections(data.sections);
      fetch('/api/news').then(r => r.json()).then(d => setPosts(d.posts || []));
    }
  };

  const filteredPosts = activeSection === 'all' 
    ? posts 
    : posts.filter(p => p.section === activeSection);

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 md:px-8 max-w-4xl mx-auto">
      
      <div className="flex flex-col items-center mb-12 relative">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400 tracking-widest uppercase mb-4">
          News & Updates
        </h1>
        <p className="text-white/50 text-center max-w-lg">
          The latest changelogs for the website, the games, and Darcie's collections.
        </p>
        
        {isAdmin && (
          <div className="absolute right-0 top-0 flex gap-2">
            <button
              onClick={() => setIsSectionModalOpen(true)}
              className="bg-white/10 hover:bg-white/20 text-white text-sm font-bold px-4 py-2 rounded-xl transition"
            >
              ⚙️ Sections
            </button>
            <button
              onClick={openCreateModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition"
            >
              + Create Post
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-12">
        <button
          onClick={() => setActiveSection('all')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${activeSection === 'all' ? 'bg-white text-black border-white' : 'bg-transparent text-white/60 border-white/10 hover:bg-white/5 hover:text-white'}`}
        >
          Latest
        </button>
        {sections.map(sec => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            style={
              activeSection === sec.id 
                ? { backgroundColor: sec.color, borderColor: sec.color, color: '#000' } 
                : {}
            }
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${activeSection !== sec.id ? 'bg-transparent text-white/60 border-white/10 hover:bg-white/5 hover:text-white' : ''}`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-white/50 animate-pulse">Loading feed...</div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center text-white/50 italic">No updates in this section yet.</div>
      ) : (
        <div className="relative border-l border-white/10 ml-4 md:ml-6 space-y-12 pb-12">
          {filteredPosts.map((post, i) => {
            const isHoveringDiff = hoveredDiffId === post.id && post.revisions && post.revisions.length > 0;
            const latestRevision = isHoveringDiff ? post.revisions![post.revisions!.length - 1] : null;
            const postColor = getSectionColor(post.section);

            return (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={post.id} 
                id={post.id}
                className="relative pl-8 md:pl-12 group scroll-mt-32 transition-all duration-500 rounded-2xl"
              >
                <div 
                  className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full transition-colors"
                  style={{ 
                    backgroundColor: isHoveringDiff ? '#eab308' : postColor,
                    boxShadow: `0 0 10px ${isHoveringDiff ? '#eab308' : postColor}cc`
                  }} 
                />
                
                <div 
                  className={`bg-[#0a0a14]/80 border rounded-2xl border-l-[4px] p-6 shadow-xl transition-all duration-300 ${isHoveringDiff ? 'border-yellow-500/50 ring-1 ring-yellow-500/20' : 'border-white/10 hover:border-white/20'}`}
                  style={!isHoveringDiff ? { borderLeftColor: postColor } : {}}
                >
                  
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <img src={post.author.avatar} alt={post.author.name} className="w-8 h-8 rounded-full border border-white/20" />
                      <span className="text-white/80 font-bold">{post.author.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span 
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border"
                        style={{ 
                          backgroundColor: `${postColor}20`, 
                          color: postColor, 
                          borderColor: `${postColor}50` 
                        }}
                      >
                        {getSectionLabel(post.section)}
                      </span>
                      <span className="text-white/40 text-xs">
                        {new Date(post.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      
                      {post.revisions && post.revisions.length > 0 && (
                        <div onMouseEnter={() => setHoveredDiffId(post.id)} onMouseLeave={() => setHoveredDiffId(null)} className="cursor-help">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-colors ${isHoveringDiff ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'}`}>
                            {isHoveringDiff ? 'Viewing History' : 'Edited'}
                          </span>
                        </div>
                      )}

                      <button onClick={() => handleCopyLink(post.id)} className={`text-xs font-bold px-2 py-1 rounded-md border transition-colors ml-1 ${copiedId === post.id ? 'bg-green-500/20 text-green-300 border-green-500/50' : 'text-white/40 border-transparent hover:text-white hover:bg-white/5'}`} title="Copy link">
                        {copiedId === post.id ? 'Copied!' : '🔗'}
                      </button>

                      {isAdmin && (
                        <div className="flex items-center gap-2 ml-1 border-l border-white/10 pl-2">
                          <button onClick={() => openEditModal(post)} className="text-white/30 hover:text-indigo-400 transition-colors p-1" title="Edit Post">✏️</button>
                          <button onClick={() => handleDeletePost(post.id)} className="text-white/30 hover:text-red-400 transition-colors p-1" title="Delete Post">🗑️</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isHoveringDiff && latestRevision ? (
                    <div className="animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                        <span className="text-xs font-bold text-yellow-400">Comparing changes from</span>
                        <span className="text-xs text-white/50">{new Date(latestRevision.editedAt).toLocaleString()}</span>
                      </div>
                      <h2 className="text-xl font-bold text-white/50 mb-3 line-through decoration-red-500/50">{latestRevision.title}</h2>
                      <TextDiff oldText={latestRevision.content} newText={post.content} />
                    </div>
                  ) : (
                    <div className="animate-in fade-in duration-200">
                      <h2 className="text-xl font-bold text-white mb-2">{post.title}</h2>
                      <div className="text-white/70 text-sm leading-relaxed prose prose-invert max-w-none">
                        <ReactMarkdown components={{ a: ({ node, ...props }) => <a {...props} className="text-indigo-400 hover:text-indigo-300 underline font-semibold transition-colors" target="_blank" rel="noopener noreferrer" />, p: ({ node, ...props }) => <p {...props} className="mb-4 last:mb-0" />, strong: ({ node, ...props }) => <strong {...props} className="font-bold text-white" /> }}>
                          {post.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {isSectionModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-[#0a0a14] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-white mb-2">Manage Sections</h2>
              
              <div className="flex gap-2 mb-4 items-center">
                <input 
                  type="color" 
                  value={newSectionColor} 
                  onChange={e => setNewSectionColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                  title="Choose Color"
                />
                <input 
                  type="text" 
                  placeholder="New section name..." 
                  value={newSectionName} 
                  onChange={e => setNewSectionName(e.target.value)}
                  className="flex-1 bg-black/50 border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
                <button onClick={handleCreateSection} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition">Add</button>
              </div>

              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                {sections.map(sec => (
                  <div key={sec.id} className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/10">
                    {editingSectionId === sec.id ? (
                      <div className="flex flex-1 gap-2 items-center">
                        <input 
                          type="color" 
                          value={editingSectionColor} 
                          onChange={e => setEditingSectionColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                        />
                        <input 
                          type="text" 
                          value={editingSectionName} 
                          onChange={e => setEditingSectionName(e.target.value)}
                          className="flex-1 bg-black/50 border border-white/20 rounded-md px-2 py-1 text-sm text-white"
                          autoFocus
                        />
                        <button onClick={() => handleEditSection(sec.id)} className="text-green-400 font-bold px-2">Save</button>
                        <button onClick={() => setEditingSectionId(null)} className="text-white/50 px-2">Cancel</button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sec.color }} />
                          <span className="text-white font-bold">{sec.label}</span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { 
                              setEditingSectionId(sec.id); 
                              setEditingSectionName(sec.label); 
                              setEditingSectionColor(sec.color); 
                            }} 
                            className="text-white/40 hover:text-indigo-400 px-1" 
                            disabled={sec.id === 'admin-updates'}
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleDeleteSection(sec.id)} 
                            className="text-white/40 hover:text-red-400 px-1" 
                            disabled={sec.id === 'general' || sec.id === 'admin-updates'}
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-4">
                <button onClick={() => setIsSectionModalOpen(false)} className="px-6 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPostModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-[#0a0a14] border border-white/10 rounded-3xl p-6 w-full max-w-2xl shadow-2xl flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-white mb-2">{editingPost ? 'Edit Post' : 'Create Post'}</h2>
              
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1">Title</label>
                <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1">Section</label>
                <select value={formSection} onChange={e => setFormSection(e.target.value)} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500">
                  {sections.map(sec => (
                    <option key={sec.id} value={sec.id}>{sec.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1">Content (Markdown supported)</label>
                <textarea value={formContent} onChange={e => setFormContent(e.target.value)} rows={6} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 resize-none custom-scrollbar" />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setIsPostModalOpen(false)} className="px-6 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition">Cancel</button>
                <button onClick={handleSavePost} disabled={saving || !formTitle || !formContent} className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition disabled:opacity-50">{saving ? 'Saving...' : 'Save Post'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}