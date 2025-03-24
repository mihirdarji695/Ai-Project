from flask import Flask, request, jsonify, send_file, make_response
from flask_cors import CORS
import pandas as pd
import re
import random
import json
import os
import io
import csv
import datetime
from werkzeug.utils import secure_filename
import PyPDF2
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import textwrap
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import google.generativeai as genai

# Initialize Flask app first
app = Flask(__name__)
CORS(app)  # Enable CORS after app initialization 

# Directory setup
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
UPLOAD_DIR = os.path.join(DATA_DIR, 'uploads')
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Initialize data storage
syllabi = {}
course_materials = []
questions = []
lesson_plans = []
copo_mappings = []

# Gemini AI Configuration
GEMINI_API_KEY = "AIzaSyCv33tpLm3fpLCw1NC69x-X6AAhGoDfEy8"
  # Replace with your Gemini API key
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-pro')

# Helper function for Gemini AI generation
def generate_with_gemini(prompt):
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error generating with Gemini: {e}")
        return None

# Helper functions for extracting text from syllabus
def extract_text_from_pdf(file_path):
    text = ""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page_num in range(len(pdf_reader.pages)):
                text += pdf_reader.pages[page_num].extract_text() + "\n"
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return ""

def extract_topics(text):
    # Simple extraction of topics from text
    topics = []
    # Look for patterns like "Unit I: Introduction" or just sections with numbers/roman numerals
    topic_pattern = re.compile(r"(Unit\s+[IVXLCDM0-9]+|Section\s+[0-9]+|Chapter\s+[0-9]+)[:\s]*(.*?)(?=(Unit\s+[IVXLCDM0-9]+|Section\s+[0-9]+|Chapter\s+[0-9]+|$))", re.DOTALL | re.IGNORECASE)
    matches = topic_pattern.findall(text)
    
    for match in matches:
        title = match[0].strip()
        content = match[1].strip()
        if content:  # Only add if there's actual content
            topics.append((title, content))
    
    # If no topics were found with the pattern, create simple topics based on paragraphs
    if not topics:
        paragraphs = re.split(r'\n\s*\n', text)
        for i, para in enumerate(paragraphs[:5]):  # Limit to first 5 paragraphs
            if len(para.strip()) > 30:  # Only use substantial paragraphs
                topics.append((f"Topic {i+1}", para.strip()))
    
    return topics

def extract_units(text):
    # Extract unit names from text
    unit_pattern = re.findall(r"(Unit\s+[IVXLCDM0-9]+|Section\s+[0-9]+|Chapter\s+[0-9]+)", text, re.IGNORECASE)
    if not unit_pattern:
        # If no units found, create dummy units
        return [f"Unit {i+1}" for i in range(5)]
    return list(dict.fromkeys(unit_pattern))  # Remove duplicates while preserving order

def extract_course_outcomes(text):
    """Extract course outcomes from syllabus text"""
    co_pattern = re.compile(r"(CO\s*\d+|Course\s*Outcome\s*\d+)[:\.\s]*(.*?)(?=(CO\s*\d+|Course\s*Outcome\s*\d+|$))", re.DOTALL | re.IGNORECASE)
    matches = co_pattern.findall(text)
    
    course_outcomes = {}
    for match in matches:
        co_id = match[0].strip()
        co_text = match[1].strip()
        if co_text:  # Only add if there's actual content
            course_outcomes[co_id] = co_text
    
    # If no COs found, generate some
    if not course_outcomes:
        course_outcomes = {
            f"CO{i+1}": f"Students will be able to demonstrate knowledge of {topic}" 
            for i, topic in enumerate([
                "core concepts and principles",
                "problem-solving techniques in the subject",
                "practical applications in real-world scenarios",
                "analysis and evaluation methods",
                "creative solutions to complex problems"
            ])
        }
    
    return course_outcomes

def extract_program_outcomes(text):
    """Extract program outcomes from syllabus text"""
    po_pattern = re.compile(r"(PO\s*\d+|Program\s*Outcome\s*\d+)[:\.\s]*(.*?)(?=(PO\s*\d+|Program\s*Outcome\s*\d+|$))", re.DOTALL | re.IGNORECASE)
    matches = po_pattern.findall(text)
    
    program_outcomes = {}
    for match in matches:
        po_id = match[0].strip()
        po_text = match[1].strip()
        if po_text:  # Only add if there's actual content
            program_outcomes[po_id] = po_text
    
    # If no POs found, generate some
    if not program_outcomes:
        program_outcomes = {
            f"PO{i+1}": outcome for i, outcome in enumerate([
                "Engineering knowledge",
                "Problem analysis",
                "Design/development of solutions",
                "Conduct investigations of complex problems",
                "Modern tool usage",
                "The engineer and society",
                "Environment and sustainability",
                "Ethics",
                "Individual and team work",
                "Communication",
                "Project management and finance",
                "Life-long learning"
            ])
        }
    
    return program_outcomes

