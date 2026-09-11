export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getDayName(year: number, month: number, day: number): string {
  const date = new Date(year, month - 1, day);
  const dayIndex = date.getDay(); // 0 is Sunday
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  return dayNames[dayIndex];
}

export function isWeekend(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  const dayIndex = date.getDay();
  return dayIndex === 0 || dayIndex === 6; // Sunday or Saturday
}

export function getMonthName(month: number): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[month - 1] || '';
}

export function formatDateDDMMYYYY(dateInput?: string | Date): string {
  if (!dateInput) {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput.replace(' ', 'T')) : dateInput;
    if (isNaN(d.getTime())) {
      const match = String(dateInput).match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
      if (match) {
        return `${match[3]}/${match[2]}/${match[1]}`;
      }
      return String(dateInput).substring(0, 10);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
}

export function formatDateTimeStamp(dateInput: Date = new Date()): string {
  const day = String(dateInput.getDate()).padStart(2, '0');
  const month = String(dateInput.getMonth() + 1).padStart(2, '0');
  const year = dateInput.getFullYear();
  const hours = String(dateInput.getHours()).padStart(2, '0');
  const minutes = String(dateInput.getMinutes()).padStart(2, '0');
  const seconds = String(dateInput.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} WIB`;
}

export function downloadCSV(arg1: string | any[], arg2?: string | any[]) {
  let filename = 'export.csv';
  let rowsData: any[] = [];

  if (typeof arg1 === 'string') {
    filename = arg1;
    rowsData = Array.isArray(arg2) ? arg2 : [];
  } else if (Array.isArray(arg1)) {
    rowsData = arg1;
    if (typeof arg2 === 'string') {
      filename = arg2;
    }
  }

  if (rowsData.length === 0) {
    return;
  }

  let formattedRows: (string | number)[][] = [];

  // Check if rows are objects (Record<string, any>[])
  if (typeof rowsData[0] === 'object' && rowsData[0] !== null && !Array.isArray(rowsData[0])) {
    const headers = Object.keys(rowsData[0]);
    formattedRows.push(headers);
    rowsData.forEach((item) => {
      formattedRows.push(headers.map((h) => (item[h] !== undefined && item[h] !== null ? item[h] : '')));
    });
  } else {
    formattedRows = rowsData as (string | number)[][];
  }

  const processRow = (row: (string | number)[]) => {
    return row
      .map((val) => {
        let stringVal = val === null || val === undefined ? '' : val.toString();
        if (stringVal.search(/("|,|\n)/g) >= 0) {
          stringVal = `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
      })
      .join(',');
  };

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + formattedRows.map(processRow).join('\r\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


