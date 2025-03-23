import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { uploadSyllabus, generateAllMaterials } from "../services/api";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [recentActivities, setRecentActivities] = useState([]);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [fileData, setFileData] = useState(true);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalFiles: 0,
    processedFiles: 0,
    pendingFiles: 0,
  });

  // Load recent activities from localStorage on component mount
  useEffect(() => {
    const savedActivities = localStorage.getItem("recentActivities");
    if (savedActivities) {
      setRecentActivities(JSON.parse(savedActivities));
    }
  }, []);

  const clearRecentActivities = () => {
    setRecentActivities([]);
    localStorage.removeItem("recentActivities");
    toast.success("Recent activities cleared");
  };
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadLoading(true);
    setProcessingStatus({
      status: "processing",
      message: "Processing file...",
    });

    try {
      // Add new activity
      const newActivity = {
        id: Date.now(),
        type: "file_upload",
        title: file.name,
        status: "processing",
        timestamp: new Date().toISOString(),
        details: "Processing syllabus file...",
      };

      setRecentActivities((prev) => {
        const updated = [newActivity, ...prev].slice(0, 10); // Keep only last 10 activities
        localStorage.setItem("recentActivities", JSON.stringify(updated));
        return updated;
      });

      // Process the file
      const data = await uploadSyllabus(file);
      setFileData(data);

      // Update activity status
      setRecentActivities((prev) => {
        const updated = prev.map((activity) =>
          activity.id === newActivity.id
            ? {
                ...activity,
                status: "completed",
                details: `Processed ${data.topics.length} topics`,
              }
            : activity
        );
        localStorage.setItem("recentActivities", JSON.stringify(updated));
        return updated;
      });

      // Update stats
      setStats((prev) => ({
        ...prev,
        totalFiles: prev.totalFiles + 1,
        processedFiles: prev.processedFiles + 1,
      }));

      setProcessingStatus({
        status: "completed",
        message: "File processed successfully",
      });
      toast.success("File processed successfully");

      // Store the processed syllabus data in localStorage for other pages to use
      localStorage.setItem("currentSyllabus", JSON.stringify(data));
    } catch (error) {
      console.error("Error processing file:", error);

      // Update activity status to failed
      setRecentActivities((prev) => {
        const updated = prev.map((activity) =>
          activity.id === newActivity.id
            ? {
                ...activity,
                status: "failed",
                details: "Failed to process file",
              }
            : activity
        );
        localStorage.setItem("recentActivities", JSON.stringify(updated));
        return updated;
      });

      setProcessingStatus({
        status: "failed",
        message: "Failed to process file",
      });
      toast.error("Failed to process file");
    } finally {
      setUploadLoading(false);
    }
  };

  const generateAllMaterial = async () => {
    if (!fileData) {
      toast.error("Please upload a syllabus file first");
      return;
    }
    if (generatingAll) {
      toast.error("Materials are already being generated");
      return;
    }
    setGeneratingAll(true);
    console.log("render");

    try {
      // Add new activity for generating all materials
      const newActivity = {
        id: Date.now(),
        type: "generate_all",
        title: "Generating All Materials",
        status: "processing",
        timestamp: new Date().toISOString(),
        details:
          "Generating Question Bank, Lesson Plan, CO-PO Mapping, and Schedule",
      };

      setRecentActivities((prev) => {
        const updated = [newActivity, ...prev].slice(0, 10);
        localStorage.setItem("recentActivities", JSON.stringify(updated));
        return updated;
      });
      console.log(fileData.syllabus_id);
      // Call the API to generate all materials
      const response = await generateAllMaterials(fileData.syllabus_id);

      // Store the flag that materials have been generated
      localStorage.setItem("materialsGenerated", "true");

      // Update activity status
      setRecentActivities((prev) => {
        const updated = prev.map((activity) =>
          activity.id === newActivity.id
            ? {
                ...activity,
                status: "completed",
                details: `Generated ${response.materials.questions} questions, 1 lesson plan, 1 CO-PO mapping, and ${response.materials.schedule} schedule items`,
              }
            : activity
        );
        localStorage.setItem("recentActivities", JSON.stringify(updated));
        return updated;
      });

      toast.success("All materials generated successfully");
    } catch (error) {
      console.error("Error generating all materials:", error);

      setRecentActivities((prev) => {
        const updated = prev.map((activity) =>
          activity.id === newActivity.id
            ? {
                ...activity,
                status: "failed",
                details: "Failed to generate materials",
              }
            : activity
        );
        localStorage.setItem("recentActivities", JSON.stringify(updated));
        return updated;
      });

      toast.error(
        "Failed to generate materials: " + (error.message || "Unknown error")
      );
    } finally {
      setGeneratingAll(false);
    }
  };

  const navigateToMaterial = (path) => {
    navigate(path);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600"
      >
        Dashboard
      </motion.h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-6 rounded-2xl shadow-lg border border-purple-100"
        >
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Total Files
          </h3>
          <p className="text-3xl font-bold text-indigo-600">
            {stats.totalFiles}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl shadow-lg border border-purple-100"
        >
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Processed Files
          </h3>
          <p className="text-3xl font-bold text-green-600">
            {stats.processedFiles}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl shadow-lg border border-purple-100"
        >
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Pending Files
          </h3>
          <p className="text-3xl font-bold text-yellow-600">
            {stats.pendingFiles}
          </p>
        </motion.div>
      </div>

      {/* File Upload Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-white p-6 rounded-2xl shadow-lg mb-8 border border-purple-100"
      >
        <h3 className="text-xl font-semibold mb-4 text-indigo-800">
          Upload Syllabus
        </h3>
        { 
            processingStatus?.status === "completed" && <div>
              <p  className="text-3xl">
              File was uploaded successfully</p>
              <p className="text-xl text-zinc-500">
          upload another one?
          </p>
            </div>
            
        }
          <div className="border-2 border-dashed border-indigo-200 p-4 rounded-xl text-center mb-4">
           
            <input
              type="file"
              id="syllabus-upload"
              className="hidden"
              accept=".txt,.pdf,.docx"
              onChange={handleFileUpload}
              disabled={uploadLoading}
            />
            <label
              htmlFor="syllabus-upload"
              className={`cursor-pointer ${uploadLoading ? "opacity-70" : ""}`}
            >
              <div className="text-indigo-600 font-medium hover:text-indigo-800 transition-colors">
                {uploadLoading ? "Processing..." : "Click to upload syllabus"}
              </div>
              <div className="text-gray-500 text-sm mt-1">
                Supported formats: TXT, PDF, DOCX
              </div>
            </label>
            </div>
        

        <div className="mt-4">
          <button
            onClick={generateAllMaterial}
            disabled={generatingAll}
            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {generatingAll ? "Generating..." : "Generate All Materials"}
          </button>

          <div className="text-sm text-gray-500 text-center mt-2">
            This will create all educational materials from your syllabus:
            Question Bank, Lesson Plan, CO-PO Mapping, and Day-wise Schedule
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <button
              onClick={() => navigateToMaterial("/question-bank")}
              className="py-2 px-4 bg-purple-100 hover:bg-purple-200 text-purple-800 font-medium rounded-lg transition-colors"
            >
              View Question Bank
            </button>
            <button
              onClick={() => navigateToMaterial("/lesson-plan")}
              className="py-2 px-4 bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium rounded-lg transition-colors"
            >
              View Lesson Plan
            </button>
            <button
              onClick={() => navigateToMaterial("/copo")}
              className="py-2 px-4 bg-green-100 hover:bg-green-200 text-green-800 font-medium rounded-lg transition-colors"
            >
              View CO-PO Mapping
            </button>
            <button
              onClick={() => navigateToMaterial("/schedule")}
              className="py-2 px-4 bg-pink-100 hover:bg-pink-200 text-pink-800 font-medium rounded-lg transition-colors"
            >
              View Schedule
            </button>
          </div>
        </div>
      </motion.div>

      {/* Recent Activities */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-white p-6 rounded-2xl shadow-lg border border-purple-100"
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h3 className="text-xl font-semibold mb-4 text-indigo-800">
            Recent Activities
          </h3>
          <h3 className="text-xl font-semibold mb-4 text-indigo-800">
            <button
              onClick={clearRecentActivities}
              className="text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              clear all
            </button>
          </h3>
        </div>
        <div className="space-y-4">
          {recentActivities.map((activity) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:shadow-md transition-all"
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`w-2 h-2 rounded-full ${getStatusColor(
                    activity.status
                  )}`}
                />
                <div>
                  <h4 className="font-medium text-gray-900">
                    {activity.title}
                  </h4>
                  <p className="text-sm text-gray-500">{activity.details}</p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {formatTimestamp(activity.timestamp)}
              </div>
            </motion.div>
          ))}
          {recentActivities.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No recent activities
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
