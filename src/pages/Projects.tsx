import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2, FolderKanban, Search, Edit2, X, Check } from 'lucide-react';
import { useAuth } from '../AuthContext';

const Projects: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [projects, setProjects] = useState<any[]>([]);
  const [newProject, setNewProject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    return onSnapshot(collection(db, 'projects'), (snap) => {
      setProjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject) return;
    await addDoc(collection(db, 'projects'), { name: newProject });
    setNewProject('');
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateDoc(doc(db, 'projects', id), { name: editName });
      setEditingId(null);
      setEditName('');
    } catch (error) {
      console.error("Error updating project:", error);
      alert("Failed to update project. Please check permissions.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'projects', id));
      setDeletingId(null);
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project. Please check permissions.");
    }
  };

  const filteredProjects = projects.filter(p => 
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Project Master</h2>
        <p className="text-slate-500">Define project types for rate calculation</p>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex gap-3">
        <input 
          type="text" 
          placeholder="New project name..."
          className="flex-1 px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
          value={newProject}
          onChange={(e) => setNewProject(e.target.value)}
        />
        <button className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center gap-2">
          <Plus size={20} />
          Add
        </button>
      </form>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-50">
          {filteredProjects.map((proj) => (
            <div key={proj.id} className="px-6 py-5 flex items-center justify-between hover:bg-slate-50/80 transition-all group">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:bg-emerald-50 transition-all border border-slate-200 group-hover:border-emerald-100 shrink-0">
                  <FolderKanban size={24} />
                </div>
                {editingId === proj.id ? (
                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    <input 
                      type="text"
                      className="flex-1 px-4 py-2 rounded-xl border-2 border-emerald-500 outline-none text-sm font-bold shadow-lg shadow-emerald-100"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate(proj.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                    <button 
                      onClick={() => handleUpdate(proj.id)}
                      className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-md shadow-emerald-200"
                    >
                      <Check size={20} />
                    </button>
                    <button 
                      onClick={() => setEditingId(null)}
                      className="p-2 bg-slate-100 text-slate-400 hover:bg-slate-200 rounded-xl transition-all"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <span className="font-black text-slate-900 group-hover:text-emerald-600 transition-colors">{proj.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em]">Project Identifier</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                {isAdmin && !editingId && !deletingId && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(proj.id);
                        setEditName(proj.name);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                      title="Edit Project"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(proj.id);
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Delete Project"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
                {deletingId === proj.id && (
                  <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-2xl border border-red-100 animate-in fade-in zoom-in duration-200">
                    <span className="text-[10px] font-black text-red-600 px-3 uppercase tracking-wider">Confirm Delete?</span>
                    <button 
                      onClick={() => handleDelete(proj.id)}
                      className="bg-red-500 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase hover:bg-red-600 transition-all shadow-md shadow-red-200"
                    >
                      Yes, Delete
                    </button>
                    <button 
                      onClick={() => setDeletingId(null)}
                      className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-lg transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-4">
                <FolderKanban size={32} />
              </div>
              <p className="text-slate-400 font-medium tracking-tight">No projects defined yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Projects;
