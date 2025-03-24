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

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing

# Create a data directory if it doesn't exist
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
UPLOAD_DIR = os.path.join(DATA_DIR, 'uploads')
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mock database (will be stored in memory for this simple example)
syllabi = {}
course_materials = []
questions = []
lesson_plans = []
copo_mappings = []

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
            # For text-based files
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
    print("Received request data:", data)
    
    if not data:
        return jsonify({"error": "Missing request data"}), 400
    
    # Check if the required fields are present
    if 'topics' not in data:
        return jsonify({"error": "Missing 'topics' field"}), 400
    if 'taxonomies' not in data:
        return jsonify({"error": "Missing 'taxonomies' field"}), 400
    if 'difficulty' not in data:
        return jsonify({"error": "Missing 'difficulty' field"}), 400
    
    topics = data['topics']
    selected_taxonomies = data['taxonomies']
    difficulty = data['difficulty']
    syllabus_id = data.get('syllabus_id')
    
    # If syllabus_id is provided, use topics from that syllabus
    if syllabus_id and syllabus_id in syllabi:
        syllabus_topics = [{"title": title, "content": content} for title, content in syllabi[syllabus_id]["topics"]]
        # If specific topics are also provided, prioritize those
        if not topics or len(topics) == 0:
            topics = syllabus_topics
    
    # Ensure topics has content
    if len(topics) == 0:
        return jsonify({"error": "No topics available to generate questions"}), 400
    
    # Templates for different taxonomy levels
    taxonomy_templates = {
        "Remember": [
            "Define the concept of {}.",
            "List the key components of {}.",
            "Identify the main characteristics of {}.",
            "What is {}?",
            "Recall the definition of {}."
        ],
        "Understand": [
            "Explain how {} works.",
            "Describe the process of {}.",
            "Differentiate between {} and related concepts.",
            "Interpret the significance of {}.",
            "Summarize the key ideas of {}."
        ],
        "Apply": [
            "How would you use {} to solve this problem: {}?",
            "Apply the concept of {} to this scenario: {}.",
            "Demonstrate how {} can be implemented in a real-world context.",
            "Solve this problem using {}.",
            "Calculate the result using the principles of {}."
        ],
        "Analyze": [
            "Analyze the relationship between {} and other concepts.",
            "Break down the components of {} and explain their significance.",
            "Compare and contrast different approaches to {}.",
            "Examine the evidence for and against {}.",
            "What are the causes and effects related to {}?"
        ],
        "Evaluate": [
            "Evaluate the effectiveness of {} in the given context.",
            "Critique the approach taken for {}.",
            "Justify the use of {} in this situation.",
            "Assess the importance of {} in the field.",
            "What are the advantages and disadvantages of {}?"
        ],
        "Create": [
            "Design a new approach to {}.",
            "Develop an innovative solution using {}.",
            "Create a model that demonstrates {}.",
            "Propose a new theory about {}.",
            "How would you improve the existing concept of {}?"
        ]
    }
    
    # Generate questions
    question_bank = []
    
    for topic in topics:
        topic_title = topic.get('title', 'Unknown Topic')
        topic_content = topic.get('content', '')
        
        if not topic_content:
            continue
            
        topic_keywords = re.findall(r'\b\w{5,}\b', topic_content)
        keywords = [kw for kw in topic_keywords if len(kw) > 4]
        
        if not keywords and len(topic_content) > 10:
            # If no good keywords found, use content fragments
            content_parts = re.split(r'[,.]', topic_content)
            keywords = [part.strip() for part in content_parts if len(part.strip()) > 10]
            
        if not keywords:
            # Fallback
            keywords = [topic_title, "this concept", "the topic"]
        
        for taxonomy in selected_taxonomies:
            templates = taxonomy_templates.get(taxonomy, taxonomy_templates["Remember"])
            
            for _ in range(3):  # Generate 3 questions per taxonomy level
                template = random.choice(templates)
                keyword = random.choice(keywords)
                
                if "{}" in template:
                    if template.count("{}") > 1:
                        # For templates with two placeholders (like in Apply level)
                        scenario = random.choice([
                            "a classroom setting",
                            "industry applications",
                            "research context",
                            "everyday life",
                            "solving optimization problems"
                        ])
                        question = template.format(keyword, scenario)
                    else:
                        question = template.format(keyword)
                else:
                    question = template
                
                question_bank.append({
                    "topic": topic_title,
                    "taxonomy": taxonomy,
                    "difficulty": difficulty,
                    "question": question
                })
    
    # Store questions for later retrieval
    questions.extend(question_bank)
    
    return jsonify({"questions": question_bank})

