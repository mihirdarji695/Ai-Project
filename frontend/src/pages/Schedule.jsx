import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";
import axios from "axios";

const Schedule = () => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syllabusData, setSyllabusData] = useState(null);
  const [totalWeeks, setTotalWeeks] = useState(16);
  const [hoursPerWeek, setHoursPerWeek] = useState(3);

  useEffect(() => {
    const savedSyllabus = localStorage.getItem('currentSyllabus');
    if (savedSyllabus) {
      setSyllabusData(JSON.parse(savedSyllabus));
    }
    
    if (localStorage.getItem('materialsGenerated') === 'true') {
      generateSchedule();
    }
  }, []);

  const generateSchedule = async () => {
    if (!syllabusData) {
      toast.error("Please upload a syllabus first");
      return;
    }

    setLoading(true);
    
    try {
      const response = await axios.post('/generate_schedule', {
        syllabus: syllabusData,
        total_weeks: totalWeeks,
        hours_per_week: hoursPerWeek
      });
      setSchedule(response.data);
      toast.success("Schedule generated successfully");
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast.error("Failed to generate schedule");
    } finally {
      setLoading(false);
    }
  };

  const handleTotalWeeksChange = (e) => {
    setTotalWeeks(parseInt(e.target.value, 10));
  };

  const handleHoursPerWeekChange = (e) => {
    setHoursPerWeek(parseInt(e.target.value, 10));
  };

  const downloadSchedule = () => {
    if (schedule.length === 0) {
      toast.error("No schedule to download");
      return;
    }
    
    let csv = "Week,Day,Unit,Topic,Description,Activities\n";
    schedule.forEach(item => {
      csv += `${item.week},"${item.day}","${item.unit}","${item.topic}","${item.description.replace(/"/g, '""')}","${item.activities}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'course_schedule.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Schedule downloaded as CSV");
  };

  const downloadScheduleAsPDF = () => {
    if (schedule.length === 0) {
      toast.error("No schedule to download");
      return;
    }

    const doc = new jsPDF();
    doc.autoTable({
      head: [['Week', 'Day', 'Unit', 'Topic', 'Description', 'Activities']],
      body: schedule.map(item => [item.week, item.day, item.unit, item.topic, item.description, item.activities])
    });
    doc.save('course_schedule.pdf');
    toast.success("Schedule downloaded as PDF");
  };

  const saveExport = () => {
    if (schedule.length === 0) {
      toast.error("No schedule to export");
      return;
    }

    let csv = "Week,Day,Unit,Topic,Description,Activities\n";
    schedule.forEach(item => {
      csv += `${item.week},"${item.day}","${item.unit}","${item.topic}","${item.description.replace(/"/g, '""')}","${item.activities}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'course_schedule_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Schedule exported successfully");
  };

  const downloadLessonPlannerAsPDF = () => {
    if (schedule.length === 0) {
      toast.error("No lesson planner to download");
      return;
    }

    const doc = new jsPDF();
    doc.autoTable({
      head: [['Week', 'Day', 'Unit', 'Topic', 'Description', 'Activities']],
      body: schedule.map(item => [item.week, item.day, item.unit, item.topic, item.description, item.activities])
    });
    doc.save('lesson_planner.pdf');
    toast.success("Lesson planner downloaded as PDF");
  };

  const exportLessonPlanner = () => {
    if (schedule.length === 0) {
      toast.error("No lesson planner to export");
      return;
    }

    let csv = "Week,Day,Unit,Topic,Description,Activities\n";
    schedule.forEach(item => {
      csv += `${item.week},"${item.day}","${item.unit}","${item.topic}","${item.description.replace(/"/g, '""')}","${item.activities}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lesson_planner_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Lesson planner exported successfully");
  };

  return (
    <div className="p-6">
      <motion.h2 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600"
      >
        Day-wise Schedule
      </motion.h2>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-6 rounded-2xl shadow-lg mb-8 border border-purple-100"
      >
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
          <div className="w-full">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Course Duration</h3>
            <div className="flex items-center">
              <input 
                type="number" 
                min="1" 
                max="24" 
                value={totalWeeks} 
                onChange={handleTotalWeeksChange}
                className="w-16 p-2 border border-gray-300 rounded-lg mr-2"
              />
              <span className="text-gray-700">Weeks</span>
            </div>
          </div>
          <div className="w-full">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Hours Per Week</h3>
            <div className="flex items-center">
              <input 
                type="number" 
                min="1" 
                max="10" 
                value={hoursPerWeek} 
                onChange={handleHoursPerWeekChange}
                className="w-16 p-2 border border-gray-300 rounded-lg mr-2"
              />
              <span className="text-gray-700">Hours</span>
            </div>
          </div>
          <div className="w-full flex justify-end">
            <button
              onClick={generateSchedule}
              disabled={loading || !syllabusData}
              className="py-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Generating..." : "Generate Schedule"}
            </button>
          </div>
        </div>
        
        {schedule.length > 0 && (
          <div className="mt-4 text-right">
            <button
              onClick={downloadSchedule}
              className="py-2 px-4 bg-green-100 hover:bg-green-200 text-green-800 font-medium rounded-lg transition-colors mr-2"
            >
              Download CSV
            </button>
            <button
              onClick={downloadScheduleAsPDF}
              className="py-2 px-4 bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium rounded-lg transition-colors mr-2"
            >
              Download PDF
            </button>
            <button
              onClick={saveExport}
              className="py-2 px-4 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-medium rounded-lg transition-colors mr-2"
            >
              Save Export
            </button>
            <button
              onClick={downloadLessonPlannerAsPDF}
              className="py-2 px-4 bg-purple-100 hover:bg-purple-200 text-purple-800 font-medium rounded-lg transition-colors mr-2"
            >
              Download Lesson Planner PDF
            </button>
            <button
              onClick={exportLessonPlanner}
              className="py-2 px-4 bg-orange-100 hover:bg-orange-200 text-orange-800 font-medium rounded-lg transition-colors"
            >
              Export Lesson Planner CSV
            </button>
          </div>
        )}
      </motion.div>
      
      {schedule.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl shadow-lg border border-purple-100"
        >
          <h3 className="text-xl font-semibold mb-4 text-indigo-800">Course Schedule</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activities</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schedule.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.week}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.day}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.unit}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{item.topic}</div>
                      <div className="text-xs text-gray-500 truncate max-w-md">{item.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.activities}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-purple-100 text-center">
          {loading ? (
            <p className="text-gray-600">Generating schedule...</p>
          ) : !syllabusData ? (
            <p className="text-gray-600">Please upload a syllabus from the Dashboard first.</p>
          ) : (
            <p className="text-gray-600">Click "Generate Schedule" to create a day-wise schedule.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Schedule;