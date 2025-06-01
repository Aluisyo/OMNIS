import { format, formatDistanceToNow } from 'date-fns';

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return format(date, 'MMM dd, yyyy HH:mm:ss');
}

export function formatTimeAgo(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatAddress(address: string, chars = 5): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function formatCurrency(amount: number): string {
  return `${formatNumber(amount)} AR`;
}