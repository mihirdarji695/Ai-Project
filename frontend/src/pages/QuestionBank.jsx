import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { generateQuestions, uploadSyllabus } from "../services/api";
import { toast } from "react-hot-toast";

const QuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [cognitiveLevel, setCognitiveLevel] = useState("Remember");
  const [loading, setLoading] = useState(false);
  const [syllabus, setSyllabus] = useState(null);
  const [syllabusData, setSyllabusData] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [useSyllabusTopics, setUseSyllabusTopics] = useState(false);

  useEffect(() => {
    // Check if syllabus data exists in localStorage
    const savedSyllabus = localStorage.getItem('currentSyllabus');
    if (savedSyllabus) {
      const parsedSyllabus = JSON.parse(savedSyllabus);
      setSyllabusData(parsedSyllabus);
      setSyllabus({name: parsedSyllabus.filename || "Uploaded Syllabus"});
      setUseSyllabusTopics(true);
    }
    
    // Check if materials have been generated already
    if (localStorage.getItem('materialsGenerated') === 'true') {
      // If materials were already generated, we could auto-load questions here
      // For now, just show a toast notification
      toast.success("All materials have been generated. You can customize and generate more questions.");
    }
  }, []);

  const handleGenerateQuestions = async () => {
    if (!useSyllabusTopics && !topic.trim()) {
      toast.error("Please enter a topic or use syllabus topics");
      return;
    }

    setLoading(true);
    
    try {
      // Create payload with required fields
      let payload = {
        topics: [],
        taxonomies: [cognitiveLevel], 
        difficulty
      };
      
      if (useSyllabusTopics && syllabusData) {
        // Use uploaded syllabus topics
        payload.syllabus_id = syllabusData.syllabus_id;
        
        if (selectedTopics.length > 0) {
          // Filter topics based on selected ones
          payload.topics = selectedTopics.map(topicTitle => {
            const fullTopic = syllabusData.topics.find(t => t.title === topicTitle);
            return fullTopic || { title: topicTitle, content: topicTitle };
          });
        }
      } else {
        // Use manual topic entry
        payload.topics = [{
          title: "Custom Topic",
          content: topic
        }];
      }
      
      console.log("Sending to API:", payload);
      const response = await generateQuestions(payload);
      
      setQuestions(response.questions);
      toast.success(`Generated ${response.questions.length} questions`);
    } catch (error) {
      console.error("Error generating questions:", error);
      toast.error("Failed to generate questions: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSyllabusUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setUploadLoading(true);
    setSyllabus(file); // Store the file object for UI display
    
    try {
      const data = await uploadSyllabus(file);
      setSyllabusData(data);
      setUseSyllabusTopics(true);
      toast.success(`Syllabus processed: ${data.topics.length} topics extracted`);
    } catch (error) {
      console.error("Error uploading syllabus:", error);
      toast.error("Failed to process syllabus");
      setSyllabus(null);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleTopicToggle = (topicTitle) => {
    setSelectedTopics(prev => {
      if (prev.includes(topicTitle)) {
        return prev.filter(t => t !== topicTitle);
      } else {
        return [...prev, topicTitle];
      }
    });
  };

  const handleSelectAllTopics = () => {
    if (syllabusData && syllabusData.topics) {
      setSelectedTopics(syllabusData.topics.map(t => t.title));
    }
  };

  const handleClearTopics = () => {
    setSelectedTopics([]);
  };

  const difficultyColors = {
    Easy: "bg-green-100 text-green-800",
    Medium: "bg-yellow-100 text-yellow-800",
    Hard: "bg-red-100 text-red-800",
  };

  const cognitiveColors = {
    Remember: "bg-purple-100 text-purple-800",
    Understand: "bg-blue-100 text-blue-800",
    Apply: "bg-indigo-100 text-indigo-800",
    Analyze: "bg-pink-100 text-pink-800",
    Evaluate: "bg-orange-100 text-orange-800",
    Create: "bg-teal-100 text-teal-800",
  };

  const downloadAsCSV = () => {
    if (!questions.length) return;
    
    // Create CSV content
    const headers = ["Topic", "Taxonomy", "Difficulty", "Question"];
    const csvContent = [
      headers.join(","),
      ...questions.map(q => 
        [
          `"${q.topic.replace(/"/g, '""')}"`, 
          `"${q.taxonomy}"`, 
          `"${q.difficulty}"`, 
          `"${q.question.replace(/"/g, '""')}"`
        ].join(",")
      )
    ].join("\n");
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "question_bank.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAsPDF = async () => {
    if (!questions.length) return;
    
    try {
      toast.info("Preparing PDF download...");
      
      // Call the API to generate the PDF
      const response = await fetch(`http://localhost:5000/api/download-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType: 'questions',
          questions: questions,
          filename: 'question_bank.pdf'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const data = await response.json();
      
      // Show success message
      toast.success("PDF download prepared");
      
      // In a production app, we would handle the actual file download here
      // For now, we'll just show a message
      toast.info("In a real implementation, PDF would download automatically");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF: " + (error.message || "Unknown error"));
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <motion.h2 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600"
      >
        Question Bank
      </motion.h2>

      {/* Syllabus Upload Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        className="bg-white p-6 rounded-2xl shadow-lg mb-6 border border-purple-100"
      >
        <h3 className="text-xl font-semibold mb-4 text-indigo-800">Upload Syllabus</h3>
        <div className="border-2 border-dashed border-indigo-200 p-4 rounded-xl text-center">
          <input 
            type="file" 
            id="syllabus-upload" 
            className="hidden" 
            accept=".txt,.pdf,.docx" 
            onChange={handleSyllabusUpload}
            disabled={uploadLoading}
          />
          <label htmlFor="syllabus-upload" className={`cursor-pointer ${uploadLoading ? 'opacity-70' : ''}`}>
            <div className="text-indigo-600 font-medium hover:text-indigo-800 transition-colors">
              {uploadLoading ? "Processing..." : (syllabus ? `Uploaded: ${syllabus.name}` : "Click to upload syllabus")}
            </div>
            <div className="text-gray-500 text-sm mt-1">
              Supported formats: TXT, PDF, DOCX
            </div>
          </label>
        </div>
        
        {/* Extracted Topics from Syllabus */}
        {syllabusData && syllabusData.topics && syllabusData.topics.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-md font-medium text-gray-700">Topics from Syllabus</h4>
              <div className="flex gap-2">
                <button 
                  onClick={handleSelectAllTopics}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  Select All
                </button>
                <button 
                  onClick={handleClearTopics}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto border border-indigo-100 rounded-xl p-2">
              {syllabusData.topics.map((topic, index) => (
                <div 
                  key={index} 
                  className={`p-2 rounded-lg mb-1 flex items-center gap-2 ${
                    selectedTopics.includes(topic.title) ? 'bg-indigo-50' : 'hover:bg-gray-50'
                  } cursor-pointer transition-colors`}
                  onClick={() => handleTopicToggle(topic.title)}
                >
                  <input 
                    type="checkbox" 
                    checked={selectedTopics.includes(topic.title)}
                    onChange={() => {}}
                    className="h-4 w-4 text-indigo-600 rounded"
                  />
                  <span className="text-sm">{topic.title}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center mt-3">
              <input 
                type="checkbox" 
                id="use-syllabus" 
                checked={useSyllabusTopics}
                onChange={(e) => setUseSyllabusTopics(e.target.checked)}
                className="h-4 w-4 text-indigo-600 rounded mr-2"
              />
              <label htmlFor="use-syllabus" className="text-sm text-gray-700">
                Use syllabus topics for question generation
              </label>
            </div>
          </div>
        )}
      </motion.div>

      {/* Question Input Form */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white p-6 rounded-2xl shadow-lg mb-8 border border-purple-100"
      >
        <h3 className="text-xl font-semibold mb-4 text-indigo-800">Generate Questions</h3>
        {!useSyllabusTopics && (
          <input
            type="text"
            placeholder="Enter Topic"
            className="border border-indigo-200 p-3 rounded-xl w-full mb-4 focus:ring-2 focus:ring-indigo-400 focus:outline-none transition-all"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        )}
        <div className="flex gap-4 mb-4">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
            <select 
              className="border border-indigo-200 p-3 rounded-xl w-full focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              value={difficulty} 
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cognitive Level</label>
            <select 
              className="border border-indigo-200 p-3 rounded-xl w-full focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              value={cognitiveLevel} 
              onChange={(e) => setCognitiveLevel(e.target.value)}
            >
              <option>Remember</option>
              <option>Understand</option>
              <option>Apply</option>
              <option>Analyze</option>
              <option>Evaluate</option>
              <option>Create</option>
            </select>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGenerateQuestions}
          disabled={loading}
          className={`mt-2 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all ${
            loading ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Generating..." : "Generate Questions"}
        </motion.button>
      </motion.div>

      {/* Display Questions */}
      {questions.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl shadow-lg border border-purple-100"
        >
          <h3 className="text-xl font-semibold mb-4 text-indigo-800">Generated Questions</h3>
          <ul className="space-y-3 mb-6">
            {questions.map((q, i) => (
              <motion.li 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={i} 
                className="bg-indigo-50 p-4 rounded-xl hover:shadow-md transition-all"
              >
                <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                  <span className="font-medium text-indigo-900">{q.topic}</span>
                  <div className="flex gap-2">
                    <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${difficultyColors[q.difficulty]}`}>
                      {q.difficulty}
                    </span>
                    <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${cognitiveColors[q.taxonomy]}`}>
                      {q.taxonomy}
                    </span>
                  </div>
                </div>
                <p className="text-gray-700">{q.question}</p>
              </motion.li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-4">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={downloadAsCSV}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all flex-1"
            >
              Download as CSV
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={downloadAsPDF}
              className="bg-gradient-to-r from-orange-500 to-amber-600 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all flex-1"
            >
              Download as PDF
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default QuestionBank;
