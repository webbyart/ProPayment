import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Search, Edit2, Trash2, X, UserPlus, MoreVertical } from 'lucide-react';
import { cn } from '../utils/cn';

const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [formData, setFormData] = useState({
    employee_code: '',
    name: '',
    position: '',
    status: 'active',
    task_status: 'No Task'
  });

  const handleBulkAdd = async () => {
    const lines = bulkData.split('\n');
    const newEmployees: any[] = [];
    
    lines.forEach(line => {
      if (!line.trim() || line.toLowerCase().includes('name')) return; // Skip empty lines or headers
      const parts = line.split(/[\t,]/).map(p => p.trim());
      // Format: Name, Position, Code
      if (parts.length >= 2) {
        newEmployees.push({
          name: parts[0],
          position: parts[1],
          employee_code: parts[2] || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'active',
          task_status: 'No Task'
        });
      }
    });

    if (newEmployees.length > 0) {
      const batch = writeBatch(db);
      newEmployees.forEach(emp => {
        const docRef = doc(collection(db, 'employees'));
        batch.set(docRef, emp);
      });
      await batch.commit();
      alert(`Added ${newEmployees.length} employees!`);
      setIsBulkModalOpen(false);
      setBulkData('');
    }
  };

  useEffect(() => {
    return onSnapshot(collection(db, 'employees'), (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmployee) {
      await updateDoc(doc(db, 'employees', editingEmployee.id), formData);
    } else {
      await addDoc(collection(db, 'employees'), formData);
    }
    setIsModalOpen(false);
    setEditingEmployee(null);
    setFormData({ employee_code: '', name: '', position: '', status: 'active', task_status: 'No Task' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      await deleteDoc(doc(db, 'employees', id));
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const name = emp.name || '';
    const code = emp.employee_code || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || emp.task_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[40px] bg-white p-10 shadow-sm border border-slate-200">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">EMPLOYEE <span className="text-emerald-500">MASTER</span></h2>
            <p className="text-slate-400 font-medium max-w-md">Centralized workforce directory and task assignment tracking system.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsBulkModalOpen(true)}
              className="px-6 py-3 bg-slate-50 text-slate-600 rounded-2xl border border-slate-200 flex items-center gap-2 hover:bg-slate-100 transition-all font-black text-[10px] uppercase tracking-widest"
            >
              <Plus size={18} className="text-blue-500" />
              Bulk Import
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-slate-900 text-white rounded-2xl flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 font-black text-[10px] uppercase tracking-widest"
            >
              <UserPlus size={18} />
              Add Member
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by name or employee code..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-50 focus:border-emerald-500 outline-none transition-all font-medium text-slate-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Filter Status</span>
            <select 
              className="w-full md:w-48 px-4 py-3 rounded-2xl border-2 border-slate-50 focus:border-emerald-500 outline-none transition-all bg-white font-bold text-slate-700"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="No Task">No Task</option>
              <option value="Working">Working</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ID Code</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Member Details</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Role / Position</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Current Task</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Availability</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-8 py-6">
                    <span className="font-mono text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/50">
                      {emp.employee_code}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-base font-black text-slate-900 group-hover:text-emerald-600 transition-colors">{emp.name}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Verified Employee</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-bold text-slate-500 italic">{emp.position}</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 border",
                      emp.task_status === 'Working' ? "bg-blue-50 text-blue-600 border-blue-100" :
                      emp.task_status === 'Completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                      emp.task_status === 'On Hold' ? "bg-amber-50 text-amber-600 border-amber-100" :
                      "bg-slate-50 text-slate-400 border-slate-100"
                    )}>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        emp.task_status === 'Working' ? "bg-blue-500 animate-pulse" :
                        emp.task_status === 'Completed' ? "bg-emerald-500" :
                        emp.task_status === 'On Hold' ? "bg-amber-500" :
                        "bg-slate-300"
                      )} />
                      {emp.task_status || 'No Task'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", emp.status === 'active' ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-slate-300")} />
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        emp.status === 'active' ? "text-emerald-600" : "text-slate-400"
                      )}>
                        {emp.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                      <button 
                        onClick={() => { 
                          setEditingEmployee(emp); 
                          setFormData({
                            employee_code: emp.employee_code || '',
                            name: emp.name || '',
                            position: emp.position || '',
                            status: emp.status || 'active',
                            task_status: emp.task_status || 'No Task'
                          }); 
                          setIsModalOpen(true); 
                        }}
                        className="p-3 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-2xl transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(emp.id)}
                        className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Employee Code</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  value={formData.employee_code || ''}
                  onChange={(e) => setFormData({...formData, employee_code: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Position</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  value={formData.position || ''}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Task Status</label>
                <select 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  value={formData.task_status || 'No Task'}
                  onChange={(e) => setFormData({...formData, task_status: e.target.value})}
                >
                  <option value="No Task">No Task</option>
                  <option value="Working">Working</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  value={formData.status || 'active'}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <button 
                type="submit"
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all mt-4"
              >
                {editingEmployee ? 'Update Employee' : 'Create Employee'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
