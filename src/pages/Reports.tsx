import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { FileText, Download, Filter, Search } from 'lucide-react';
import { calculateWage } from '../utils/payroll';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const Reports: React.FC = () => {
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [rates, setRates] = useState<Record<string, any>>({});
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  
  const [filter, setFilter] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    employeeId: '',
    project: ''
  });

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
    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      setProjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubTimesheets(); unsubRates(); unsubEmployees(); unsubProjects(); };
  }, []);

  const filteredData = timesheets.filter(ts => {
    const dateMatch = ts.date >= filter.startDate && ts.date <= filter.endDate;
    const empMatch = filter.employeeId ? ts.employee_id === filter.employeeId : true;
    const projMatch = filter.project ? ts.project === filter.project : true;
    return dateMatch && empMatch && projMatch;
  }).map(ts => {
    const rate = rates[ts.employee_id];
    if (!rate) return { ...ts, total_income: 0 };

    let projectRate = rate.onsite;
    if (ts.project === 'Transportation') projectRate = rate.transportation;
    else if (ts.project === 'Workshop') projectRate = rate.workshop;
    else if (ts.project === 'Offshore') projectRate = rate.offshore;

    const wages = calculateWage(
      { normal_hours: ts.normal_hours, ot15: ts.ot15, ot20: ts.ot20, ot30: ts.ot30 },
      projectRate
    );
    return { ...ts, ...wages };
  });

  const totalPayroll = filteredData.reduce((sum, item) => sum + (item.total_income || 0), 0);
  const totalHours = filteredData.reduce((sum, item) => sum + (item.normal_hours || 0) + (item.ot15 || 0) + (item.ot20 || 0) + (item.ot30 || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payroll Reports</h2>
          <p className="text-slate-500">Analyze payroll costs and working hours</p>
        </div>
        <button className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600">
          <Download size={20} />
          Export CSV
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
            <input 
              type="date" 
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              value={filter.startDate}
              onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
            <input 
              type="date" 
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              value={filter.endDate}
              onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Employee</label>
            <select 
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              value={filter.employeeId}
              onChange={(e) => setFilter({ ...filter, employeeId: e.target.value })}
            >
              <option value="">All Employees</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project</label>
            <select 
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              value={filter.project}
              onChange={(e) => setFilter({ ...filter, project: e.target.value })}
            >
              <option value="">All Projects</option>
              {projects.map(proj => <option key={proj.id} value={proj.name}>{proj.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-emerald-500 p-6 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
          <p className="text-emerald-100 font-medium mb-1">Total Period Payroll</p>
          <h3 className="text-3xl font-bold">${totalPayroll.toLocaleString()}</h3>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-lg shadow-slate-900/20">
          <p className="text-slate-400 font-medium mb-1">Total Working Hours</p>
          <h3 className="text-3xl font-bold">{totalHours.toFixed(1)} hrs</h3>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">Employee</th>
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold">Project</th>
              <th className="px-6 py-4 font-semibold">Hours</th>
              <th className="px-6 py-4 font-semibold text-right">Income</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredData.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.employee_name}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{item.date}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{item.project}</td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {(item.normal_hours + item.ot15 + item.ot20 + item.ot30).toFixed(1)}h
                </td>
                <td className="px-6 py-4 text-sm font-bold text-emerald-600 text-right">
                  ${(item.total_income || 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
