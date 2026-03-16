import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, doc, setDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart
} from 'recharts';
import { 
  Users, Banknote, Clock, FolderKanban, TrendingUp, 
  Filter, Calendar, User as UserIcon, DollarSign, ArrowUpRight, ArrowDownRight,
  ChevronRight, Save
} from 'lucide-react';
import { calculateWage, formatMonth } from '../utils/payroll';
import { useAuth } from '../AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Dashboard: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  // Data State
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [rates, setRates] = useState<Record<string, any>>({});
  const [projectRevenues, setProjectRevenues] = useState<Record<string, number>>({});
  
  // Filter State (Slicers)
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('All');

  // Loading state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      setProjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubTimesheets = onSnapshot(collection(db, 'timesheets'), (snap) => {
      setTimesheets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubRates = onSnapshot(collection(db, 'employee_rates'), (snap) => {
      const rateMap: Record<string, any> = {};
      snap.docs.forEach(doc => rateMap[doc.id] = doc.data());
      setRates(rateMap);
    });

    const unsubRevenue = onSnapshot(collection(db, 'project_revenue'), (snap) => {
      const revMap: Record<string, number> = {};
      snap.docs.forEach(doc => revMap[doc.id] = doc.data().revenue);
      setProjectRevenues(revMap);
    });

    setLoading(false);
    return () => { 
      unsubEmployees(); unsubProjects(); unsubTimesheets(); unsubRates(); unsubRevenue();
    };
  }, []);

  // Processed Data with Wages
  const processedData = useMemo(() => {
    return timesheets.map(ts => {
      const emp = employees.find(e => e.id === ts.employee_id);
      const rate = rates[ts.employee_id];
      
      let projectRate = 0;
      if (rate) {
        if (ts.project === 'Transportation') projectRate = Number(rate.transportation || 0);
        else if (ts.project === 'Workshop') projectRate = Number(rate.workshop || 0);
        else if (ts.project === 'Offshore') projectRate = Number(rate.offshore || 0);
        else projectRate = Number(rate.onsite || 0);
      }

      const wages = calculateWage(
        { normal_hours: ts.normal_hours, ot15: ts.ot15, ot20: ts.ot20, ot30: ts.ot30 },
        projectRate
      );

      return {
        ...ts,
        employee_name: emp?.name || 'Unknown',
        month: formatMonth(ts.date),
        ...wages
      };
    });
  }, [timesheets, employees, rates]);

  // Unique Filter Options
  const filterOptions = useMemo(() => {
    const months = Array.from(new Set(processedData.map(d => d.month))).sort();
    const emps = Array.from(new Set(processedData.map(d => d.employee_name))).sort();
    const projs = Array.from(new Set(processedData.map(d => d.project))).sort();
    return { months, emps, projs };
  }, [processedData]);

  // Filtered Data
  const filteredData = useMemo(() => {
    return processedData.filter(d => {
      const empMatch = selectedEmployees.length === 0 || selectedEmployees.includes(d.employee_name);
      const projMatch = selectedProjects.length === 0 || selectedProjects.includes(d.project);
      const monthMatch = selectedMonth === 'All' || d.month === selectedMonth;
      return empMatch && projMatch && monthMatch;
    });
  }, [processedData, selectedEmployees, selectedProjects, selectedMonth]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalWage = filteredData.reduce((sum, d) => sum + d.total_income, 0);
    const totalOT = filteredData.reduce((sum, d) => sum + (d.ot_income || 0), 0);
    const uniqueEmps = new Set(filteredData.map(d => d.employee_id)).size;
    
    // Revenue is project-based, so we sum revenue for projects present in filtered data
    const activeProjs = Array.from(new Set(filteredData.map(d => d.project)));
    const totalRevenue = activeProjs.reduce((sum: number, pName: string) => {
      const proj = projects.find(pj => pj.name === pName);
      return sum + (proj ? (projectRevenues[proj.id] || 0) : 0);
    }, 0);

    return {
      totalEmployees: uniqueEmps || 0,
      totalWage: Number(totalWage) || 0,
      totalOT: Number(totalOT) || 0,
      totalRevenue: Number(totalRevenue) || 0,
      profit: (Number(totalRevenue) || 0) - (Number(totalWage) || 0)
    };
  }, [filteredData, projectRevenues, projects]);

  // Chart Data: Monthly Trend (Revenue vs Wage)
  const monthlyTrendData = useMemo(() => {
    const months = filterOptions.months;
    return months.map(m => {
      const monthData = processedData.filter(d => d.month === m);
      const filteredMonthData = monthData.filter(d => {
        const empMatch = selectedEmployees.length === 0 || selectedEmployees.includes(d.employee_name);
        const projMatch = selectedProjects.length === 0 || selectedProjects.includes(d.project);
        return empMatch && projMatch;
      });

      const wage = filteredMonthData.reduce((sum, d) => sum + d.total_income, 0);
      
      // Calculate revenue for this month
      const activeProjs = Array.from(new Set(filteredMonthData.map(d => d.project)));
      const revenue = activeProjs.reduce((sum: number, pName: string) => {
        const proj = projects.find(pj => pj.name === pName);
        if (!proj) return sum;
        const totalProjWage = processedData.filter(d => d.project === pName).reduce((s: number, d: any) => s + d.total_income, 0);
        const monthProjWage = filteredMonthData.filter(d => d.project === pName).reduce((s: number, d: any) => s + d.total_income, 0);
        const projRev = projectRevenues[proj.id] || 0;
        const monthShare = totalProjWage > 0 ? (monthProjWage / totalProjWage) : 0;
        return sum + (projRev * monthShare);
      }, 0);

      return {
        name: m,
        wage: Number(wage) || 0,
        revenue: Number(revenue) || 0
      };
    });
  }, [processedData, filterOptions.months, selectedEmployees, selectedProjects, projectRevenues, projects]);

  // Chart Data: Top OT Earners
  const topOTEarnersData = useMemo(() => {
    const empOT: Record<string, number> = {};
    filteredData.forEach(d => {
      empOT[d.employee_name] = (empOT[d.employee_name] || 0) + (d.ot_income || 0);
    });
    return Object.entries(empOT)
      .map(([name, ot]) => ({ name, ot }))
      .sort((a, b) => b.ot - a.ot)
      .slice(0, 5);
  }, [filteredData]);

  // Chart Data: Project Comparison
  const projectComparisonData = useMemo(() => {
    return projects.map(p => {
      const pData = processedData.filter(d => d.project === p.name);
      const filteredPData = pData.filter(d => {
        const empMatch = selectedEmployees.length === 0 || selectedEmployees.includes(d.employee_name);
        const monthMatch = selectedMonth === 'All' || d.month === selectedMonth;
        return empMatch && monthMatch;
      });

      const wage = filteredPData.reduce((sum, d) => sum + d.total_income, 0);
      const revenue = projectRevenues[p.id] || 0;

      return {
        name: p.name,
        wage: Number(wage) || 0,
        revenue: Number(revenue) || 0,
        profit: (Number(revenue) || 0) - (Number(wage) || 0)
      };
    });
  }, [projects, processedData, projectRevenues, selectedEmployees, selectedMonth]);

  const handleUpdateRevenue = async (projectId: string, val: string) => {
    const revenue = Number(val);
    if (isNaN(revenue)) return;
    await setDoc(doc(db, 'project_revenue', projectId), {
      revenue,
      updated_at: new Date().toISOString()
    }, { merge: true });
  };

  if (loading) return <div className="p-8 text-center">Loading Dashboard...</div>;

  return (
    <div className="space-y-10 pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[40px] bg-slate-900 p-10 md:p-16 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-500/20 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest">
              Live Analytics
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none mb-6">
            SMART PAYROLL <span className="text-emerald-500">INSIGHTS</span>
          </h1>
          <p className="text-slate-400 text-lg font-medium max-w-md leading-relaxed">
            Real-time financial overview, labor cost distribution, and project profitability tracking.
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Workforce" 
          value={kpis.totalEmployees} 
          icon={Users} 
          color="blue" 
          subtitle="Active members"
        />
        <KPICard 
          title="Revenue" 
          value={`฿${kpis.totalRevenue.toLocaleString()}`} 
          icon={DollarSign} 
          color="emerald" 
          subtitle="Project budgets"
        />
        <KPICard 
          title="Labor Cost" 
          value={`฿${kpis.totalWage.toLocaleString()}`} 
          icon={Banknote} 
          color="red" 
          subtitle="Total payroll"
        />
        <KPICard 
          title="Net Profit" 
          value={`฿${kpis.profit.toLocaleString()}`} 
          icon={TrendingUp} 
          color={kpis.profit >= 0 ? "emerald" : "red"} 
          subtitle="Operational margin"
          trend={kpis.profit >= 0 ? "up" : "down"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Filters Panel */}
        <div className="lg:col-span-3">
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 sticky top-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Filter size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Analytics Slicers</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Refine your view</p>
              </div>
            </div>

            <div className="space-y-8">
              <MultiSelectSlicer 
                label="Employees" 
                icon={UserIcon}
                options={filterOptions.emps} 
                selected={selectedEmployees} 
                onSelect={setSelectedEmployees} 
              />
              <MultiSelectSlicer 
                label="Projects" 
                icon={FolderKanban}
                options={filterOptions.projs} 
                selected={selectedProjects} 
                onSelect={setSelectedProjects} 
              />
              <Slicer 
                label="Reporting Month" 
                icon={Calendar}
                options={['All', ...filterOptions.months]} 
                selected={selectedMonth} 
                onSelect={setSelectedMonth} 
              />
            </div>

            <button 
              onClick={() => { setSelectedEmployees([]); setSelectedProjects([]); setSelectedMonth('All'); }}
              className="w-full mt-10 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black hover:bg-slate-50 hover:text-slate-900 transition-all text-[10px] uppercase tracking-[0.2em]"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Charts & Tables */}
        <div className="lg:col-span-9 space-y-10">
          {/* Performance Table */}
          <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Project Performance</h3>
                <p className="text-slate-400 text-sm font-medium">Budget allocation vs actual labor costs</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                <Save size={16} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auto-save active</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Project Name</th>
                    <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Revenue (Budget)</th>
                    <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Labor Expense</th>
                    <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Net Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {projects.map(p => {
                    const data = projectComparisonData.find(d => d.name === p.name);
                    return (
                      <tr key={p.id} className="group hover:bg-slate-50/50 transition-all">
                        <td className="py-6">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 text-base">{p.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Project</span>
                          </div>
                        </td>
                        <td className="py-6">
                          <div className="relative max-w-[180px]">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</span>
                            <input 
                              type="number"
                              className="w-full pl-8 pr-4 py-3 rounded-2xl border-2 border-transparent group-hover:border-slate-200 focus:border-emerald-500 outline-none transition-all font-black text-slate-700 bg-transparent group-hover:bg-white shadow-none group-hover:shadow-lg group-hover:shadow-slate-200/20"
                              defaultValue={projectRevenues[p.id] || 0}
                              onBlur={(e) => handleUpdateRevenue(p.id, e.target.value)}
                            />
                          </div>
                        </td>
                        <td className="py-6">
                          <span className="text-base font-black text-red-500">฿{(data?.wage || 0).toLocaleString()}</span>
                        </td>
                        <td className="py-6 text-right">
                          <span className={cn(
                            "px-4 py-2 rounded-2xl text-xs font-black border",
                            (data?.profit || 0) >= 0 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                              : "bg-red-50 text-red-600 border-red-100"
                          )}>
                            ฿{(data?.profit || 0).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chart Section 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <ChartCard title="Revenue vs Labor Trend">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorWage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px'}}
                  />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="wage" name="Labor Cost" stroke="#ef4444" strokeWidth={4} fillOpacity={1} fill="url(#colorWage)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Cost Distribution by Project">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectComparisonData.filter(d => d.wage > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={10}
                    dataKey="wage"
                  >
                    {projectComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)'}}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-6">
                {projectComparisonData.filter(d => d.wage > 0).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}} />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.name}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* Chart Section 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <ChartCard title="Project Profitability Matrix">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={projectComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px'}}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[12, 12, 0, 0]} barSize={24} />
                  <Bar dataKey="wage" name="Labor Cost" fill="#ef4444" radius={[12, 12, 0, 0]} barSize={24} />
                  <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#3b82f6" strokeWidth={4} dot={{r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top OT Earners (Performance)">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topOTEarnersData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} width={100} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px'}}
                  />
                  <Bar dataKey="ot" name="OT Income" fill="#f59e0b" radius={[0, 12, 12, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const KPICard = ({ title, value, icon: Icon, color, subtitle, trend }: any) => {
  const colors: any = {
    blue: "bg-blue-500 text-blue-500 shadow-blue-500/20",
    emerald: "bg-emerald-500 text-emerald-500 shadow-emerald-500/20",
    red: "bg-red-500 text-red-500 shadow-red-500/20",
    amber: "bg-amber-500 text-amber-500 shadow-amber-500/20",
  };

  return (
    <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500">
      <div className={cn("absolute top-0 right-0 w-40 h-40 -mr-20 -mt-20 rounded-full opacity-5 transition-transform duration-700 group-hover:scale-150", colors[color].split(' ')[0])} />
      
      <div className="relative z-10">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-2xl", colors[color].split(' ')[0], "text-white")}>
          <Icon size={28} />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{title}</p>
        <div className="flex items-baseline gap-3">
          <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">{value}</h3>
          {trend && (
            <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase", trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
              {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {trend === 'up' ? 'Growth' : 'Risk'}
            </div>
          )}
        </div>
        <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-widest opacity-60">{subtitle}</p>
      </div>
    </div>
  );
};

const ChartCard = ({ title, children }: any) => (
  <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-200">
    <h3 className="text-lg font-black text-slate-900 mb-10 uppercase tracking-wider">{title}</h3>
    <div className="h-80 min-h-[320px]">
      {children}
    </div>
  </div>
);

const Slicer = ({ label, options, selected, onSelect, icon: Icon }: any) => {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-slate-400" />
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      </div>
      <select
        value={selected || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 text-slate-600 font-bold text-xs focus:border-emerald-500 outline-none bg-white transition-all cursor-pointer"
      >
        {options.map((opt: string) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
};

const MultiSelectSlicer = ({ label, options, selected, onSelect, icon: Icon }: any) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
    if (values.includes('All')) {
      onSelect([]);
    } else {
      onSelect(values);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-slate-400" />
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      </div>
      <div className="relative group">
        <select
          multiple
          value={(selected && selected.length === 0) ? ['All'] : (selected || [])}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded-xl border-2 border-slate-100 text-slate-600 font-bold text-xs focus:border-emerald-500 outline-none bg-white transition-all cursor-pointer min-h-[120px] custom-scrollbar"
        >
          <option value="All" className="py-1 px-2 mb-1 rounded-lg checked:bg-emerald-500 checked:text-white">-- ALL {label.toUpperCase()} --</option>
          {options.map((opt: string) => (
            <option key={opt} value={opt} className="py-1 px-2 mb-1 rounded-lg checked:bg-emerald-500 checked:text-white">
              {opt}
            </option>
          ))}
        </select>
        <p className="mt-2 text-[9px] text-slate-400 font-medium italic">
          Hold Ctrl (Cmd) to select multiple
        </p>
      </div>
    </div>
  );
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default Dashboard;
