# AI Education Toolkit

A full-stack application for education professionals to generate question banks, lesson plans, CO-PO mappings, and manage course materials with a beautiful and interactive UI.

## Features

- **Question Bank Generator:** Create tailored questions based on topic, difficulty, and Bloom's taxonomy level
- **Lesson Plan Generator:** Build comprehensive lesson plans from syllabus content
- **CO-PO Mapping:** Map course outcomes to program outcomes visually
- **Course Materials:** Upload and manage teaching resources
- **Reports & Analytics:** Generate insightful reports about your course

## Tech Stack

- **Frontend:** React with TailwindCSS
- **Backend:** Flask API
- **Animation:** Framer Motion
- **Styling:** TailwindCSS with gradient effects

## Getting Started

### Prerequisites

- Node.js (v14+)
- Python (v3.8+)

### Installation

1. Clone the repository
   ```
   git clone <repository-url>
   cd ai-education-toolkit
   ```

2. Set up the backend
   ```
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Set up the frontend
   ```
   cd frontend
   npm install
   ```

### Running the Application

1. Start the backend server (from the backend directory)
   ```
   python app.py
   ```

2. Start the frontend development server (from the frontend directory)
   ```
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

## Usage

### Question Bank
1. Enter a topic or upload a syllabus
2. Select difficulty and cognitive level
3. Generate questions and download as CSV or PDF

### Lesson Plan
1. Upload a syllabus file
2. Configure course duration and days per week
3. Generate a structured lesson plan

### CO-PO Mapping
1. Define course objectives
2. Select program objectives
3. Generate and visualize the mapping

## Screenshots

![Dashboard](docs/screenshots/dashboard.png)
![Question Bank](docs/screenshots/question-bank.png)
![Lesson Plan](docs/screenshots/lesson-plan.png)

## License

This project is licensed under the MIT License - see the LICENSE file for details. 