# Routes
@app.route('/')
def index():
    return jsonify({"message": "AI Education Toolkit API is running"})

@app.route('/api/upload-syllabus', methods=['POST'])
def upload_syllabus():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file:
        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_DIR, filename)
        file.save(file_path)
        
        # Extract text based on file type
        if filename.lower().endswith('.pdf'):
            file_content = extract_text_from_pdf(file_path)
        else:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                file_content = f.read()
        
        syllabus_id = str(len(syllabi) + 1)
        topics = extract_topics(file_content)
        units = extract_units(file_content)
        course_outcomes = extract_course_outcomes(file_content)
        program_outcomes = extract_program_outcomes(file_content)
        
        syllabi[syllabus_id] = {
            "filename": filename,
            "content": file_content,
            "topics": topics,
            "units": units,
            "course_outcomes": course_outcomes,
            "program_outcomes": program_outcomes,
            "uploaded_at": datetime.datetime.now().isoformat()
        }
        
        return jsonify({
            "message": f"Syllabus processed successfully",
            "syllabus_id": syllabus_id,
            "topics": [{"title": title, "content": content} for title, content in topics],
            "units": units,
            "course_outcomes": course_outcomes,
            "program_outcomes": program_outcomes,
            "filename": filename
        })

@app.route('/api/generate-questions', methods=['POST'])
def generate_questions():
    data = request.json
    if not data:
        return jsonify({"error": "Missing request data"}), 400
    
    topics = data.get('topics', [])
    taxonomies = data.get('taxonomies', [])
    difficulty = data.get('difficulty', 'medium')
    
    prompt = f"""Generate {len(taxonomies) * 2} questions about the following topics:
Topics: {', '.join([t['content'] for t in topics])}
Taxonomies: {', '.join(taxonomies)}
Difficulty: {difficulty}
Format each question with:
1. The question text
2. The taxonomy level
3. The difficulty level
4. A suggested answer"""

    response = generate_with_gemini(prompt)
    if not response:
        return jsonify({"error": "Failed to generate questions"}), 500

    # Parse the response into structured questions
    questions = parse_gemini_questions(response)
    return jsonify({"questions": questions})

@app.route('/api/generate-lesson-plan', methods=['POST'])
def generate_lesson_plan():
    data = request.json
    if not data:
        return jsonify({"error": "Missing request data"}), 400
    
    topics = data.get('topics', [])
    weeks = data.get('weeks', 15)
    
    prompt = f"""Create a {weeks}-week lesson plan for the following topics:
Topics: {', '.join([t['content'] for t in topics])}
Include for each week:
1. Learning objectives
2. Teaching methods
3. Activities
4. Assessment methods"""

    response = generate_with_gemini(prompt)
    if not response:
        return jsonify({"error": "Failed to generate lesson plan"}), 500

    lesson_plan = parse_gemini_lesson_plan(response)
    return jsonify({"lessonPlan": lesson_plan})

def parse_gemini_questions(response):
    """Parse Gemini's response into structured questions"""
    questions = []
    current_question = {}
    
    for line in response.split('\n'):
        line = line.strip()
        if not line:
            if current_question:
                questions.append(current_question)
                current_question = {}
        elif line.startswith('Question:'):
            current_question['question'] = line[9:].strip()
        elif line.startswith('Taxonomy:'):
            current_question['taxonomy'] = line[9:].strip()
        elif line.startswith('Difficulty:'):
            current_question['difficulty'] = line[11:].strip()
        elif line.startswith('Answer:'):
            current_question['answer'] = line[7:].strip()
    
    if current_question:
        questions.append(current_question)
    
    return questions

def parse_gemini_lesson_plan(response):
    """Parse Gemini's response into structured lesson plan"""
    weeks = []
    current_week = {}
    
    for line in response.split('\n'):
        line = line.strip()
        if not line:
            if current_week:
                weeks.append(current_week)
                current_week = {}
        elif line.startswith('Week'):
            current_week = {'week': line.split(':')[0].strip()}
        elif line.startswith('Objectives:'):
            current_week['objectives'] = line[11:].strip()
        elif line.startswith('Methods:'):
            current_week['methods'] = line[8:].strip()
        elif line.startswith('Activities:'):
            current_week['activities'] = line[11:].strip()
        elif line.startswith('Assessment:'):
            current_week['assessment'] = line[11:].strip()
    
    if current_week:
        weeks.append(current_week)
    
    return weeks

