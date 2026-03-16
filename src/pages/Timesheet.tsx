import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, doc, writeBatch, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../utils/cn';
import { calculateHours } from '../utils/payroll';
import { Plus, Upload, Download, Search, Calendar, Clock, User, FolderKanban, Edit2, Trash2, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { useAuth } from '../AuthContext';

const Timesheet: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'hr';
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    employee_id: '',
    project: 'Onsite',
    time_in: '08:00',
    time_out: '17:00',
    lunch_deduct: 1,
    remark: ''
  });

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    e.employee_code.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const handleBulkImport = async () => {
    const lines = bulkData.split('\n');
    const entries: any[] = [];
    const newProjects = new Set<string>();

    lines.forEach(line => {
      if (!line.trim() || line.toLowerCase().includes('name')) return; // Skip empty lines or headers

      // Split by tab or comma
      const parts = line.split(/[\t,]/).map(p => p.trim());
      
      // We expect at least: Days, Date, No, Name, Position, Project, Wage, TimeIn, TimeOut
      if (parts.length >= 9) {
        // Handle D/M/YYYY date format
        let dateStr = parts[1];
        if (dateStr && dateStr.includes('/')) {
          const [d, m, y] = dateStr.split('/');
          dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        const name = parts[3];
        const project = parts[5];
        const timeIn = parts[7];
        const timeOut = parts[8];

        const wagePerDay = Number(parts[6].replace(/[^0-9.]/g, '')) || 0;

        // Basic validation
        if (dateStr && name && project && timeIn && timeOut && timeIn.includes(':') && timeOut.includes(':')) {
          // Find employee
          const emp = employees.find(e => 
            e.name.toLowerCase().trim() === name.toLowerCase().trim() ||
            e.employee_code.toLowerCase().trim() === name.toLowerCase().trim()
          );
          
          if (emp) {
            // Logic: If duration is <= 5 hours (e.g. 8:00-12:00), don't deduct lunch
            const [hIn, mIn] = timeIn.split(':').map(Number);
            const [hOut, mOut] = timeOut.split(':').map(Number);
            let diff = (hOut + mOut/60) - (hIn + mIn/60);
            if (diff < 0) diff += 24;
            
            const lunchDeduct = diff > 5 ? 1 : 0;
            const hours = calculateHours(dateStr, timeIn, timeOut, lunchDeduct);
            
            entries.push({
              date: dateStr,
              employee_id: emp.id,
              employee_name: emp.name,
              project: project,
              time_in: timeIn,
              time_out: timeOut,
              lunch_deduct: lunchDeduct,
              wage_per_day: wagePerDay,
              ...hours,
              created_at: new Date().toISOString()
            });

            // Check if project exists
            if (!projects.find(p => p.name.toLowerCase() === project.toLowerCase())) {
              newProjects.add(project);
            }
          }
        }
      }
    });

    if (entries.length > 0) {
      const batch = writeBatch(db);
      
      // Add new projects first
      newProjects.forEach(pName => {
        const pRef = doc(collection(db, 'projects'));
        batch.set(pRef, { name: pName });
      });

      // Add timesheets
      entries.forEach(entry => {
        const tsRef = doc(collection(db, 'timesheets'));
        batch.set(tsRef, entry);
      });

      await batch.commit();
      alert(`Imported ${entries.length} entries and created ${newProjects.size} new projects!`);
      setIsBulkModalOpen(false);
      setBulkData('');
    } else {
      alert('No valid entries found. Please check the format. Make sure employees are already added.');
    }
  };

  useEffect(() => {
    const unsubTimesheets = onSnapshot(collection(db, 'timesheets'), (snap) => {
      setTimesheets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      setProjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubTimesheets(); unsubEmployees(); unsubProjects(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hours = calculateHours(formData.date, formData.time_in, formData.time_out, formData.lunch_deduct);
    const data = {
      ...formData,
      ...hours,
      updated_at: new Date().toISOString()
    };

    if (editingId) {
      await updateDoc(doc(db, 'timesheets', editingId), data);
    } else {
      await addDoc(collection(db, 'timesheets'), {
        ...data,
        created_at: new Date().toISOString()
      });
    }
    
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this timesheet entry?')) {
      await deleteDoc(doc(db, 'timesheets', id));
    }
  };

  const handleEdit = (ts: any) => {
    setEditingId(ts.id);
    const emp = employees.find(e => e.id === ts.employee_id);
    setEmployeeSearch(emp?.name || '');
    setFormData({
      date: ts.date,
      employee_id: ts.employee_id,
      project: ts.project,
      time_in: ts.time_in,
      time_out: ts.time_out,
      lunch_deduct: ts.lunch_deduct,
      remark: ts.remark || ''
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setEmployeeSearch('');
    setIsEmployeeDropdownOpen(false);
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      employee_id: '',
      project: 'Onsite',
      time_in: '08:00',
      time_out: '17:00',
      lunch_deduct: 1,
      remark: ''
    });
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const batch = writeBatch(db);
      data.forEach((row: any) => {
        // Find employee by name or code
        const emp = employees.find(e => e.name === row.Name || e.employee_code === row.Code);
        if (emp) {
          const hours = calculateHours(row.Date, row.TimeIn, row.TimeOut, row.LunchDeduct || 1);
          const newDocRef = doc(collection(db, 'timesheets'));
          batch.set(newDocRef, {
            date: row.Date,
            employee_id: emp.id,
            employee_name: emp.name,
            project: row.Project || 'Onsite',
            time_in: row.TimeIn,
            time_out: row.TimeOut,
            lunch_deduct: row.LunchDeduct || 1,
            ...hours,
            created_at: new Date().toISOString()
          });
        }
      });
      await batch.commit();
      alert('Import successful!');
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Timesheet Input</h2>
          <p className="text-slate-500">Record daily working hours and projects</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsBulkModalOpen(true)}
            className="bg-white text-slate-700 px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-2 hover:bg-slate-50 transition-all"
          >
            <Plus size={20} className="text-blue-500" />
            Bulk Paste
          </button>
          <label className="bg-white text-slate-700 px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-2 hover:bg-slate-50 cursor-pointer transition-all">
            <Upload size={20} className="text-blue-500" />
            Import Excel
            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
          </label>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus size={20} />
            Add Entry
          </button>
        </div>
      </div>

      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-4xl w-full p-8 border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Bulk Paste Timesheet Data</h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Paste data from your Excel (Format: Days, Date, No, Name, Position, Project, Wage, TimeIn, TimeOut...)</p>
            <textarea 
              className="w-full h-96 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-[10px] whitespace-pre"
              placeholder="SAT,3/1/2026,1,KITTICHAI NAMHOM,T/C,Workshop,700,08:00,12:00,..."
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
            />
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setIsBulkModalOpen(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkImport}
                className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
              >
                Import Data
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Employee</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Project</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Schedule</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Normal</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">OT 1.5</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">OT 2.0</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">OT 3.0</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {timesheets.sort((a, b) => b.date.localeCompare(a.date)).map((ts) => {
                const emp = employees.find(e => e.id === ts.employee_id);
                return (
                  <tr key={ts.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{ts.date}</span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Work Day</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200">
                          {emp?.name?.charAt(0) || '?'}
                        </div>
                        <span className="text-sm font-bold text-slate-700">{emp?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-slate-100 rounded-lg text-slate-600 text-[10px] font-black uppercase tracking-widest border border-slate-200">
                        {ts.project}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock size={14} className="text-slate-300" />
                        <span className="text-xs font-bold">{ts.time_in} - {ts.time_out}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-black text-slate-900">{ts.normal_hours}h</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "text-sm font-black",
                        ts.ot15 > 0 ? "text-blue-600 bg-blue-50 px-2 py-1 rounded-lg" : "text-slate-300"
                      )}>{ts.ot15 > 0 ? `${ts.ot15}h` : '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "text-sm font-black",
                        ts.ot20 > 0 ? "text-amber-600 bg-amber-50 px-2 py-1 rounded-lg" : "text-slate-300"
                      )}>{ts.ot20 > 0 ? `${ts.ot20}h` : '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "text-sm font-black",
                        ts.ot30 > 0 ? "text-red-600 bg-red-50 px-2 py-1 rounded-lg" : "text-slate-300"
                      )}>{ts.ot30 > 0 ? `${ts.ot30}h` : '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(ts)}
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(ts.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full p-8 border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">{editingId ? 'Edit Timesheet Entry' : 'New Timesheet Entry'}</h3>
              <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div className="col-span-2 md:col-span-1 relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Search employee..."
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={employeeSearch || (employees.find(e => e.id === formData.employee_id)?.name || '')}
                    onFocus={() => setIsEmployeeDropdownOpen(true)}
                    onChange={(e) => {
                      setEmployeeSearch(e.target.value);
                      setIsEmployeeDropdownOpen(true);
                    }}
                  />
                  {isEmployeeDropdownOpen && (
                    <div className="absolute z-[60] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                      {filteredEmployees.length > 0 ? (
                        filteredEmployees.map(e => (
                          <button
                            key={e.id}
                            type="button"
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-medium text-slate-700 flex items-center justify-between"
                            onClick={() => {
                              setFormData({...formData, employee_id: e.id});
                              setEmployeeSearch(e.name);
                              setIsEmployeeDropdownOpen(false);
                            }}
                          >
                            <span>{e.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{e.employee_code}</span>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-slate-400 italic">No employees found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                <select 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200"
                  value={formData.project}
                  onChange={(e) => setFormData({...formData, project: e.target.value})}
                >
                  {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  <option value="Transportation">Transportation</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Onsite">Onsite</option>
                  <option value="Offshore">Offshore</option>
                </select>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Lunch Deduction (Hours)</label>
                <input 
                  type="number" step="0.5"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200"
                  value={formData.lunch_deduct}
                  onChange={(e) => setFormData({...formData, lunch_deduct: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Time In</label>
                <input 
                  type="time" 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200"
                  value={formData.time_in}
                  onChange={(e) => setFormData({...formData, time_in: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Time Out</label>
                <input 
                  type="time" 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200"
                  value={formData.time_out}
                  onChange={(e) => setFormData({...formData, time_out: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Remark</label>
                <textarea 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200"
                  value={formData.remark}
                  onChange={(e) => setFormData({...formData, remark: e.target.value})}
                />
              </div>
              <div className="col-span-2 flex gap-3 mt-4">
                <button 
                  type="button" onClick={handleCloseModal}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
                >
                  {editingId ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timesheet;
