import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, FileCheck, Table, Upload, FileText } from "lucide-react";
import { uploadSyllabus, generateCoPoMapping } from "../services/api";
import { toast } from "react-hot-toast";

const CoPo = () => {
  // State for form inputs
  const [courseObjective, setCourseObjective] = useState("");
  const [selectedPO, setSelectedPO] = useState("");
  const [taxonomyLevel, setTaxonomyLevel] = useState("");
  
  // State for syllabus
  const [syllabus, setSyllabus] = useState(null);
  const [syllabusData, setSyllabusData] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  
  // State for CO-PO mapping
  const [courseOutcomes, setCourseOutcomes] = useState({});
  const [programOutcomes, setProgramOutcomes] = useState({});
  const [mapping, setMapping] = useState({});
  const [mappingLoading, setMappingLoading] = useState(false);
  
  // Handle syllabus upload
  const handleSyllabusUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setUploadLoading(true);
    setSyllabus(file); // Store the file object for UI display
    
    try {
      const data = await uploadSyllabus(file);
      setSyllabusData(data);
      setCourseOutcomes(data.course_outcomes || {});
      setProgramOutcomes(data.program_outcomes || {});
      toast.success(`Syllabus processed successfully`);
    } catch (error) {
      console.error("Error uploading syllabus:", error);
      toast.error("Failed to process syllabus");
      setSyllabus(null);
    } finally {
      setUploadLoading(false);
    }
  };
  
  // Generate CO-PO mapping
  const handleGenerateMapping = async () => {
    if (!syllabusData) {
      toast.error("Please upload a syllabus first");
      return;
    }
    
    setMappingLoading(true);
    
    try {
      const payload = {
        syllabus_id: syllabusData.syllabus_id
      };
      
      const response = await generateCoPoMapping(payload);
      setMapping(response.mapping || {});
      // In case the response includes updated COs and POs
      if (response.course_outcomes) setCourseOutcomes(response.course_outcomes);
      if (response.program_outcomes) setProgramOutcomes(response.program_outcomes);
      
      toast.success("CO-PO mapping generated successfully");
    } catch (error) {
      console.error("Error generating CO-PO mapping:", error);
      toast.error("Failed to generate CO-PO mapping");
    } finally {
      setMappingLoading(false);
    }
  };
  
  // Handle adding a new course objective manually
  const handleAddObjective = () => {
    if (!courseObjective.trim()) {
      toast.error("Please enter a course objective");
      return;
    }
    
    const coId = `CO${Object.keys(courseOutcomes).length + 1}`;
    setCourseOutcomes(prev => ({
      ...prev,
      [coId]: courseObjective
    }));
    
    setCourseObjective("");
    toast.success("Course objective added");
  };
  
  // Download the report as PDF
  const handleDownloadReport = async () => {
    if (!mapping || Object.keys(mapping).length === 0) {
      toast.error("Please generate CO-PO mapping first");
      return;
    }
    
    toast.info("Preparing PDF download...");
    // In a real implementation, you would call the backend PDF generation API
    toast.success("PDF download would start automatically");
  };

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

  // Determine mapping cell color based on strength
  const getMappingColor = (strength) => {
    switch(strength) {
      case 3: return "bg-teal-600 text-white";
      case 2: return "bg-teal-400 text-white";
      case 1: return "bg-teal-200 text-teal-800";
      default: return "bg-gray-100";
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-teal-50 via-blue-50 to-cyan-50">
      <motion.h2 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-600"
      >
        Course Objectives & CO-PO Mapping
      </motion.h2>

      {/* Syllabus Upload Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        className="bg-white p-6 rounded-2xl shadow-lg mb-6 border border-teal-100"
      >
        <h3 className="text-xl font-semibold mb-4 text-teal-800 flex items-center">
          <Upload className="w-5 h-5 mr-2 text-teal-600" />
          Upload Syllabus
        </h3>
        <div className="border-2 border-dashed border-teal-200 p-4 rounded-xl text-center">
          <input 
            type="file" 
            id="syllabus-upload-copo" 
            className="hidden" 
            accept=".txt,.pdf,.docx" 
            onChange={handleSyllabusUpload}
            disabled={uploadLoading}
          />
          <label htmlFor="syllabus-upload-copo" className={`cursor-pointer ${uploadLoading ? 'opacity-70' : ''}`}>
            <div className="text-teal-600 font-medium hover:text-teal-800 transition-colors">
              {uploadLoading ? "Processing..." : (syllabus ? `Uploaded: ${syllabus.name}` : "Click to upload syllabus")}
            </div>
            <div className="text-gray-500 text-sm mt-1">
              Supported formats: TXT, PDF, DOCX
            </div>
          </label>
        </div>
        
        {syllabusData && (
          <div className="mt-4 flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerateMapping}
              disabled={mappingLoading}
              className={`bg-gradient-to-r from-blue-500 to-teal-500 text-white px-4 py-2 rounded-xl font-medium shadow-md hover:shadow-lg transition-all ${
                mappingLoading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {mappingLoading ? "Generating..." : "Generate CO-PO Mapping"}
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* Course Objective Form */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white p-6 rounded-2xl shadow-lg mb-8 border border-teal-100"
      >
        <h3 className="text-xl font-semibold mb-4 text-teal-800 flex items-center">
          <FileCheck className="w-5 h-5 mr-2 text-teal-600" />
          Define Course Objective
        </h3>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Objective</label>
            <input
              type="text"
              placeholder="Enter Course Objective"
              value={courseObjective}
              className="border border-teal-200 p-3 rounded-xl w-full focus:ring-2 focus:ring-teal-400 focus:outline-none transition-all"
              onChange={(e) => setCourseObjective(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Program Objective</label>
              <select 
                className="border border-teal-200 p-3 rounded-xl w-full focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white" 
                onChange={(e) => setSelectedPO(e.target.value)}
                value={selectedPO}
              >
                <option value="">Select Program Objective</option>
                {Object.entries(programOutcomes).map(([poId, poText]) => (
                  <option key={poId} value={poId}>{poId}: {poText}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bloom's Taxonomy Level</label>
              <select 
                className="border border-teal-200 p-3 rounded-xl w-full focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white" 
                onChange={(e) => setTaxonomyLevel(e.target.value)}
                value={taxonomyLevel}
              >
                <option value="">Select Bloom's Taxonomy Level</option>
                <option value="Remember">Remember</option>
                <option value="Understand">Understand</option>
                <option value="Apply">Apply</option>
                <option value="Analyze">Analyze</option>
                <option value="Evaluate">Evaluate</option>
                <option value="Create">Create</option>
              </select>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
            onClick={handleAddObjective}
          >
            Add Objective
          </motion.button>
        </div>
        
        {/* Course Outcomes List */}
        {Object.keys(courseOutcomes).length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium text-gray-700 mb-2">Course Outcomes:</h4>
            <div className="max-h-48 overflow-y-auto bg-teal-50 p-3 rounded-lg">
              {Object.entries(courseOutcomes).map(([coId, coText]) => (
                <div key={coId} className="p-2 mb-1 bg-white rounded-lg shadow-sm">
                  <span className="font-medium text-teal-700">{coId}:</span> {coText}
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* CO-PO Mapping Table */}
      {Object.keys(mapping).length > 0 && (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="mb-8 bg-white p-6 rounded-2xl shadow-lg border border-teal-100 overflow-x-auto"
        >
          <h3 className="text-xl font-semibold mb-4 text-teal-800 flex items-center">
            <Table className="w-5 h-5 mr-2 text-teal-600" />
            CO-PO Mapping
          </h3>
          
          <div className="overflow-x-auto bg-gradient-to-r from-teal-50 to-blue-50 p-4 rounded-xl">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr>
                  <th className="bg-teal-100 text-teal-800 p-3 text-left rounded-tl-lg">CO</th>
                  {Object.keys(programOutcomes).map(poId => (
                    <th key={poId} className="bg-teal-100 text-teal-800 p-3 text-center">
                      {poId}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(mapping).map(([coId, poMapping], i) => (
                  <motion.tr 
                    key={coId}
                    variants={item}
                    className={i % 2 === 0 ? "bg-white" : "bg-teal-50"}
                  >
                    <td className="border border-teal-100 p-3 font-medium text-teal-700">
                      {coId}: {courseOutcomes[coId] ? courseOutcomes[coId].substring(0, 50) + (courseOutcomes[coId].length > 50 ? '...' : '') : ''}
                    </td>
                    {Object.keys(programOutcomes).map(poId => (
                      <td key={poId} className="border border-teal-100 p-3 text-center">
                        {poMapping[poId] ? (
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-medium ${getMappingColor(poMapping[poId])}`}>
                            {poMapping[poId]}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-sm">
            <div className="p-3 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800">
              <div className="font-medium mb-1">Mapping Strength</div>
              <div className="flex items-center space-x-2">
                <span className="inline-block w-3 h-3 bg-teal-600 rounded-full"></span>
                <span>Strong: 3</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-block w-3 h-3 bg-teal-400 rounded-full"></span>
                <span>Medium: 2</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-block w-3 h-3 bg-teal-200 rounded-full"></span>
                <span>Weak: 1</span>
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-gradient-to-r from-teal-50 to-teal-100 text-teal-800 md:col-span-2">
              <div className="font-medium mb-1">Attainment Levels</div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(programOutcomes).map(poId => {
                  // Calculate attainment percentage (simplified example)
                  const totalMappings = Object.values(mapping).reduce((sum, poMap) => sum + (poMap[poId] || 0), 0);
                  const maxPossible = Object.keys(mapping).length * 3; // Assuming max strength is 3
                  const percentage = maxPossible > 0 ? Math.round((totalMappings / maxPossible) * 100) : 0;
                  
                  return (
                    <span key={poId} className="inline-block px-2 py-0.5 bg-white rounded-full border border-teal-200">
                      {poId}: {percentage}%
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Report Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-wrap gap-4 justify-center"
      >
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all flex items-center"
          onClick={handleDownloadReport}
          disabled={Object.keys(mapping).length === 0}
        >
          <FileText className="w-4 h-4 mr-2" />
          Download Report
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-gradient-to-r from-teal-500 to-teal-700 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
          onClick={() => syllabusData ? handleGenerateMapping() : toast.error("Please upload a syllabus first")}
        >
          Analyze Alignment
        </motion.button>
      </motion.div>
    </div>
  );
};

export default CoPo;