@app.route('/api/generate-copo-mapping', methods=['POST'])
def generate_copo_mapping():
    data = request.json
    if not data:
        return jsonify({"error": "Missing required data"}), 400
    
    # Get syllabus data either directly or from uploaded syllabus
    syllabus_id = data.get('syllabus_id')
    if syllabus_id and syllabus_id in syllabi:
        course_outcomes = syllabi[syllabus_id]["course_outcomes"]
        program_outcomes = syllabi[syllabus_id]["program_outcomes"]
    else:
        course_outcomes = data.get('courseOutcomes', {})
        program_outcomes = data.get('programOutcomes', {})
    
    if not course_outcomes or not program_outcomes:
        return jsonify({"error": "Missing course outcomes or program outcomes"}), 400
    
    # Generate a random mapping between COs and POs
    mapping = {}
    for co_id, co_text in course_outcomes.items():
        mapping[co_id] = {}
        for po_id in program_outcomes.keys():
            # Generate a random correlation strength (1-3)
            # More likely to have medium correlations
            weights = [0, 1, 1, 2, 2, 2, 3, 3]
            correlation = random.choice(weights)
            if correlation > 0:  # Only include non-zero correlations
                mapping[co_id][po_id] = correlation
    
    # Store the mapping for later retrieval
    copo_mappings.append({
        "created_at": datetime.datetime.now().isoformat(),
        "syllabus_id": syllabus_id if syllabus_id else None,
        "mapping": mapping
    })
    
    return jsonify({
        "mapping": mapping,
        "course_outcomes": course_outcomes,
        "program_outcomes": program_outcomes,
        "format": "json"
    })

@app.route('/api/upload-course-material', methods=['POST'])
def upload_course_material():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    category = request.form.get('category', 'Lecture Slides')
    syllabus_id = request.form.get('syllabus_id')
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file:
        filename = secure_filename(file.filename)
        material_dir = os.path.join(UPLOAD_DIR, 'materials')
        os.makedirs(material_dir, exist_ok=True)
        file_path = os.path.join(material_dir, filename)
        file.save(file_path)
        
        material = {
            "id": len(course_materials) + 1,
            "fileName": filename,
            "filePath": file_path,
            "category": category,
            "syllabus_id": syllabus_id,
            "uploadedAt": datetime.datetime.now().isoformat()
        }
        course_materials.append(material)
        
        return jsonify({
            "message": "File uploaded successfully",
            "material": {
                "id": material["id"],
                "fileName": filename,
                "category": category,
                "syllabus_id": syllabus_id
            }
        })

@app.route('/api/download-material/<int:material_id>', methods=['GET'])
def download_material(material_id):
    # Find the material
    material = next((m for m in course_materials if m.get("id") == material_id), None)
    if not material:
        return jsonify({"error": "Material not found"}), 404
    
    return send_file(material["filePath"], as_attachment=True, download_name=material["fileName"])

@app.route('/api/download-pdf', methods=['POST'])
def download_pdf():
    data = request.json
    report_type = data.get('reportType', 'questions')
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    if report_type == 'questions':
        items = data.get('questions', [])
        filename = data.get('filename', 'question_bank.pdf')
        c.drawString(30, height - 40, "Question Bank")
        y = height - 60
        for q in items:
            # Use 'question' if available or fallback to 'text'
            question_text = f"Q: {q.get('question', q.get('text', ''))}"
            answer_text = f"A: {q.get('answer', 'No answer provided')}"
            c.drawString(30, y, question_text)
            y -= 20
            c.drawString(30, y, answer_text)
            y -= 40
            if y < 40:
                c.showPage()
                y = height - 40
        c.save()
    elif report_type == 'lesson_plan':
        items = data.get('lessonPlan', [])
        filename = data.get('filename', 'lesson_plan.pdf')
        c.drawString(30, height - 40, "Lesson Plan")
        y = height - 60
        for item in items:
            text = f"Week {item.get('week')} Day {item.get('day')} | Unit: {item.get('unit')} | Topic: {item.get('topic')}"
            c.drawString(30, y, text)
            y -= 20
            if y < 40:
                c.showPage()
                y = height - 40
        c.save()
    elif report_type == 'copo_mapping':
        mapping = data.get('mapping', {})
        course_outcomes = data.get('courseOutcomes', {})
        program_outcomes = data.get('programOutcomes', {})
        filename = data.get('filename', 'copo_mapping.pdf')
        c.drawString(30, height - 40, "CO-PO Mapping")
        y = height - 60
        for co, po_map in mapping.items():
            co_text = course_outcomes.get(co, "")
            c.drawString(30, y, f"{co}: {co_text}")
            y -= 20
            for po, score in po_map.items():
                po_text = program_outcomes.get(po, "")
                c.drawString(50, y, f"{po}: {po_text} (Score: {score})")
                y -= 20
            y -= 10
            if y < 40:
                c.showPage()
                y = height - 40
        c.save()
    else:
        return jsonify({"error": "Invalid report type"}), 400
    
    buffer.seek(0)
    return send_file(buffer, as_attachment=True, download_name=filename, mimetype='application/pdf')

