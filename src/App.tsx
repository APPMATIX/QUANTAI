import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectListPage from './pages/ProjectListPage';
import NewProjectPage from './pages/NewProjectPage';
import ProjectFolderPage from './pages/ProjectFolderPage';
import ProcessingPage from './pages/ProcessingPage';
import BoqReview from './pages/BoqReview';
import ExportPage from './pages/ExportPage';
import CostCataloguePage from './pages/CostCataloguePage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import CompanySettingsPage from './pages/admin/CompanySettingsPage';
import CompanyManagementPage from './pages/super-admin/CompanyManagementPage';
import AuditLogsPage from './pages/super-admin/AuditLogsPage';
import CostCatalogPage from './pages/admin/CostCatalogPage';

// Removed unused placeholder

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfileSettingsPage />} />
              
              {/* Project Routes */}
              <Route path="/projects" element={<ProjectListPage />} />
              <Route path="/projects/new" element={<NewProjectPage />} />
              <Route path="/cost-catalogue" element={<CostCataloguePage />} />
              <Route path="/projects/:id" element={<ProjectFolderPage />} />
              <Route path="/projects/:id/processing" element={<ProcessingPage />} />
              <Route path="/projects/:id/boq" element={<BoqReview />} />
              <Route path="/projects/:id/export" element={<ExportPage />} />
              
              {/* Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin']} />}>
                <Route path="/admin/users" element={<UserManagementPage />} />
                <Route path="/admin/company-settings" element={<CompanySettingsPage />} />
                <Route path="/admin/cost-catalog" element={<CostCatalogPage />} />
                <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
              </Route>
              
              <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
                <Route path="/admin/companies" element={<CompanyManagementPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#0a0e1a',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }
        }} 
      />
    </QueryClientProvider>
  );
}