@app.route('/api/generate-lesson-plan', methods=['POST'])
def generate_lesson_plan():
    data = request.json
    
    if not data:
        return jsonify({"error": "Missing request data"}), 400
    
    # Handle both direct topic input and syllabus-based input
    syllabus_id = data.get('syllabus_id')
    if syllabus_id and syllabus_id in syllabi:
        topics = [{"title": title, "content": content} for title, content in syllabi[syllabus_id]["topics"]]
        units = syllabi[syllabus_id]["units"]
    else:
        topics = data.get('topics', [])
        units = data.get('units', [f"Unit {i+1}" for i in range(5)])
    
    weeks = data.get('weeks', 15)
    days_per_week = data.get('daysPerWeek', 3)
    
    # If unitWeightage is missing, create equal weightage
    unit_weightage = data.get('unitWeightage', {})
    if not unit_weightage:
        unit_weightage = {unit: 1 for unit in units}
    
    # Calculate days for each unit based on weightage
    total_days = weeks * days_per_week
    weightage_sum = sum(unit_weightage.values())
    
    unit_days = {}
    for unit, weight in unit_weightage.items():
        unit_days[unit] = max(1, round((weight / weightage_sum) * total_days))
    
    # Reorganize topics by unit
    unit_topics = {}
    for topic in topics:
        unit = next((u for u in units if u in topic['title']), units[0])
        unit_topics.setdefault(unit, []).append(topic['content'])
    
    # Simple estimation of days per topic (equally distribute within each unit)
    topic_days = {}
    for unit, topics_list in unit_topics.items():
        if unit in unit_days and unit_days[unit] > 0 and topics_list:
            days_per_topic = max(1, unit_days[unit] // len(topics_list))
            for topic in topics_list:
                topic_days[topic] = days_per_topic
    
    # Generate lesson plan
    lesson_plan = []
    week_count, day_count = 1, 1
    
    for unit, days_available in unit_days.items():
        topics_in_unit = unit_topics.get(unit, [])
        if not topics_in_unit:
            continue
        
        for topic in topics_in_unit:
            days_for_topic = topic_days.get(topic, 1)
            
            for _ in range(days_for_topic):
                if week_count > weeks:
                    break
                    
                # Add teaching methods and activities
                teaching_methods = random.choice([
                    "Lecture", "Discussion", "Group work", 
                    "Case study", "Problem-solving", "Presentation"
                ])
                
                activities = random.choice([
                    "In-class exercises", "Quiz", "Group presentation",
                    "Debate", "Project work", "Reflection paper"
                ])
                
                lesson_plan.append({
                    "week": week_count,
                    "day": day_count,
                    "unit": unit,
                    "topic": topic,
                    "teachingMethod": teaching_methods,
                    "activities": activities
                })
                
                day_count += 1
                if day_count > days_per_week:
                    day_count = 1
                    week_count += 1
    
    # Store lesson plan for later retrieval
    lesson_plans.append({
        "created_at": datetime.datetime.now().isoformat(),
        "plan": lesson_plan,
        "syllabus_id": syllabus_id if syllabus_id else None
    })
    
    return jsonify({"lessonPlan": lesson_plan})

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
        "mapping": mapping,
        "syllabus_id": syllabus_id if syllabus_id else None
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
    
    return send_file(material["filePath"], 
                     as_attachment=True, 
                     download_name=material["fileName"])

@app.route('/api/download-pdf', methods=['POST'])
def download_pdf():
    data = request.json
    report_type = data.get('reportType', 'questions')
    
    if report_type == 'questions':
        items = data.get('questions', [])
        filename = data.get('filename', 'question_bank.pdf')
    elif report_type == 'lesson_plan':
        items = data.get('lessonPlan', [])
        filename = data.get('filename', 'lesson_plan.pdf')
    elif report_type == 'copo_mapping':
        mapping = data.get('mapping', {})
        course_outcomes = data.get('courseOutcomes', {})
        program_outcomes = data.get('programOutcomes', {})
        filename = data.get('filename', 'copo_mapping.pdf')
    else:
        return jsonify({"error": "Invalid report type"}), 400
    
    # In a real implementation, you would use a library like ReportLab to generate PDFs
    # For now, we'll just return a placeholder response
    
    return jsonify({
        "message": "PDF generation feature is enabled but requires ReportLab implementation",
        "status": "pending",
        "reportType": report_type,
        "filename": filename
    })

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
            }
            for sid, s in list(syllabi.items())[-3:]
        ] if syllabi else []
    })