@app.route('/api/download-csv', methods=['POST'])
def download_csv():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    items = data.get('items', [])
    if not items:
        return jsonify({"error": "No items to export"}), 400
    
    filename = data.get('filename', 'export.csv')
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    # Write headers based on the first item
    headers = items[0].keys()
    writer.writerow(headers)
    
    # Write data rows
    for item in items:
        writer.writerow(item.values())
    
    # Create response
    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    response.headers["Content-type"] = "text/csv"
    return response

@app.route('/api/syllabi', methods=['GET'])
def get_syllabi():
    syllabi_list = []
    for syllabus_id, syllabus in syllabi.items():
        syllabi_list.append({
            "id": syllabus_id,
            "filename": syllabus.get("filename", "Untitled"),
            "upload_date": syllabus.get("uploaded_at"),
            "topic_count": len(syllabus.get("topics", [])),
            "unit_count": len(syllabus.get("units", []))
        })
    return jsonify({"syllabi": syllabi_list})

@app.route('/api/dashboard-stats', methods=['GET'])
def dashboard_stats():
    # Generate statistics for the dashboard
    return jsonify({
        "totalSyllabi": len(syllabi),
        "totalQuestions": len(questions),
        "totalLessonPlans": len(lesson_plans),
        "totalMaterials": len(course_materials),
        "recentActivities": [
            {
                "action": f"Syllabus uploaded: {s.get('filename', 'Untitled')}",
                "time": s.get("uploaded_at"),
                "id": sid
            } for sid, s in list(syllabi.items())[-3:]
        ] if syllabi else []
    })

@app.route('/api/generate-all-materials', methods=['POST'])
def generate_all_materials():
    try:
        data = request.json
        syllabus_id = data.get('syllabus_id')
        
        if not syllabus_id or syllabus_id not in syllabi:
            return jsonify({'error': 'Invalid syllabus ID'}), 400
        
        syllabus = syllabi[syllabus_id]
        
        # Generate PDFs and save them
        question_bank_path = os.path.join(UPLOAD_DIR, f'question_bank_{syllabus_id}.pdf')
        lesson_plan_path = os.path.join(UPLOAD_DIR, f'lesson_plan_{syllabus_id}.pdf')
        copo_mapping_path = os.path.join(UPLOAD_DIR, f'copo_mapping_{syllabus_id}.pdf')
        schedule_path = os.path.join(UPLOAD_DIR, f'schedule_{syllabus_id}.pdf')
        
        # Generate each PDF
        generate_question_bank_pdf(syllabus, question_bank_path)
        generate_lesson_plan_pdf(syllabus, lesson_plan_path)
        generate_copo_mapping_pdf(syllabus, copo_mapping_path)
        generate_schedule_pdf(syllabus, schedule_path)
        
        # Return URLs for downloading
        base_url = request.host_url.rstrip('/')
        result = {
            'success': True,
            'materials': {
                'questionBankUrl': f'{base_url}/download/{syllabus_id}/question_bank.pdf',
                'lessonPlanUrl': f'{base_url}/download/{syllabus_id}/lesson_plan.pdf',
                'copoMappingUrl': f'{base_url}/download/{syllabus_id}/copo_mapping.pdf',
                'scheduleUrl': f'{base_url}/download/{syllabus_id}/schedule.pdf'
            },
            'syllabus_id': syllabus_id
        }
        
        return jsonify(result)
    except Exception as e:
        print(f"Error generating materials: {e}")
        return jsonify({'error': str(e)}), 500

