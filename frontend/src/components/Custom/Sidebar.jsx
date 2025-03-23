import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Calendar, Link, BookOpen, File, BarChart } from "lucide-react"; 

const Sidebar = () => {
  // Navigation items array
  const navItems = [
    { path: "/", icon: Home, label: "Dashboard" },
    { path: "/lesson-plan", icon: Calendar, label: "Lesson Plan" },
    { path: "/co-po-mapping", icon: Link, label: "CO-PO Mapping" },
    { path: "/question-bank", icon: BookOpen, label: "Question Bank" },
    { path: "/course-materials", icon: File, label: "Course Materials" },
    { path: "/reports", icon: BarChart, label: "Reports" },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <aside className="fixed bottom-0 left-0 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 shadow-lg border-t border-indigo-700 flex md:hidden justify-around py-2 px-2 z-10">
        {navItems.map((item, index) => (
          <NavLink 
            key={index}
            to={item.path} 
            className={({ isActive }) => 
              `flex flex-col items-center rounded-full p-1.5 transition-all duration-200 ${
                isActive 
                  ? "text-white bg-white/20 scale-110" 
                  : "text-indigo-100 hover:bg-white/10 hover:scale-105"
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{item.label.split(" ")[0]}</span>
          </NavLink>
        ))}
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 bg-gradient-to-b from-indigo-600 to-purple-700 text-white min-h-screen p-4 shadow-xl">
        <div className="text-xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100 mt-2">
          AI Samadhan
        </div>
        <div className="space-y-2">
          {navItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center py-2 px-4 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-white/20 text-white font-medium shadow-lg"
                    : "text-indigo-100 hover:bg-white/10"
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
