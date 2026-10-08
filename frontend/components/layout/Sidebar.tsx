'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { 
  LayoutDashboard, FileText, PlusCircle, 
  CheckSquare, Activity, AlertTriangle, 
  BarChart3, Users, Settings, LogOut, Waves, History
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const links = {
    student: [
      { name: 'Dashboard', href: '/student', icon: LayoutDashboard },
      { name: 'My Complaints', href: '/student/complaints', icon: FileText },
      { name: 'Report Problem', href: '/student/report', icon: PlusCircle },
    ],
    staff: [
      { name: 'Dashboard', href: '/staff', icon: LayoutDashboard },
      { name: 'My Queue', href: '/staff/queue', icon: CheckSquare },
      { name: 'Resolved', href: '/staff/resolved', icon: CheckSquare },
    ],
    admin: [
      { name: 'Overview', href: '/admin', icon: LayoutDashboard },
      { name: 'All Complaints', href: '/admin/complaints', icon: FileText },
      { name: 'Signals', href: '/admin/signals', icon: Waves },
      { name: 'Emerging Issues', href: '/admin/emerging', icon: AlertTriangle },
      { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
      { name: 'Audit Trail', href: '/admin/audit', icon: History },
      { name: 'Staff', href: '/admin/staff', icon: Users },
      { name: 'Settings', href: '/admin/settings', icon: Settings },
    ]
  };

  const navLinks = links[user.role] || [];

  return (
    <div className="w-64 bg-primary text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800">
      <div className="p-6 flex items-center gap-3">
        <Waves className="w-8 h-8 text-indigo-500" />
        <span className="text-xl font-bold text-white tracking-tight">SIGNAL</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive ? 'bg-indigo-600/10 text-indigo-400 font-medium' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <link.icon className="w-5 h-5" />
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
            {user.full_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
            <p className="text-xs text-slate-500 capitalize">{user.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );
}
