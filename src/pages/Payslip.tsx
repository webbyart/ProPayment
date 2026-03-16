import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { FileDown, Printer, Search } from 'lucide-react';
import { calculateWage } from '../utils/payroll';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Payslip: React.FC = () => {
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

  const generatePDF = (employee: any) => {
    const empEntries = timesheets.filter(ts => ts.employee_id === employee.id && ts.date.startsWith(selectedMonth));
    if (empEntries.length === 0) {
      alert('No data found for this employee in the selected month.');
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text('PAYSLIP', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Employee Name: ${employee.name}`, 20, 40);
    doc.text(`Employee ID: ${employee.employee_code}`, 20, 45);
    doc.text(`Position: ${employee.position}`, 20, 50);
    doc.text(`Period: ${selectedMonth}`, 20, 55);
    
    const tableData = empEntries.map(ts => {
      const rate = rates[ts.employee_id];
      let projectRate = 0;
      if (rate) {
        if (ts.project === 'Transportation') projectRate = rate.transportation;
        else if (ts.project === 'Workshop') projectRate = rate.workshop;
        else if (ts.project === 'Offshore') projectRate = rate.offshore;
        else projectRate = rate.onsite;
      }
      const wages = calculateWage(
        { normal_hours: ts.normal_hours, ot15: ts.ot15, ot20: ts.ot20, ot30: ts.ot30 },
        projectRate
      );
      return [
        ts.date,
        ts.project,
        ts.normal_hours,
        ts.ot15 + ts.ot20 + ts.ot30,
        `$${wages.total_income.toLocaleString()}`
      ];
    });

    autoTable(doc, {
      startY: 65,
      head: [['Date', 'Project', 'Normal Hrs', 'OT Hrs', 'Total Income']],
      body: tableData,
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const totalIncome = tableData.reduce((sum, row) => sum + parseFloat(row[4].replace('$', '').replace(',', '')), 0);
    
    doc.setFontSize(14);
    doc.text(`Total Salary: $${totalIncome.toLocaleString()}`, 20, finalY);

    doc.save(`Payslip_${employee.name}_${selectedMonth}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payslip Generator</h2>
          <p className="text-slate-500">Generate and download employee payslips</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="month" 
            className="px-4 py-2 rounded-lg border border-slate-200"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((emp) => (
          <div key={emp.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
                {emp.name.charAt(0)}
              </div>
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                {emp.status}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">{emp.name}</h3>
            <p className="text-sm text-slate-500 mb-6">{emp.employee_code} • {emp.position}</p>
            
            <button
              onClick={() => generatePDF(emp)}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl hover:bg-slate-800 transition-all"
            >
              <Printer size={18} />
              Generate PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Payslip;