@app.route('/api/generate-all-materials', methods=['POST'])
def generate_all_materials():
    """Generate all educational materials from a single syllabus"""
    try:
        data = request.json
        syllabus_id : int = data.get('syllabus_id')
        
        if not syllabus_id or syllabus_id not in syllabi:
            return jsonify({'error': 'Invalid syllabus ID'}), 400
      
        syllabus = syllabi[syllabus_id]
        
        # 1. Generate questions for each topic with different taxonomies and difficulties
        generated_questions = []
        taxonomies = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']
        difficulties = ['Easy', 'Medium', 'Hard']
        syllabus['topics'] = [
    {'title': unit[0], 'content': unit[1]}  # Convert each tuple to a dictionary
    for unit in syllabus['topics']
]
        for topic in syllabus['topics']:
            for taxonomy in taxonomies[:3]:  # Use first 3 taxonomies for brevity
                for difficulty in difficulties[:2]:  # Use first 2 difficulties for brevity
                    questions_per_combo = 1  # Limit questions per combination
                    topic_questions = generate_questions_for_topic(
                        topic['content'],
                        taxonomy,
                        difficulty,
                        questions_per_combo
                    )
                    generated_questions.extend(topic_questions)
        
        # 2. Generate lesson plan
        lesson_plan = {
            'id': len(lesson_plans) + 1,
            'syllabus_id': syllabus_id,
            'course_title': syllabus.get('course_title', 'Course'),
            'course_code': syllabus.get('course_code', 'CODE101'),
            'units': [],
            'created_at': datetime.datetime.now().isoformat()
        }
        
        for unit_idx, unit in enumerate(syllabus.get('units', [])):
            unit_plan = {
                'unit_title': unit,
                'topics': []
            }
            
            # Find topics for this unit
            unit_topics = []
            for topic in syllabus['topics']:
                if unit_idx == 0 and len(unit_topics) < 5:
                    # Add first 5 topics to first unit if we can't match them
                    unit_topics.append(topic)
            
            for topic in unit_topics:
                topic_plan = {
                    'title': topic['title'],
                    'learning_objectives': generate_learning_objectives(topic['content']),
                    'teaching_strategies': generate_teaching_strategies(),
                    'activities': generate_activities(),
                    'assessment': generate_assessment_methods()
                }
                unit_plan['topics'].append(topic_plan)
            
            lesson_plan['units'].append(unit_plan)
        
        # 3. Generate CO-PO mapping
        course_outcomes = syllabus.get('course_outcomes', {})
        program_outcomes = syllabus.get('program_outcomes', {})
        
        # Create mapping grid
        mapping = {
            'id': len(copo_mappings) + 1,
            'syllabus_id': syllabus_id,
            'course_title': syllabus.get('course_title', 'Course'),
            'course_code': syllabus.get('course_code', 'CODE101'),
            'mapping_grid': {}
        }
        
        # Generate mapping values
        for co_id, co_text in course_outcomes.items():
            mapping['mapping_grid'][co_id] = {}
            for po_id, po_text in program_outcomes.items():
                # Generate a score between 1-3 or 0 (no correlation)
                score = random.choice([0, 1, 2, 3, 3, 2, 1])  # Weight toward middle values
                if score > 0:
                    mapping['mapping_grid'][co_id][po_id] = score
        
        # 4. Generate schedule
        topics = syllabus['topics']
        units = syllabus.get('units', [])
        
        # Default schedule parameters
        total_weeks = 16
        hours_per_week = 3
        total_hours = total_weeks * hours_per_week
        
        # Create day-wise schedule
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
        
        # Store generated materials
        questions.extend(generated_questions)
        lesson_plans.append(lesson_plan)
        copo_mappings.append(mapping)
        
        # Prepare response
        result = {
            'success': True,
            'materials': {
                'questions': len(generated_questions),
                'lesson_plan': lesson_plan['id'],
                'copo_mapping': mapping['id'],
                'schedule': len(schedule)
            },
            'syllabus_id': syllabus_id
        }
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error generating materials: {e}")
        return jsonify({'error': str(e)}), 500

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
    current_term = []
    
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
@app.route('/api/generate-schedule', methods=['POST'])
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

# Run the application
if __name__ == '__main__':
    app.run(debug=True, port=5000) 