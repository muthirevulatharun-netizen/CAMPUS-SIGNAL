import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout requiredRole="staff">{children}</DashboardLayout>;
}
