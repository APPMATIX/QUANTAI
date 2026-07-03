import * as XLSX from 'xlsx';
import type { StructuralElement, ArchitecturalElement, Project } from '../types/app';

export function generateExcel(
  project: Project,
  structural: StructuralElement[], 
  architectural: ArchitecturalElement[]
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Structural Takeoff
  const structuralData = structural.map(e => ({
    Element: e.element.charAt(0).toUpperCase() + e.element.slice(1),
    Grid: e.grid || '-',
    'Length (m)': e.length_m || '-',
    'Width (m)': e.width_m || '-',
    'Depth (m)': e.depth_m || '-',
    Quantity: e.quantity,
    Unit: e.unit,
    Confidence: e.confidence
  }));
  
  const ws1 = XLSX.utils.json_to_sheet(structuralData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Structural Takeoff');

  // Sheet 2: Architectural Takeoff
  const archData = architectural.map(e => ({
    Room: e.room || '-',
    Category: e.category.charAt(0).toUpperCase() + e.category.slice(1),
    Quantity: e.quantity,
    Unit: e.unit,
    Confidence: e.confidence
  }));
  
  const ws2 = XLSX.utils.json_to_sheet(archData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Architectural Takeoff');

  // Generate filename: ProjectName_BoQ_YYYY-MM-DD.xlsx
  const dateStr = new Date().toISOString().split('T')[0];
  const safeProjectName = project.name.replace(/[^a-z0-9]/gi, '_');
  const filename = `${safeProjectName}_BoQ_${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename);
}

export function generateBoQExcel(project: Project, allItems: any[]): void {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(allItems);
  XLSX.utils.book_append_sheet(wb, ws, 'Bill of Quantities');

  const dateStr = new Date().toISOString().split('T')[0];
  const safeProjectName = project.name.replace(/[^a-z0-9]/gi, '_');
  const filename = `${safeProjectName}_BoQ_Costed_${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename);
}

export function generateCSV(
  project: Project,
  structural: StructuralElement[], 
  architectural: ArchitecturalElement[],
  type: 'structural' | 'architectural'
): void {
  const wb = XLSX.utils.book_new();
  
  if (type === 'structural') {
    const data = structural.map(e => ({
      Element: e.element,
      Grid: e.grid || '-',
      Length_m: e.length_m || '-',
      Width_m: e.width_m || '-',
      Depth_m: e.depth_m || '-',
      Quantity: e.quantity,
      Unit: e.unit
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
  } else {
    const data = architectural.map(e => ({
      Room: e.room || '-',
      Category: e.category,
      Quantity: e.quantity,
      Unit: e.unit
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const safeProjectName = project.name.replace(/[^a-z0-9]/gi, '_');
  const filename = `${safeProjectName}_${type}_${dateStr}.csv`;
  
  XLSX.writeFile(wb, filename, { bookType: 'csv' });
}
