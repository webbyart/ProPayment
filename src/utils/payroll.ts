import { parse, differenceInMinutes, getDay, isSaturday, isSunday, format } from 'date-fns';

export interface CalculatedHours {
  normal_hours: number;
  ot15: number;
  ot20: number;
  ot30: number;
}

export const calculateHours = (
  dateStr: string,
  timeIn: string,
  timeOut: string,
  lunchDeduct: number = 1 // default 1 hour
): CalculatedHours => {
  const date = new Date(dateStr);
  const start = parse(timeIn, 'HH:mm', date);
  const end = parse(timeOut, 'HH:mm', date);
  
  let totalMinutes = differenceInMinutes(end, start);
  if (totalMinutes < 0) totalMinutes += 24 * 60; // handle overnight if needed
  
  const totalHours = (totalMinutes / 60) - lunchDeduct;
  const day = getDay(date); // 0 = Sunday, 6 = Saturday
  
  let normal_hours = 0;
  let ot15 = 0;
  let ot20 = 0;
  let ot30 = 0;

  if (isSunday(date)) {
    // Sunday: All work = OT 2, After 8 hours OT 3
    if (totalHours <= 8) {
      ot20 = Math.max(0, totalHours);
    } else {
      ot20 = 8;
      ot30 = totalHours - 8;
    }
  } else if (isSaturday(date)) {
    // Saturday: Normal 4 hours, rest OT 1.5
    normal_hours = Math.min(4, totalHours);
    ot15 = Math.max(0, totalHours - 4);
  } else {
    // Mon-Fri: Normal 8 hours, rest OT 1.5
    normal_hours = Math.min(8, totalHours);
    ot15 = Math.max(0, totalHours - 8);
  }

  return {
    normal_hours: Number(normal_hours.toFixed(2)),
    ot15: Number(ot15.toFixed(2)),
    ot20: Number(ot20.toFixed(2)),
    ot30: Number(ot30.toFixed(2))
  };
};

export const formatMonth = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return format(date, 'MMM-yy');
  } catch (e) {
    return 'Unknown';
  }
};

export const calculateWage = (
  hours: CalculatedHours,
  dayRate: number = 0,
  otherIncome: { confine_space: number; incentive: number; perdiem: number } = { confine_space: 0, incentive: 0, perdiem: 0 }
) => {
  const safeDayRate = Number(dayRate) || 0;
  const hourRate = safeDayRate / 8;
  
  const normal_wage = (hours.normal_hours || 0) * hourRate;
  const ot15_wage = (hours.ot15 || 0) * hourRate * 1.5;
  const ot20_wage = (hours.ot20 || 0) * hourRate * 2;
  const ot30_wage = (hours.ot30 || 0) * hourRate * 3;
  
  const total_income = normal_wage + ot15_wage + ot20_wage + ot30_wage + 
                       (otherIncome.confine_space || 0) + (otherIncome.incentive || 0) + (otherIncome.perdiem || 0);
                       
  return {
    normal_wage,
    ot15_wage,
    ot20_wage,
    ot30_wage,
    total_income,
    ot_income: ot15_wage + ot20_wage + ot30_wage
  };
};