# Add new route to handle downloads
@app.route('/download/<syllabus_id>/<filename>', methods=['GET'])
def download_generated_file(syllabus_id, filename):
    try:
        file_path = os.path.join(UPLOAD_DIR, f'{filename.split(".")[0]}_{syllabus_id}.pdf')
        if os.path.exists(file_path):
            return send_file(file_path, mimetype='application/pdf')
        return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def generate_question_bank_pdf(syllabus, output_path):
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter
    
    # Add header with metadata
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, "Question Bank")
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 70, f"Generated on: {datetime.datetime.now().strftime('%Y-%m-%d')}")
    
    y = height - 100
    current_page = 1
    
    def add_page_number():
        c.setFont("Helvetica", 10)
        c.drawString(width - 60, 30, f"Page {current_page}")
    
    taxonomies = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']
    
    for topic in syllabus.get('topics', []):
        if y < 100:  # Start new page if not enough space
            add_page_number()
            c.showPage()
            current_page += 1
            y = height - 100
        
        # Add topic header
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, y, f"Topic: {topic[0]}")
        y -= 30
        
        # Generate questions for each taxonomy
        for taxonomy in taxonomies:
            questions = generate_questions_for_topic(topic[1], taxonomy, 'Medium', 2)
            for i, q in enumerate(questions, 1):
                if y < 100:
                    add_page_number()
                    c.showPage()
                    current_page += 1
                    y = height - 100
                
                c.setFont("Helvetica-Bold", 12)
                c.drawString(70, y, f"Q{i}. [{taxonomy}]")
                y -= 20
                
                # Word wrap the question text
                c.setFont("Helvetica", 12)
                text = c.beginText(90, y)
                wrapped_text = textwrap.fill(q['text'], width=80)
                for line in wrapped_text.split('\n'):
                    text.textLine(line)
                c.drawText(text)
                y -= 20 * (len(wrapped_text.split('\n')))
                
                # Add suggested answer
                c.setFont("Helvetica-Oblique", 11)
                text = c.beginText(90, y)
                answer_text = textwrap.fill(q['answer'], width=80)
                text.textLine("Suggested Answer:")
                for line in answer_text.split('\n'):
                    text.textLine(line)
                c.drawText(text)
                y -= 20 * (len(answer_text.split('\n')) + 2)
            
            y -= 20  # Space between taxonomy sections
    
    add_page_number()
    c.save()

def generate_lesson_plan_pdf(syllabus, output_path):
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter
    
    # Add header
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, "Comprehensive Lesson Plan")
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 70, f"Generated on: {datetime.datetime.now().strftime('%Y-%m-%d')}")
    
    y = height - 100
    current_page = 1
    
    def add_page_number():
        c.setFont("Helvetica", 10)
        c.drawString(width - 60, 30, f"Page {current_page}")
    
    for topic in syllabus.get('topics', []):
        if y < 100:
            add_page_number()
            c.showPage()
            current_page += 1
            y = height - 100
        
        # Topic header
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, y, f"Unit: {topic[0]}")
        y -= 30
        
        # Learning objectives
        c.setFont("Helvetica-Bold", 12)
        c.drawString(70, y, "Learning Objectives:")
        y -= 20
        
        c.setFont("Helvetica", 12)
        objectives = generate_learning_objectives(topic[1])
        for obj in objectives:
            text = c.beginText(90, y)
            wrapped_text = textwrap.fill(f"• {obj}", width=80)
            for line in wrapped_text.split('\n'):
                text.textLine(line)
            c.drawText(text)
            y -= 20 * len(wrapped_text.split('\n'))
        
        # Teaching strategies
        y -= 20
        c.setFont("Helvetica-Bold", 12)
        c.drawString(70, y, "Teaching Strategies:")
        y -= 20
        
        c.setFont("Helvetica", 12)
        strategies = generate_teaching_strategies()
        for strategy in strategies:
            text = c.beginText(90, y)
            wrapped_text = textwrap.fill(f"• {strategy}", width=80)
            for line in wrapped_text.split('\n'):
                text.textLine(line)
            c.drawText(text)
            y -= 20 * len(wrapped_text.split('\n'))
        
        # Add more sections with proper formatting
        # ... (continue with activities and assessments)
    
    add_page_number()
    c.save()

def generate_copo_mapping_pdf(syllabus, output_path):
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter
    y = height - 40
    
    c.drawString(30, y, "CO-PO Mapping")
    y -= 40
    
    for co_id, co_text in syllabus.get('course_outcomes', {}).items():
        c.drawString(30, y, f"{co_id}: {co_text}")
        y -= 30
        if y < 40:
            c.showPage()
            y = height - 40
    
    c.save()

