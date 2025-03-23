import React, { useState } from "react";
import { motion } from "framer-motion";
import { FileUp, FileText, Folder, Paperclip, Book, Globe, X } from "lucide-react";

const CourseMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState("Lecture Slides");

  const handleUpload = () => {
    if (!file) return;
    setMaterials([...materials, { name: file.name, category }]);
    setFile(null);
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

  const categoryIcons = {
    "Lecture Slides": <FileText className="w-4 h-4" />,
    "Textbooks": <Book className="w-4 h-4" />,
    "Online Resources": <Globe className="w-4 h-4" />,
  };

  const categoryColors = {
    "Lecture Slides": "bg-blue-100 text-blue-800",
    "Textbooks": "bg-purple-100 text-purple-800",
    "Online Resources": "bg-emerald-100 text-emerald-800",
  };

  return (
    <div>
      <motion.h2 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600"
      >
        Course Materials
      </motion.h2>

      {/* File Upload Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white p-6 rounded-2xl shadow-lg mb-8 border border-blue-100"
      >
        <h3 className="text-xl font-semibold mb-4 text-blue-800 flex items-center">
          <FileUp className="w-5 h-5 mr-2 text-blue-600" />
          Upload Materials
        </h3>
        
        <div className="border-2 border-dashed border-blue-200 p-8 rounded-xl bg-blue-50 flex flex-col items-center justify-center text-center">
          <input
            type="file"
            className="hidden"
            id="material-upload"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <label htmlFor="material-upload" className="cursor-pointer w-full">
            {file ? (
              <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-blue-100">
                <span className="text-blue-700 font-medium truncate max-w-[250px]">{file.name}</span>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    setFile(null);
                  }} 
                  className="text-red-500 hover:text-red-700 rounded-full p-1 hover:bg-red-50"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Paperclip className="w-12 h-12 text-blue-400 mb-3" />
                <p className="text-blue-700 font-medium">Drag & Drop or Click to Upload</p>
                <p className="text-blue-500 text-sm mt-1">PDF, DOCX, PPTX, and more</p>
              </div>
            )}
          </label>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Material Category</label>
          <select
            className="border border-blue-200 p-3 rounded-xl w-full focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all bg-white"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>Lecture Slides</option>
            <option>Textbooks</option>
            <option>Online Resources</option>
          </select>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleUpload}
          className="mt-4 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center"
          disabled={!file}
        >
          <FileUp className="w-4 h-4 mr-2" />
          Upload Material
        </motion.button>
      </motion.div>

      {/* Material Display */}
      {materials.length > 0 && (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100"
        >
          <h3 className="text-xl font-semibold mb-4 text-blue-800 flex items-center">
            <Folder className="w-5 h-5 mr-2 text-blue-600" />
            Uploaded Materials
          </h3>
          
          <div className="grid gap-3">
            {materials.map((mat, i) => (
              <motion.div 
                key={i} 
                variants={item}
                className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 hover:shadow-md transition-all"
              >
                <div className="flex items-center">
                  {categoryIcons[mat.category]}
                  <span className="ml-3 font-medium text-blue-800">{mat.name}</span>
                </div>
                <span className={`text-xs px-3 py-1.5 rounded-full flex items-center ${categoryColors[mat.category]}`}>
                  {categoryIcons[mat.category]}
                  <span className="ml-1">{mat.category}</span>
                </span>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg">
              <div className="font-medium text-blue-800 mb-1">Total Materials</div>
              <div className="text-2xl font-bold text-blue-700">{materials.length}</div>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-3 rounded-lg">
              <div className="font-medium text-purple-800 mb-1">Categories</div>
              <div className="text-2xl font-bold text-purple-700">
                {new Set(materials.map(m => m.category)).size}
              </div>
            </div>
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-3 rounded-lg">
              <div className="font-medium text-emerald-800 mb-1">Last Update</div>
              <div className="text-sm font-medium text-emerald-700">
                Just now
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex flex-wrap gap-4">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-indigo-500 to-indigo-700 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all flex-1"
            >
              Share Materials
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all flex-1"
            >
              Download All
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CourseMaterials;
