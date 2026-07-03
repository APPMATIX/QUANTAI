import ProjectForm from '../components/projects/ProjectForm';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NewProjectPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          to="/projects" 
          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Create New Project</h1>
          <p className="text-gray-400 text-sm mt-1">Set up a new project for AI quantity takeoff.</p>
        </div>
      </div>

      <div className="glass-card p-6 sm:p-8">
        <ProjectForm />
      </div>
    </div>
  );
}
