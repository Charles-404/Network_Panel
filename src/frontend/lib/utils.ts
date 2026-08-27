import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatBits(bytes: number, decimals: number = 2): string {
  if (!bytes || bytes === 0) return '0 bps';
  
  const bits = bytes * 8;
  const k = 1000; // Use 1000 for network speeds
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps'];
  
  const i = Math.floor(Math.log(bits) / Math.log(k));
  
  return parseFloat((bits / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  
  return parts.join(' ');
}

export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

export function getStatusColor(status: 'online' | 'offline' | 'warning'): string {
  switch (status) {
    case 'online':
      return 'text-noc-green';
    case 'offline':
      return 'text-noc-red';
    case 'warning':
      return 'text-noc-yellow';
    default:
      return 'text-noc-text-muted';
  }
}

export function getStatusBgColor(status: 'online' | 'offline' | 'warning'): string {
  switch (status) {
    case 'online':
      return 'bg-noc-green/20';
    case 'offline':
      return 'bg-noc-red/20';
    case 'warning':
      return 'bg-noc-yellow/20';
    default:
      return 'bg-noc-text-muted/20';
  }
}

export function getDeviceIcon(type: string): string {
  switch (type.toLowerCase()) {
    case 'mac':
    case 'pc':
      return 'Monitor';
    case 'iphone':
    case 'android':
      return 'Smartphone';
    case 'ipad':
      return 'Tablet';
    case 'nas':
      return 'HardDrive';
    case 'tv':
      return 'Tv';
    case 'printer':
      return 'Printer';
    case 'iot':
      return 'Wifi';
    default:
      return 'Monitor';
  }
}

export function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}