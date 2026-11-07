import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtMin, to12 } from './time';

const rows = (records, notes) => records.map((r) => [r.date, to12(r.inTime), to12(r.outTime), `${r.breakMinutes} min`, fmtMin(r.totalWorkingMinutes), fmtMin(r.overtimeMinutes), ...(notes ? [r.notes || ''] : [])]);
const head = (notes) => ['Date', 'In', 'Out', 'Break', 'Working', 'Overtime', ...(notes ? ['Notes'] : [])];
const sumRows = (s) => [
  ['Total working days', s.totalWorkingDays], ['Total working hours', fmtMin(s.totalWorkingMinutes)],
  ['Total overtime hours', fmtMin(s.totalOvertimeMinutes)], ['Average daily working hours', fmtMin(s.averageWorkingMinutes)],
  ['Total break hours', fmtMin(s.totalBreakMinutes)],
];

export function exportExcel(records, summary, label, notes = true) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([['Himanshu Office Time Tracker'], [label], [], ...sumRows(summary), [], head(notes), ...rows(records, notes)]);
  ws['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, `attendance-report-${label.replace(/[^\w-]+/g, '_')}.xlsx`);
}
export function exportPdf(records, summary, label, notes = true) {
  const doc = new jsPDF();
  doc.setFontSize(16); doc.text('Himanshu Office Time Tracker', 14, 16);
  doc.setFontSize(11); doc.text(`Attendance report: ${label}`, 14, 23);
  autoTable(doc, { startY: 29, head: [['Summary', '']], body: sumRows(summary).map((r) => [r[0], String(r[1])]), theme: 'grid', headStyles: { fillColor: [79, 70, 229] }, tableWidth: 90 });
  autoTable(doc, { startY: doc.lastAutoTable.finalY + 8, head: [head(notes)], body: rows(records, notes), headStyles: { fillColor: [79, 70, 229] }, styles: { fontSize: 9 } });
  doc.save(`attendance-report-${label.replace(/[^\w-]+/g, '_')}.pdf`);
}
