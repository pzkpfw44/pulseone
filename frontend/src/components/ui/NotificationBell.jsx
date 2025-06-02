import React from 'react';
import { Bell } from 'lucide-react';

const NotificationBell = () => {
  return (
    <button className="relative p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-charcoal-500 focus:ring-offset-2 rounded-full">
      <Bell className="h-5 w-5" />
    </button>
  );
};

export default NotificationBell;