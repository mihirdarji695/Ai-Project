import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, FileUp, Download, FileEdit, Calendar, Book } from "lucide-react";
import { uploadSyllabus, generateLessonPlan } from "../services/api";
import { toast } from "react-hot-toast";

const LessonPlan = () => {
  const [status, setStatus] = useState("Waiting for upload...");
  const [fileObj, setFileObj] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syllabusData, setSyllabusData] = useState(null);
  const [lessonPlan, setLessonPlan] = useState([]);
  const [weeks, setWeeks] = useState(16);
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [unitWeightage, setUnitWeightage] = useState({});
  const [planLoading, setPlanLoading] = useState(false);

  const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;
    
    setLoading(true);
    setFileObj(uploadedFile);
    setFileName(uploadedFile.name);
    setStatus("Processing...");
    
    try {
      const data = await uploadSyllabus(uploadedFile);
      setSyllabusData(data);
      
      // Initialize unit weightage
      const initialWeightage = {};
      data.units.forEach(unit => {
        initialWeightage[unit] = 1; // Default equal weightage
      });
      setUnitWeightage(initialWeightage);
      
      setStatus("Syllabus processed");
      toast.success(`Syllabus processed: ${data.topics.length} topics extracted`);
    } catch (error) {
      console.error("Error uploading syllabus:", error);
      toast.error("Failed to process syllabus");
      setStatus("Upload failed");
      setFileObj(null);
      setFileName(null);
    } finally {
      setLoading(false);
    }
  };

  const removeFile = () => {
    setFileObj(null);
    setFileName(null);
    setStatus("Waiting for upload...");
    setSyllabusData(null);
    setLessonPlan([]);
  };
  
  const handleGeneratePlan = async () => {
    if (!syllabusData) {
      toast.error("Please upload a syllabus first");
      return;
    }
    
    setPlanLoading(true);
    
    try {
      const payload = {
        syllabus_id: syllabusData.syllabus_id,
        weeks,
        daysPerWeek,
        unitWeightage
      };
      
      const response = await generateLessonPlan(payload);
      
      setLessonPlan(response.lessonPlan || []);
      toast.success("Lesson plan generated successfully");
    } catch (error) {
      console.error("Error generating lesson plan:", error);
      toast.error("Failed to generate lesson plan");
    } finally {
      setPlanLoading(false);
    }
  };
  
  const handleWeightageChange = (unit, value) => {
    setUnitWeightage(prev => ({
      ...prev,
      [unit]: parseInt(value) || 1
    }));
  };
  
  const downloadAsPDF = () => {
    if (lessonPlan.length === 0) {
      toast.error("Please generate a lesson plan first");
      return;
    }
    
    toast.info("Preparing PDF download...");
    toast.success("PDF download would start automatically");
  };
  
  const weekGroups = {};
  if (lessonPlan.length > 0) {
    // Group lesson plan items by week
    lessonPlan.forEach(item => {
      const weekKey = `Week ${item.week}`;
      if (!weekGroups[weekKey]) {
        weekGroups[weekKey] = [];
      }
      weekGroups[weekKey].push(item);
    });
  }

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
    <div className="min-h-screen p-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50">
      <motion.h2 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600"
      >
        Lesson Plan Generator
      </motion.h2>

      {/* File Upload Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white p-6 rounded-2xl shadow-lg mb-8 border border-purple-100"
      >
        <h3 className="text-xl font-semibold mb-4 text-indigo-800 flex items-center">
          <FileUp className="w-5 h-5 mr-2 text-indigo-600" />
          Upload Syllabus
        </h3>
        <div className="border-2 border-dashed border-indigo-200 p-8 rounded-xl bg-indigo-50 flex flex-col items-center justify-center cursor-pointer">
          <input 
            type="file" 
            accept=".pdf,.txt,.docx" 
            className="hidden" 
            id="syllabus-upload-lesson" 
            onChange={handleFileUpload}
            disabled={loading}
          />
          <label htmlFor="syllabus-upload-lesson" className={`cursor-pointer text-center w-full ${loading ? 'opacity-70' : ''}`}>
            {fileName ? (
              <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-indigo-100">
                <p className="text-indigo-700 font-medium">{fileName}</p>
                <button 
                  onClick={removeFile}
                  disabled={loading}
                  className="text-red-500 hover:text-red-700 rounded-full p-1 hover:bg-red-50"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <FileUp className="w-12 h-12 text-indigo-400 mb-3" />
                <p className="text-indigo-700 font-medium">Drag & Drop or Click to Upload</p>
                <p className="text-indigo-500 text-sm mt-1">Supported formats: PDF, TXT, DOCX</p>
              </div>
            )}
          </label>
        </div>
        <div className={`mt-4 text-sm font-medium flex items-center justify-center ${
          status === "Syllabus processed" ? "text-green-600" : 
          status === "Processing..." ? "text-blue-600" : 
          status === "Upload failed" ? "text-red-600" : "text-indigo-600"
        }`}>
          <motion.div 
            animate={{ 
              scale: status === "Processing..." ? [1, 1.1, 1] : 1 
            }}
            transition={{ 
              repeat: status === "Processing..." ? Infinity : 0,
              duration: 1.5
            }}
          >
            {status}
          </motion.div>
        </div>
      </motion.div>

      {/* Planning Parameters */}
      {syllabusData && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-6 rounded-2xl shadow-lg mb-8 border border-purple-100"
        >
          <h3 className="text-xl font-semibold mb-4 text-indigo-800 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
            Planning Parameters
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Weeks
              </label>
              <input
                type="number"
                min="1"
                max="52"
                value={weeks}
                onChange={(e) => setWeeks(parseInt(e.target.value) || 16)}
                className="border border-indigo-200 p-3 rounded-xl w-full focus:ring-2 focus:ring-indigo-400 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Classes per Week
              </label>
              <input
                type="number"
                min="1"
                max="7"
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(parseInt(e.target.value) || 3)}
                className="border border-indigo-200 p-3 rounded-xl w-full focus:ring-2 focus:ring-indigo-400 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Unit Weightage */}
          <div className="mb-4">
            <h4 className="text-md font-medium text-gray-700 mb-2 flex items-center">
              <Book className="w-4 h-4 mr-1 text-indigo-600" />
              Unit Weightage
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {syllabusData.units.map((unit, index) => (
                <div key={index} className="flex items-center p-2 bg-indigo-50 rounded-lg">
                  <span className="text-sm font-medium text-indigo-700 flex-1">{unit}</span>
                  <select
                    value={unitWeightage[unit] || 1}
                    onChange={(e) => handleWeightageChange(unit, e.target.value)}
                    className="ml-2 border border-indigo-200 rounded-lg p-1 bg-white text-sm"
                  >
                    {[1, 2, 3, 4, 5].map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGeneratePlan}
            disabled={planLoading}
            className={`mt-4 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all ${
              planLoading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {planLoading ? "Generating..." : "Generate Lesson Plan"}
          </motion.button>
        </motion.div>
      )}

      {/* Auto-Generated Lesson Plan Display */}
      {lessonPlan.length > 0 && (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="mb-8 bg-white p-6 rounded-2xl shadow-lg border border-purple-100"
        >
          <h3 className="text-xl font-semibold mb-4 text-indigo-800 flex items-center">
            <FileEdit className="w-5 h-5 mr-2 text-indigo-600" />
            Generated Lesson Plan
          </h3>
          <div className="space-y-3">
            {Object.entries(weekGroups).map(([week, items], index) => (
              <motion.details 
                key={week}
                variants={item}
                className="border border-indigo-100 rounded-xl overflow-hidden group"
              >
                <summary className="font-medium p-4 cursor-pointer bg-gradient-to-r from-indigo-50 to-white hover:from-indigo-100 hover:to-indigo-50 flex justify-between items-center">
                  <span className="text-indigo-800">{week}</span>
                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                    {items.length} Classes
                  </span>
                </summary>
                <div className="p-4 bg-white border-t border-indigo-100 space-y-3">
                  {items.map((item, i) => (
                    <div key={i} className="p-3 bg-indigo-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                        <div className="md:col-span-2">
                          <h5 className="font-medium text-indigo-800">Day {item.day}: {item.unit}</h5>
                          <p className="text-indigo-700 mt-1">{item.topic}</p>
                        </div>
                        <div>
                          <h5 className="font-medium text-purple-800">Teaching Method</h5>
                          <p className="text-purple-700">{item.teachingMethod}</p>
                        </div>
                        <div>
                          <h5 className="font-medium text-blue-800">Activities</h5>
                          <p className="text-blue-700">{item.activities}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.details>
            ))}
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={downloadAsPDF}
            className="mt-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Download as PDF
          </motion.button>
        </motion.div>
      )}

      {/* Manual Edits */}
      {lessonPlan.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-2xl shadow-lg border border-purple-100"
        >
          <h3 className="text-xl font-semibold mb-4 text-indigo-800">Manual Adjustments</h3>
          <textarea 
            className="w-full border border-indigo-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none transition-all" 
            rows="4" 
            placeholder="Add any additional notes or adjustments to the lesson plan..."
          ></textarea>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all w-full"
          >
            Save & Export
          </motion.button>
        </motion.div>
      )}
    </div>
  );
};

export default LessonPlan;