def generate_schedule_pdf(syllabus, output_path):
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter
    y = height - 40
    
    c.drawString(30, y, "Course Schedule")
    y -= 40
    
    week = 1
    for topic in syllabus.get('topics', []):
        c.drawString(30, y, f"Week {week}: {topic[0]}")
        y -= 20
        c.drawString(40, y, f"Content: {topic[1][:200]}")
        y -= 40
        week += 1
        if y < 40:
            c.showPage()
            y = height - 40
    
    c.save()

# Helper functions for generate-all-materials
def generate_questions_for_topic(topic_content, taxonomy, difficulty, count=2):
    """Generate questions for a topic with specific taxonomy and difficulty"""
    questions_list = []
    
    # Simple templates for different taxonomies
    templates = {
        'Remember': [
            "Define the concept of {term}.",
            "List the key characteristics of {term}.",
            "What is {term}?",
            "Identify the main components of {term}."
        ],
        'Understand': [
            "Explain the significance of {term}.",
            "Describe how {term} works.",
            "Classify the different types of {term}.",
            "Summarize the concept of {term}."
        ],
        'Apply': [
            "Apply the principles of {term} to solve the following problem...",
            "How would you use {term} in a real-world scenario?",
            "Demonstrate how {term} can be implemented.",
            "Calculate the result using the concept of {term}."
        ],
        'Analyze': [
            "Analyze the relationship between {term} and other concepts.",
            "Compare and contrast {term} with similar concepts.",
            "Examine the factors that influence {term}.",
            "What are the implications of {term}?"
        ],
        'Evaluate': [
            "Evaluate the effectiveness of {term} in solving problems.",
            "Critique the application of {term} in the given scenario.",
            "Judge the validity of statements about {term}.",
            "Assess the impact of {term} on the field."
        ],
        'Create': [
            "Design a new approach using the concept of {term}.",
            "Propose a solution to the problem using {term}.",
            "Create a model that demonstrates {term}.",
            "Develop a new application of {term}."
        ]
    }
    
    # Extract potential terms from topic content
    words = topic_content.split()
    terms = []
    for word in words:
        if word[0].isupper() and len(word) > 3:
            # Likely a technical term or proper noun
            terms.append(word)
    
    # Ensure we have some terms to work with
    if not terms:
        terms = ["this concept", "this topic", "this subject", "this methodology"]
    
    for i in range(count):
        template = random.choice(templates.get(taxonomy, templates['Remember']))
        term = random.choice(terms)
        
        question_text = template.format(term=term)
        
        # Generate a simple answer
        answer = f"Answer relates to {term} in the context of {taxonomy.lower()} cognitive level."
        
        question = {
            'id': len(questions) + i + 1,
            'text': question_text,
            'taxonomy': taxonomy,
            'difficulty': difficulty,
            'answer': answer,
            'topic': topic_content[:50] + "..." if len(topic_content) > 50 else topic_content
        }
        
        questions_list.append(question)
    
    return questions_list

def generate_learning_objectives(topic_content):
    """Generate learning objectives for a topic"""
    verbs = {
        'Remember': ['recall', 'recognize', 'list', 'identify', 'define'],
        'Understand': ['explain', 'describe', 'summarize', 'interpret', 'classify'],
        'Apply': ['apply', 'implement', 'use', 'execute', 'demonstrate'],
        'Analyze': ['analyze', 'differentiate', 'compare', 'examine', 'organize'],
        'Evaluate': ['evaluate', 'assess', 'judge', 'critique', 'justify'],
        'Create': ['create', 'design', 'develop', 'formulate', 'construct']
    }
    objectives = []
    # Extract keywords from topic content
    words = topic_content.split()
    keywords = [word for word in words if len(word) > 4 and word[0].isupper()]
    if not keywords:
        keywords = ["concepts", "principles", "methods", "applications"]
    
    # Generate 3-5 objectives using different taxonomies
    taxonomies = list(verbs.keys())
    random.shuffle(taxonomies)
    for i in range(min(3, len(taxonomies))):
        taxonomy = taxonomies[i]
        verb = random.choice(verbs[taxonomy])
        keyword = random.choice(keywords)
        objective = f"{verb} the {keyword} and their significance in the context of the topic"
        objectives.append(objective)
    
    return objectives

