import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

const Schedule = () => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syllabusData, setSyllabusData] = useState(null);
  const [totalWeeks, setTotalWeeks] = useState(16);
  const [hoursPerWeek, setHoursPerWeek] = useState(3);

  useEffect(() => {
    // Check if syllabus data exists in localStorage
    const savedSyllabus = localStorage.getItem('currentSyllabus');
    if (savedSyllabus) {
      setSyllabusData(JSON.parse(savedSyllabus));
    }
    
    // Check if materials have been generated
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
      // In a real implementation, we would call the backend API
      // For now, we'll generate a mock schedule based on the syllabus topics
      
      const topics = syllabusData.topics || [];
      const units = groupTopicsByUnit(topics);
      
      // Calculate hours per unit based on total course duration
      const totalHours = totalWeeks * hoursPerWeek;
      const hoursPerUnit = Math.floor(totalHours / units.length);
      
      let generatedSchedule = [];
      let currentWeek = 1;
      let currentHour = 1;
      
      units.forEach((unit, unitIndex) => {
        const unitHours = unitIndex === units.length - 1 
          ? totalHours - (hoursPerUnit * (units.length - 1)) // Assign remaining hours to last unit
          : hoursPerUnit;
          
        const topicsInUnit = unit.topics;
        const hoursPerTopic = Math.max(1, Math.floor(unitHours / topicsInUnit.length));
        
        topicsInUnit.forEach((topic, topicIndex) => {
          let topicHours = topicIndex === topicsInUnit.length - 1 
            ? unitHours - (hoursPerTopic * (topicsInUnit.length - 1)) // Assign remaining unit hours to last topic
            : hoursPerTopic;
            
          // Create schedule entries for this topic
          for (let i = 0; i < topicHours; i++) {
            generatedSchedule.push({
              id: generatedSchedule.length + 1,
              week: currentWeek,
              day: getDayFromHour(currentHour),
              unit: unit.title,
              topic: topic.title,
              description: topic.content.substring(0, 100) + "...",
              activities: i === 0 ? "Introduction, Lecture" : i === topicHours - 1 ? "Review, Exercise" : "Lecture, Discussion"
            });
            
            currentHour++;
            if (currentHour > hoursPerWeek) {
              currentHour = 1;
              currentWeek++;
            }
          }
        });
      });
      
      setSchedule(generatedSchedule);
      toast.success("Schedule generated successfully");
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast.error("Failed to generate schedule");
    } finally {
      setLoading(false);
    }
  };

  const groupTopicsByUnit = (topics) => {
    const units = [];
    let currentUnit = null;
    
    topics.forEach(topic => {
      // Check if this topic starts a new unit
      const isUnitTitle = /^(Unit|Chapter|Section)\s+[IVXLCDM0-9]+/i.test(topic.title);
      
      if (isUnitTitle) {
        currentUnit = {
          title: topic.title,
          topics: []
        };
        units.push(currentUnit);
      } else if (currentUnit) {
        currentUnit.topics.push(topic);
      } else {
        // If no unit has been started yet, create a default one
        currentUnit = {
          title: "Unit 1",
          topics: [topic]
        };
        units.push(currentUnit);
      }
    });
    
    // If we ended up with empty units, fix that
    return units.filter(unit => unit.topics.length > 0);
  };

  const getDayFromHour = (hour) => {
    switch(hour) {
      case 1: return "Monday";
      case 2: return "Wednesday";
      case 3: return "Friday";
      default: return "Monday";
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
    
    // Create CSV content
    let csv = "Week,Day,Unit,Topic,Description,Activities\n";
    schedule.forEach(item => {
      csv += `${item.week},"${item.day}","${item.unit}","${item.topic}","${item.description.replace(/"/g, '""')}","${item.activities}"\n`;
    });
    
    // Create and download the file
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
              className="py-2 px-4 bg-green-100 hover:bg-green-200 text-green-800 font-medium rounded-lg transition-colors"
            >
              Download Schedule
            </button>
          </div>
        )}
      </motion.div>
      
      {/* Schedule Display */}
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