export type Role = 'super_admin' | 'admin' | 'user';
export type ProjectStatus = 'draft' | 'processing' | 'completed';
export type ProjectFileStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ProjectFileType = 'input' | 'output' | 'virtual_boq';
export type DrawingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ElementCategory = 'footing' | 'column' | 'beam' | 'slab';
export type ArchCategory = 'walls' | 'paint' | 'flooring' | 'ceiling';
export type Confidence = 'high' | 'medium' | 'low';

export interface Company {
  id: string;
  name: string;
  company_code: string;
  logo_url?: string;
  contact_person?: string;
  email?: string;
  mobile_number?: string;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  time_zone?: string;
  subscription_plan?: string;
  subscription_start_date?: string;
  subscription_expiry_date?: string;
  max_users?: number;
  status: 'active' | 'suspended' | 'inactive';
  created_at: string;
}

export interface CostCatalogueItem {
  id: string;
  company_id: string;
  item_code?: string;
  description: string;
  unit: string;
  rate: number;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  company_id?: string;
  username?: string;
  department?: string;
  designation?: string;
  mobile_number?: string;
  avatar_url?: string;
  status: 'active' | 'inactive';
  force_password_reset: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  company_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  created_at: string;
}

export interface Project { 
  id: string; 
  company_id: string;
  name: string; 
  client: string; 
  location: string; 
  description: string; 
  status: ProjectStatus; 
  created_by: string; 
  created_at: string; 
}

export interface ProjectFile {
  id: string;
  project_id: string;
  file_url: string;
  file_name: string;
  file_size_bytes: number;
  status: ProjectFileStatus;
  file_type: ProjectFileType;
  created_at: string;
}

export interface StructuralElement { 
  id: string; 
  project_id: string; 
  drawing_id: string; 
  element: ElementCategory; 
  grid: string; 
  length_m: number; 
  width_m: number; 
  depth_m: number; 
  quantity: number; 
  unit: string; 
  confidence: Confidence; 
  is_approved: boolean; 
}

export interface ArchitecturalElement { 
  id: string; 
  project_id: string; 
  drawing_id: string; 
  room: string; 
  category: ArchCategory; 
  quantity: number; 
  unit: string; 
  confidence: Confidence; 
  is_approved: boolean; 
}
