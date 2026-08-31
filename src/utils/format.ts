export const formatMb = (bytes: number): string => {
  return (bytes / 1048576).toFixed(1) + ' MB';
};

// Số ngày dương lịch đã trôi qua kể từ một mốc "yyyy-mm-dd" (không tính giờ/phút)
export const daysSince = (isoDate: string): number => {
  const [year, month, day] = isoDate.split('-').map(Number);
  const start = Date.UTC(year, month - 1, day);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today - start) / 86400000));
};

export const formatDateVi = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
};
