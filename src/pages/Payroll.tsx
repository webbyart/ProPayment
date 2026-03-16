import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { calculateWage } from '../utils/payroll';
import { Calculator, Search, Filter, Download, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { format } from 'date-fns';

const Payroll: React.FC = () => {
  const { role } = useAuth();
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [rates, setRates] = useState<Record<string, any>>({});
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    const unsubTimesheets = onSnapshot(collection(db, 'timesheets'), (snap) => {
      setTimesheets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubRates = onSnapshot(collection(db, 'employee_rates'), (snap) => {
      const rateMap: Record<string, any> = {};
      snap.docs.forEach(doc => rateMap[doc.id] = doc.data());
      setRates(rateMap);
    });
    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubTimesheets(); unsubRates(); unsubEmployees(); };
  }, []);

  const isAdmin = role === 'admin';

  const payrollData = timesheets.filter(ts => ts.date.startsWith(selectedMonth)).map(ts => {
    const emp = employees.find(e => e.id === ts.employee_id);
    const rate = rates[ts.employee_id];
    
    let projectRate = ts.wage_per_day || 0;
    if (!projectRate && rate) {
      if (ts.project === 'Transportation') projectRate = rate.transportation;
      else if (ts.project === 'Workshop') projectRate = rate.workshop;
      else if (ts.project === 'Offshore') projectRate = rate.offshore;
      else projectRate = rate.onsite;
    }

    const wages = calculateWage(
      { normal_hours: ts.normal_hours, ot15: ts.ot15, ot20: ts.ot20, ot30: ts.ot30 },
      projectRate
    );

    return {
      ...ts,
      employee_name: emp?.name || 'Unknown',
      ...wages
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payroll Calculation</h2>
          <p className="text-slate-500">Automated wage calculation based on project rates</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="month" 
            className="px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
          <button className="bg-slate-900 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-800 transition-all">
            <Download size={20} />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Employee</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Project</th>
                {isAdmin && <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Normal Wage</th>}
                {isAdmin && <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">OT Wage</th>}
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Total Income</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payrollData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-all group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">{item.employee_name}</span>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Staff Member</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-slate-500">{item.date}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-slate-100 rounded-lg text-slate-600 text-[10px] font-black uppercase tracking-widest border border-slate-200">
                      {item.project}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-700">฿{item.normal_wage.toLocaleString()}</span>
                    </td>
                  )}
                  {isAdmin && (
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-blue-600">฿{(item.ot15_wage + item.ot20_wage + item.ot30_wage).toLocaleString()}</span>
                    </td>
                  )}
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                      ฿{item.total_income.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-amber-700">
          <EyeOff size={20} />
          <p className="text-sm font-medium">Detailed wage rates are hidden for HR staff. You can only see the final total income.</p>
        </div>
      )}
    </div>
  );
};

export default Payroll;