def generate_teaching_strategies():
    """Generate teaching strategies"""
    strategies = [
        "Interactive lectures with demonstrations",
        "Group discussions and peer learning",
        "Problem-based learning activities",
        "Flipped classroom approach",
        "Case study analysis",
        "Hands-on practical exercises",
        "Multimedia presentations and videos",
        "Guest lectures from industry experts",
        "Collaborative project work",
        "Socratic questioning and guided inquiry"
    ]
    
    # Select 2-3 random strategies
    count = random.randint(2, 3)
    return random.sample(strategies, count)

def generate_activities():
    """Generate learning activities"""
    activities = [
        "In-class problem solving exercises",
        "Small group discussions and presentations",
        "Individual research and reflection assignments",
        "Interactive quizzes and knowledge checks",
        "Role-playing and simulations",
        "Laboratory demonstrations and experiments",
        "Real-world case analysis",
        "Think-pair-share activities",
        "Peer teaching sessions",
        "Project work and presentations"
    ]
    
    # Select 2-3 random activities
    count = random.randint(2, 3)
    return random.sample(activities, count)

def generate_assessment_methods():
    """Generate assessment methods"""
    methods = [
        "Quizzes and short tests",
        "Written assignments and reports",
        "Oral presentations",
        "Project work and deliverables",
        "Class participation and discussion",
        "Peer and self-assessment",
        "Practical demonstrations",
        "Case study analysis",
        "Portfolio development",
        "Final examination"
    ]
    
    # Select 1-2 random assessment methods
    count = random.randint(1, 2)
    return random.sample(methods, count)

