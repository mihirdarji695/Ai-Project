import React, { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, BookOpen, BarChart3, Search, Download, FileText, PieChart, LineChart, Table } from "lucide-react";

const Reports = () => {
  const [filters, setFilters] = useState({ date: "", course: "", instructor: "" });

  const reports = [
    { 
      title: "CO-PO Mapping Report", 
      icon: <Table className="text-orange-500" />,
      description: "View compliance and alignment between course objectives and program outcomes",
      color: "from-orange-500 to-amber-500" 
    },
    { 
      title: "Lesson Plan Effectiveness Report", 
      icon: <Calendar className="text-blue-500" />,
      description: "Analyze teaching methodology impact against student performance metrics",
      color: "from-blue-500 to-indigo-500" 
    },
    { 
      title: "Question Bank Analysis Report", 
      icon: <BookOpen className="text-purple-500" />,
      description: "Distribution of questions by difficulty, cognitive level, and topic coverage",
      color: "from-purple-500 to-violet-500" 
    },
    { 
      title: "Course Material Utilization Report", 
      icon: <FileText className="text-teal-500" />,
      description: "Track student engagement with course materials and resources",
      color: "from-teal-500 to-emerald-500" 
    },
  ];

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div>
      <motion.h2 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-blue-600"
      >
        Reports & Analysis
      </motion.h2>

      {/* Filters */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white p-6 rounded-2xl shadow-lg mb-8 border border-violet-100"
      >
        <h3 className="text-xl font-semibold mb-4 text-violet-800 flex items-center">
          <Search className="w-5 h-5 mr-2 text-violet-600" />
          Filter Reports
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <input
              type="date"
              className="border border-violet-200 p-3 rounded-xl w-full focus:ring-2 focus:ring-violet-400 focus:outline-none transition-all"
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <input
              type="text"
              placeholder="Course Name"
              className="border border-violet-200 p-3 rounded-xl w-full focus:ring-2 focus:ring-violet-400 focus:outline-none transition-all"
              onChange={(e) => setFilters({ ...filters, course: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
            <input
              type="text"
              placeholder="Instructor Name"
              className="border border-violet-200 p-3 rounded-xl w-full focus:ring-2 focus:ring-violet-400 focus:outline-none transition-all"
              onChange={(e) => setFilters({ ...filters, instructor: e.target.value })}
            />
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
        >
          Apply Filters
        </motion.button>
      </motion.div>

      {/* Report List */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="bg-white p-6 rounded-2xl shadow-lg border border-violet-100"
      >
        <h3 className="text-xl font-semibold mb-4 text-violet-800 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-violet-600" />
          Available Reports
        </h3>
        
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {reports.map((report, i) => (
            <motion.div
              key={i}
              variants={item}
              className="border border-violet-100 rounded-xl overflow-hidden hover:shadow-md transition-all"
            >
              <div className={`bg-gradient-to-r ${report.color} p-4 text-white flex items-center justify-between`}>
                <h4 className="font-semibold flex items-center">
                  <span className="bg-white/20 p-2 rounded-lg mr-3">
                    {report.icon}
                  </span>
                  {report.title}
                </h4>
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                  Updated Today
                </span>
              </div>
              
              <div className="p-4">
                <p className="text-gray-600 text-sm mb-4">{report.description}</p>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-xs px-3 py-1.5 border border-violet-200 rounded-full text-violet-700 hover:bg-violet-50 flex items-center"
                  >
                    <Download className="w-3 h-3 mr-1" /> PDF
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-xs px-3 py-1.5 border border-emerald-200 rounded-full text-emerald-700 hover:bg-emerald-50 flex items-center"
                  >
                    <Download className="w-3 h-3 mr-1" /> Excel
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-xs px-3 py-1.5 border border-blue-200 rounded-full text-blue-700 hover:bg-blue-50 flex items-center"
                  >
                    <PieChart className="w-3 h-3 mr-1" /> View Charts
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Analytics Summary */}
        <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100">
          <h4 className="font-semibold text-violet-800 mb-3 flex items-center">
            <LineChart className="w-4 h-4 mr-2 text-violet-600" />
            Analytics Summary
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <div className="text-sm text-gray-500">Course Completion</div>
              <div className="text-2xl font-bold text-violet-700">87%</div>
              <div className="w-full bg-violet-100 rounded-full h-2 mt-2">
                <div className="bg-violet-600 h-2 rounded-full" style={{ width: "87%" }}></div>
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <div className="text-sm text-gray-500">CO Attainment</div>
              <div className="text-2xl font-bold text-blue-700">72%</div>
              <div className="w-full bg-blue-100 rounded-full h-2 mt-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: "72%" }}></div>
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <div className="text-sm text-gray-500">Assessment Balance</div>
              <div className="text-2xl font-bold text-teal-700">93%</div>
              <div className="w-full bg-teal-100 rounded-full h-2 mt-2">
                <div className="bg-teal-600 h-2 rounded-full" style={{ width: "93%" }}></div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Reports;
