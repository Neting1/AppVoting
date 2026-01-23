import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { LogOut, LayoutDashboard, UserCheck, Vote, Medal, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  if (!user) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  const isActive = (path: string) => location.pathname === path;

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
    <Link
      to={to}
      className={`flex items-center px-4 py-3 text-sm font-medium transition-colors rounded-lg mb-1 ${
        isActive(to)
          ? 'bg-indigo-50 text-indigo-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
      onClick={() => setIsMobileMenuOpen(false)}
    >
      <Icon className="w-5 h-5 mr-3" />
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center z-20">
        <div className="flex items-center font-bold text-indigo-600">
          <Medal className="w-6 h-6 mr-2" />
          <span>Twinhill Enterprise</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside 
        className={`fixed md:sticky top-0 h-screen w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out z-10 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col`}
      >
        <div className="p-6 border-b border-gray-100 hidden md:flex items-center">
          <Medal className="w-8 h-8 text-indigo-600 mr-3" />
          <h1 className="text-xl font-bold text-gray-900">Twinhill Enterprise</h1>
        </div>

        <div className="p-6 border-b border-gray-100 bg-indigo-50/50">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
              {user.name.charAt(0)}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
            
            {user.role === UserRole.ADMIN && (
              <NavItem to="/admin" icon={UserCheck} label="Admin Panel" />
            )}
            
            <div className="pt-4 mt-4 border-t border-gray-100">
              <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Actions
              </p>
              <NavItem to="/nominate" icon={UserCheck} label="Nominate" />
              <NavItem to="/vote" icon={Vote} label="Vote" />
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-0 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}
    </div>
  );
};