# Add the generate-schedule endpoint
@app.route('/api/generate-schedule', methods=['POST'], endpoint='generate_schedule')
def generate_schedule():
    """Generate a day-wise schedule for a course"""
    try:
        data = request.json
        syllabus_id = data.get('syllabus_id')
        total_weeks = data.get('total_weeks', 16)
        hours_per_week = data.get('hours_per_week', 3)
        
        if not syllabus_id or syllabus_id not in syllabi:
            return jsonify({'error': 'Invalid syllabus ID'}), 400
        
        syllabus = syllabi[syllabus_id]
        topics = syllabus['topics']
        units = syllabus.get('units', [])
        
        total_hours = total_weeks * hours_per_week
        schedule = []
        current_week = 1
        current_hour = 1
        topic_index = 0
        
        while current_week <= total_weeks and topic_index < len(topics):
            topic = topics[topic_index]
            unit_index = min(topic_index // max(1, len(topics) // len(units)), len(units) - 1)
            unit = units[unit_index] if unit_index < len(units) else f"Unit {unit_index + 1}"
            
            day = "Monday" if current_hour == 1 else "Wednesday" if current_hour == 2 else "Friday"
            
            schedule_item = {
                'id': len(schedule) + 1,
                'week': current_week,
                'day': day,
                'unit': unit,
                'topic': topic['title'],
                'description': topic['content'][:100] + "..." if len(topic['content']) > 100 else topic['content'],
                'activities': "Lecture, Discussion, Activities"
            }
            schedule.append(schedule_item)
            
            current_hour += 1
            if current_hour > hours_per_week:
                current_hour = 1
                current_week += 1
            
            # Sometimes cover the same topic for multiple sessions
            if random.random() > 0.7:  # 30% chance to stay on same topic
                topic_index += 1
        
        return jsonify({
            'success': True,
            'schedule': schedule,
            'total_hours': total_hours,
            'total_weeks': total_weeks,
            'hours_per_week': hours_per_week
        })
    except Exception as e:
        print(f"Error generating schedule: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/generate_schedule', methods=['POST'], endpoint='generate_schedule_v2')
def generate_schedule_v2():
    data = request.json
    syllabus = data.get('syllabus')
    total_weeks = data.get('total_weeks', 16)
    hours_per_week = data.get('hours_per_week', 3)

    if not syllabus:
        return jsonify({"error": "Syllabus data is required"}), 400
    
    topics = syllabus.get('topics', [])
    units = group_topics_by_unit(topics)
    
    total_hours = total_weeks * hours_per_week
    hours_per_unit = total_hours // len(units)
    generated_schedule = []
    current_week = 1
    current_hour = 1
    
    for unit_index, unit in enumerate(units):
        unit_hours = hours_per_unit if unit_index < len(units) - 1 else total_hours - hours_per_unit * (len(units) - 1)
        topics_in_unit = unit['topics']
        hours_per_topic = max(1, unit_hours // len(topics_in_unit))
        
        for topic_index, topic in enumerate(topics_in_unit):
            topic_hours = hours_per_topic if topic_index < len(topics_in_unit) - 1 else unit_hours - hours_per_topic * (len(topics_in_unit) - 1)
            
            for i in range(topic_hours):
                generated_schedule.append({
                    "week": current_week,
                    "day": get_day_from_hour(current_hour),
                    "unit": unit['title'],
                    "topic": topic['title'],
                    "description": topic['content'][:100] + "...",
                    "activities": "Introduction, Lecture" if i == 0 else "Review, Exercise" if i == topic_hours - 1 else "Lecture, Discussion"
                })
                
                current_hour += 1
                if current_hour > hours_per_week:
                    current_hour = 1
                    current_week += 1
    
    return jsonify(generated_schedule)

def group_topics_by_unit(topics):
    units = []
    current_unit = None
    
    for topic in topics:
        is_unit_title = bool(re.match(r'^(Unit|Chapter|Section)\s+[IVXLCDM0-9]+', topic['title'], re.I))
        if is_unit_title:
            current_unit = {"title": topic['title'], "topics": []}
            units.append(current_unit)
        elif current_unit:
            current_unit['topics'].append(topic)
        else:
            current_unit = {"title": "Unit 1", "topics": [topic]}
            units.append(current_unit)
    
    return [unit for unit in units if unit['topics']]

def get_day_from_hour(hour):
    return ["Monday", "Wednesday", "Friday"][(hour - 1) % 3]

@app.route('/download_schedule_pdf', methods=['POST'])
def download_schedule_pdf():
    data = request.json
    schedule = data.get('schedule', [])
    
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    c.drawString(30, height - 40, "Course Schedule")
    c.drawString(30, height - 60, "Week | Day | Unit | Topic | Description | Activities")
    y = height - 80
    
    for item in schedule:
        text = f"{item['week']} | {item['day']} | {item['unit']} | {item['topic']} | {item['description']} | {item['activities']}"
        c.drawString(30, y, text)
        y -= 20
        if y < 40:
            c.showPage()
            y = height - 40
    
    c.save()
    buffer.seek(0)
    return send_file(buffer, as_attachment=True, download_name='course_schedule.pdf', mimetype='application/pdf')

@app.route('/download_lesson_planner_pdf', methods=['POST'])
def download_lesson_planner_pdf():
    data = request.json
    schedule = data.get('schedule', [])
    
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    c.drawString(30, height - 40, "Lesson Planner")
    c.drawString(30, height - 60, "Week | Day | Unit | Topic | Description | Activities")
    y = height - 80
    
    for item in schedule:
        text = f"{item['week']} | {item['day']} | {item['unit']} | {item['topic']} | {item['description']} | {item['activities']}"
        c.drawString(30, y, text)
        y -= 20
        if y < 40:
            c.showPage()
            y = height - 40
    
    c.save()
    buffer.seek(0)
    return send_file(buffer, as_attachment=True, download_name='lesson_planner.pdf', mimetype='application/pdf')

@app.route('/save_export', methods=['POST'])
def save_export():
    data = request.json
    schedule = data.get('schedule', [])
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Week', 'Day', 'Unit', 'Topic', 'Description', 'Activities'])
    for item in schedule:
        writer.writerow([item['week'], item['day'], item['unit'], item['topic'], item['description'], item['activities']])
    
    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = "attachment; filename=course_schedule_export.csv"
    response.headers["Content-type"] = "text/csv"
    return response

@app.route('/export_lesson_planner', methods=['POST'])
def export_lesson_planner():
    data = request.json
    schedule = data.get('schedule', [])
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Week', 'Day', 'Unit', 'Topic', 'Description', 'Activities'])
    for item in schedule:
        writer.writerow([item['week'], item['day'], item['unit'], item['topic'], item['description'], item['activities']])
    
    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = "attachment; filename=lesson_planner_export.csv"
    response.headers["Content-type"] = "text/csv"
    return response

def error_response(message, status_code=400):
    """Helper function for consistent error responses"""
    return jsonify({"error": message}), status_code

def success_response(data, message="Success"):
    """Helper function for consistent success responses"""
    return jsonify({
        "success": True,
        "message": message,
        "data": data
    })

@app.errorhandler(Exception)
def handle_error(e):
    """Global error handler"""
    print(f"Error: {str(e)}")
    return error_response("An internal error occurred", 500)

if __name__ == '__main__':
    # Set debug=False in production
    app.run(debug=True, port=5000)
