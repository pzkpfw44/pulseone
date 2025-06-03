import React from 'react';
import { BarChart3 } from 'lucide-react';

const Analytics = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600">Cross-module insights and performance metrics</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
        <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics</h3>
        <p className="text-gray-500">This feature is under development.</p>
      </div>
    </div>
  );
};

export default Analytics;