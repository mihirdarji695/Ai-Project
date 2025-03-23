// API service to communicate with the Flask backend

const API_URL = 'http://localhost:5000/api';

// Syllabus upload
export const uploadSyllabus = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_URL}/upload-syllabus`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error uploading syllabus');
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading syllabus:', error);
    throw error;
  }
};

// Generate all materials from syllabus
export const generateAllMaterials = async (syllabusId) => {
  try {
    if(!syllabusId){
      throw new Error("Syllabus id is required")
    }
    const response = await fetch(`${API_URL}/generate-all-materials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ syllabus_id: syllabusId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error generating materials');
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating materials:', error);
    throw error;
  }
};

// Generate questions
export const generateQuestions = async (payload) => {
  try {
    // Ensure payload has all required fields
    const requestData = {
      topics: payload.topics || [],
      taxonomies: payload.taxonomies || ['Remember'],
      difficulty: payload.difficulty || 'Easy'
    };

    // Add syllabus_id if present
    if (payload.syllabus_id) {
      requestData.syllabus_id = payload.syllabus_id;
    }

    console.log('Sending request:', requestData);

    const response = await fetch(`${API_URL}/generate-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error generating questions');
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating questions:', error);
    throw error;
  }
};

// Generate lesson plan
export const generateLessonPlan = async (payload) => {
  try {
    const response = await fetch(`${API_URL}/generate-lesson-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error generating lesson plan');
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating lesson plan:', error);
    throw error;
  }
};

// Generate CO-PO mapping
export const generateCoPoMapping = async (payload) => {
  try {
    const response = await fetch(`${API_URL}/generate-copo-mapping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error generating CO-PO mapping');
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating CO-PO mapping:', error);
    throw error;
  }
};

// Generate course schedule
export const generateSchedule = async (payload) => {
  try {
    const response = await fetch(`${API_URL}/generate-schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error generating schedule');
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating schedule:', error);
    throw error;
  }
};

// Upload course material
export const uploadCourseMaterial = async (file, category, syllabusId) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  if (syllabusId) {
    formData.append('syllabus_id', syllabusId);
  }

  try {
    const response = await fetch(`${API_URL}/upload-course-material`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error uploading course material');
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading course material:', error);
    throw error;
  }
}; 