import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100">
          AI Samadhan
        </Link>

        <div className="hidden md:flex space-x-6">
          {[
            { path: "/", label: "Dashboard" },
            { path: "/lesson-plan", label: "Lesson Plan" },
            { path: "/co-po-mapping", label: "CO-PO Mapping" },
            { path: "/question-bank", label: "Question Bank" },
            { path: "/course-materials", label: "Course Materials" },
            { path: "/reports", label: "Reports" },
          ].map((item, index) => (
            <Link 
              key={index}
              to={item.path} 
              className="relative font-medium hover:text-blue-200 transition-colors duration-200 after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-white after:transition-all hover:after:w-full"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
