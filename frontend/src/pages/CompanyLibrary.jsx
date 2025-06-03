import React from 'react';
import { FolderOpen } from 'lucide-react';

const CompanyLibrary = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Library</h1>
        <p className="text-gray-600">Manage and explore your organization's knowledge base</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
        <FolderOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Company Library</h3>
        <p className="text-gray-500">This feature is under development.</p>
      </div>
    </div>
  );
};

export default CompanyLibrary;