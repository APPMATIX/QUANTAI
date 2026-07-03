import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  LayoutDashboard, 
  FolderOpen, 
  PlusSquare, 
  Users, 
  Building,
  Settings,
  DollarSign
} from 'lucide-react';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { role, company } = useAuth();

  const navItems = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'user'] },
    { name: 'Projects', to: '/projects', icon: FolderOpen, roles: ['super_admin', 'admin', 'user'] },
    { name: 'New Project', to: '/projects/new', icon: PlusSquare, roles: ['super_admin', 'admin', 'user'] },
    { name: 'User Management', to: '/admin/users', icon: Users, roles: ['super_admin', 'admin'] },
    { name: 'Cost Catalogue', to: '/cost-catalogue', icon: DollarSign, roles: ['super_admin', 'admin', 'user'] },
    { name: 'Company Settings', to: '/admin/company-settings', icon: Settings, roles: ['admin'] },
    { name: 'Companies', to: '/admin/companies', icon: Building, roles: ['super_admin'] },
    { name: 'Audit Logs', to: '/admin/audit-logs', icon: Settings, roles: ['super_admin', 'admin'] },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
          onClick={onClose}
        />
      )}

      <div className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 bg-brand-surface border-r border-brand-border flex flex-col h-full backdrop-blur-md transition-transform duration-300 md:relative md:translate-x-0",
        isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 truncate">
          {company?.logo_url ? (
            <img src={company.logo_url} alt={company.name || "Company Logo"} className="w-6 h-6 object-contain rounded-sm bg-white" />
          ) : (
            <img src="/logo.png" alt="Quant-AI Logo" className="w-6 h-6 object-contain rounded-sm" />
          )}
          <span className="truncate">
            {company?.name || 'Quant-AI'}
          </span>
        </h2>
        {/* Mobile Close Button */}
        <button 
          onClick={onClose}
          className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          if (role && !item.roles.includes(role)) return null;

          return (
            <NavLink
              key={item.name}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive 
                    ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-brand-border flex flex-col gap-2">
        <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-all">
          <Settings className="w-5 h-5" />
          Settings
        </button>
        <div className="text-center mt-2 mb-1 flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
            <img src="/logo.png" alt="Quant-AI" className="w-4 h-4 object-contain rounded-sm" />
            <span className="text-[10px] font-semibold text-gray-400">Powered by</span>
          </div>
          <p className="text-xs text-gray-300 font-bold mt-0.5">
            Quant-AI
          </p>
          <div className="mt-3 text-[10px] text-gray-500 text-center">
            <p>Developed & Designed by</p>
            <a 
              href="https://www.appmatixsolutions.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-brand-primary hover:text-brand-accent transition-colors font-medium mt-0.5 inline-block"
            >
              Appmatix Solutions
            </a>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
