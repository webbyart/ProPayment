import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Save, Search, Banknote, ShieldAlert } from 'lucide-react';
import { useAuth } from '../AuthContext';

const Rates: React.FC = () => {
  const { role } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [rates, setRates] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubRates = onSnapshot(collection(db, 'employee_rates'), (snap) => {
      const rateMap: Record<string, any> = {};
      snap.docs.forEach(doc => rateMap[doc.id] = doc.data());
      setRates(rateMap);
    });
    return () => { unsubEmployees(); unsubRates(); };
  }, []);

  const handleRateChange = (empId: string, field: string, value: string) => {
    setRates(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: Number(value)
      }
    }));
  };

  const handleSave = async (empId: string) => {
    const empRates = rates[empId];
    if (empRates) {
      await setDoc(doc(db, 'employee_rates', empId), {
        ...empRates,
        employee_id: empId,
        updated_at: new Date().toISOString()
      });
      alert('Rates saved successfully!');
    }
  };

  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900">Access Denied</h2>
        <p>Only administrators can manage salary rates.</p>
      </div>
    );
  }

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Rate Master</h2>
          <p className="text-slate-500">Set project-based wage rates for employees</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search employee..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredEmployees.map((emp) => {
          const empRates = {
            transportation: 0,
            workshop: 0,
            onsite: 0,
            offshore: 0,
            ...rates[emp.id]
          };
          return (
            <div key={emp.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">{emp.name}</h3>
                <p className="text-sm text-slate-500">{emp.employee_code} • {emp.position}</p>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-[2]">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Transportation</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input 
                      type="number"
                      className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 text-sm font-bold"
                      value={empRates.transportation}
                      onChange={(e) => handleRateChange(emp.id, 'transportation', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Workshop</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input 
                      type="number"
                      className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 text-sm font-bold"
                      value={empRates.workshop}
                      onChange={(e) => handleRateChange(emp.id, 'workshop', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Onsite</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input 
                      type="number"
                      className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 text-sm font-bold"
                      value={empRates.onsite}
                      onChange={(e) => handleRateChange(emp.id, 'onsite', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Offshore</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input 
                      type="number"
                      className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 text-sm font-bold"
                      value={empRates.offshore}
                      onChange={(e) => handleRateChange(emp.id, 'offshore', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleSave(emp.id)}
                className="bg-slate-900 text-white p-3 rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
              >
                <Save size={20} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Rates;
