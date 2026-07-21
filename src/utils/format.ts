export const formatMb = (bytes: number): string => {
  return (bytes / 1048576).toFixed(1) + ' MB';
};
