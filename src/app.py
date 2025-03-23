import ollama 
import pandas as pd
import streamlit as st
import chardet
import re
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import zipfile

# Streamlit UI Setup
st.set_page_config(page_title="AI Education Toolkit", layout="wide")
if "pdf_files" not in st.session_state:
    st.session_state.pdf_files = []

st.markdown(
    "<h1 style='text-align: center; color: #4CAF50;'>📚 AI-Powered Education Toolkit</h1>", 
    unsafe_allow_html=True
)

# Sidebar: No API Key Required for Local Model
st.sidebar.header("🔧 Local Model Configuration")
st.sidebar.info("Using local model: DeepSeek-R1 8B")

# Initialize Ollama Client (assuming Ollama is running locally)
model_name = "deepseek-r1:8b"  # Specify the model name as per Ollama's convention

# Sidebar: File Upload Section
st.sidebar.header("📂 Upload Syllabus")
uploaded_file = st.sidebar.file_uploader("Upload syllabus file (TXT)", type=["txt"])
if uploaded_file is not None:
    syllabus = uploaded_file.read().decode("utf-8")
else:
    syllabus = None

def detect_encoding(file):
    raw_data = file.read(1024)
    result = chardet.detect(raw_data)
    encoding = result["encoding"] or "utf-8"
    file.seek(0)
    return encoding

def extract_topics(text):
    topics = []
    topic_pattern = re.compile(r"(Unit\s+[IVXLCDM]+)(.*?)(?=(Unit\s+[IVXLCDM]+|$))", re.DOTALL)
    matches = topic_pattern.findall(text)
    for match in matches:
        title = match[0].strip()
        content = match[1].strip()
        topics.append((title, content))
    return topics

def extract_units(text):
    unit_pattern = re.findall(r"(Unit\s+[IVXLCDM0-9]+)", text)
    return list(dict.fromkeys(unit_pattern))

# Extract Topics & Units
topics, units = [], []
if uploaded_file:
    encoding = detect_encoding(uploaded_file)
    uploaded_file.seek(0)
    text = uploaded_file.read().decode(encoding)
    topics = extract_topics(text)
    units = extract_units(text)
    if not topics:
        st.sidebar.error("⚠️ No valid topics found in the uploaded file.")
        st.stop()
    else:
        st.sidebar.success(f"✅ Extracted {len(topics)} topics from the syllabus.")
    if not units:
        st.sidebar.warning("⚠️ No units found. The syllabus format may be incorrect.")

# Tabs for Features
tab1, tab2, tab3, tab4 = st.tabs([
    "🔍 Question Bank Generator", "📖 Lesson Plan Generator", "📊 CO-PO Mapping", "📑 Course Material Compiler"
])

# Question Bank Generator
with tab1:
    st.markdown("### 🔍 AI Question Bank Generator")
    if not topics:
        st.warning("⚠️ Please upload a syllabus file first.")
        st.stop()

    taxonomy_levels = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"]
    difficulty_levels = ["Easy", "Medium", "Hard"]

    col1, col2 = st.columns(2)
    with col1:
        selected_taxonomies = st.multiselect("Select Bloom's Taxonomy Levels:", taxonomy_levels, default=taxonomy_levels)
    with col2:
        difficulty = st.selectbox("Select Difficulty Level:", difficulty_levels)

    if not selected_taxonomies:
        st.warning("⚠️ Please select at least one Bloom's Taxonomy level.")

    if st.button("Generate Questions", use_container_width=True):
        with st.spinner("Generating questions..."):
            question_bank = []

            def generate_questions(topic, taxonomy, difficulty, num_questions):
                prompt = f"""
                Generate {num_questions} unique questions for the topic "{topic[0]}: {topic[1]}" 
                based on Bloom’s Taxonomy level "{taxonomy}" and difficulty "{difficulty}".
                """
                response = ollama.chat(model=model_name, messages=[{"role": "user", "content": prompt}])
                return response['message']['content'].strip().split("\n")

            for topic in topics:
                for taxonomy in selected_taxonomies:
                    questions = generate_questions(topic, taxonomy, difficulty, 5)
                    for question in questions:
                        if question.strip():
                            question_bank.append([f"{topic[0]}: {topic[1]}", taxonomy, difficulty, question.strip()])

            df = pd.DataFrame(question_bank, columns=["Topic", "Bloom’s Taxonomy", "Difficulty", "Question"])
            st.dataframe(df, use_container_width=True)
            st.download_button("📥 Download CSV", df.to_csv(index=False).encode("utf-8"), "question_bank.csv", "text/csv")

# Lesson Plan Generator
with tab2:
    st.markdown("### 📖 AI-Enhanced Lesson Plan Generator")
    if not topics:
        st.warning("⚠️ Please upload a syllabus file first.")
        st.stop()

    col1, col2 = st.columns(2)
    with col1:
        course_duration_weeks = st.number_input("Course Duration (Weeks):", min_value=1, max_value=52, value=12)
    with col2:
        days_per_week = st.number_input("Days per Week:", min_value=1, max_value=7, value=5)

    st.subheader("🔢 Enter Weightage for Each Unit")
    unit_weightage = {unit: st.slider(f"{unit} Weightage (%)", min_value=0, max_value=100, value=10, step=5) for unit in units}

    def distribute_days_by_weightage(weeks, days_per_week, unit_weightage):
        total_days = weeks * days_per_week
        weightage_sum = sum(unit_weightage.values())
        return {unit: max(1, round((weight / weightage_sum) * total_days)) for unit, weight in unit_weightage.items()}

    def estimate_days_per_topic(topic, unit_name, total_days):
        prompt = f"""
        Given the topic below, estimate the number of days needed based on complexity:
        - **Topic:** {topic}
        - **Unit Name:** {unit_name}
        - **Total Course Days:** {total_days}
        Return only a whole number of days (minimum 1).
        """
        response = ollama.chat(model=model_name, messages=[
            {"role": "system", "content": "You are an AI tutor allocating time for topics."},
            {"role": "user", "content": prompt}
        ])
        suggested_days = response['message']['content'].strip()
        return int(suggested_days) if suggested_days.isdigit() else 1

    def generate_lesson_plan(topics, weeks, days_per_week, unit_weightage):
        lesson_plan = []
        week_count, day_count = 1, 1
        total_days = weeks * days_per_week

        unit_topics = {}
        for unit, topic in topics:
            unit_topics.setdefault(unit, []).append(topic)

        unit_days = distribute_days_by_weightage(weeks, days_per_week, unit_weightage)

        for unit, days_available in unit_days.items():
            topics_in_unit = unit_topics.get(unit, [])
            if not topics_in_unit:
                continue

            total_estimated_days = sum(estimate_days_per_topic(topic, unit, total_days) for topic in topics_in_unit)
            topic_days = {}
            for topic in topics_in_unit:
                estimated_days = estimate_days_per_topic(topic, unit, total_days)
                topic_days[topic] = max(1, round((estimated_days / total_estimated_days) * days_available))

            for topic, assigned_days in topic_days.items():
                for _ in range(assigned_days):
                    if week_count > weeks:
                        return lesson_plan
                    lesson_plan.append([week_count, day_count, unit, topic])
                    day_count += 1
                    if day_count > days_per_week:
                        day_count = 1
                        week_count += 1
        return lesson_plan

    if st.button("Generate AI-Powered Lesson Plan"):
        lesson_plan = generate_lesson_plan(topics, course_duration_weeks, days_per_week, unit_weightage)
        df = pd.DataFrame(lesson_plan, columns=["Week", "Day", "Unit Name", "Topic to be Covered"])
        st.write(df)
        st.download_button("📥 Download Lesson Plan (CSV)", df.to_csv(index=False).encode("utf-8"), "lesson_plan.csv", "text/csv")

# CO-PO Mapping Tab
with tab3:
    st.markdown("### 📊 CO-PO Mapping for Syllabus")
    co_file = st.file_uploader("📂 Upload Course Outcomes (CO) File (TXT)", type=["txt"])
    course_outcomes = {}
    if co_file:
        encoding = detect_encoding(co_file)
        co_file.seek(0)
        co_text = co_file.read().decode(encoding)
        co_list = re.findall(r"(CO\d+):\s*(.*)", co_text)
        course_outcomes = {co[0]: co[1] for co in co_list}
        if not course_outcomes:
            st.error("⚠️ No valid COs found. Ensure the file format is correct.")
        else:
            st.success(f"✅ Extracted {len(course_outcomes)} Course Outcomes.")

    po_file = st.file_uploader("📂 Upload Program Outcomes (PO) File (TXT)", type=["txt"])
    program_outcomes = {}
    if po_file:
        encoding = detect_encoding(po_file)
        po_file.seek(0)
        po_text = po_file.read().decode(encoding)
        po_list = re.findall(r"(PO\d+):\s*(.*)", po_text)
        program_outcomes = {po[0]: po[1] for po in po_list}
        if not program_outcomes:
            st.error("⚠️ No valid POs found. Ensure the file format is correct.")
        else:
            st.success(f"✅ Extracted {len(program_outcomes)} Program Outcomes.")

    if course_outcomes and program_outcomes:
        if st.button("🔄 Generate CO-PO Mapping"):
            with st.spinner("Generating CO-PO mapping..."):
                prompt = f"""
                You are an AI education expert. Given the following Syllabus, Course Outcomes (COs), and Program Outcomes (POs),
                generate a CO-PO mapping table. Use a scale of High (3), Medium (2), and Low (1) to indicate alignment.

                Syllabus:
                {syllabus}

                Course Outcomes (COs):
                {chr(10).join([f"{co}: {desc}" for co, desc in course_outcomes.items()])}

                Program Outcomes (POs):
                {chr(10).join([f"{po}: {desc}" for po, desc in program_outcomes.items()])}

                Analyze the syllabus content to determine the strength of alignment between COs and POs.
                Generate the mapping table in a structured format.
                """
                response = ollama.chat(model=model_name, messages=[{"role": "user", "content": prompt}])
                copo_mapping = response['message']['content'].strip()

            st.markdown("### 📊 AI-Generated CO-PO Mapping Table")
            st.text_area("Generated Mapping Table", copo_mapping, height=200)
            copo_lines = copo_mapping.split("\n")
            copo_csv = "\n".join([",".join(row.split()) for row in copo_lines])
            st.download_button("📥 Download CO-PO Mapping (CSV)", copo_csv.encode(), "copo_mapping.csv", "text/csv")

# Course Material Compiler
with tab4:
    st.markdown("### 📑 AI-Powered Course Material Compiler")
    if not topics:
        st.warning("⚠️ Please upload a syllabus file first.")
        st.stop()

    if st.button("Generate Course Material PDFs"):
        with st.spinner("Generating course material..."):
            st.session_state.pdf_files = []

            for unit, content in topics:
                prompt = f"""
                Generate structured course material for:
                - **Unit:** {unit}
                - **Content:** {content}
                
                Include:
                1. **Brief Introduction**
                2. **Key Concepts**
                3. **Examples**
                4. **Diagrams (Textual Description)**
                """
                response = ollama.chat(model=model_name, messages=[{"role": "user", "content": prompt}])
                material = response['message']['content'].strip()

                pdf_output = BytesIO()
                c = canvas.Canvas(pdf_output, pagesize=letter)
                width, height = letter

                c.setFont("Helvetica-Bold", 14)
                c.drawString(50, height - 50, f"Unit: {unit}")
                c.setFont("Helvetica", 12)
                text = c.beginText(50, height - 80)
                text.setFont("Helvetica", 10)

                max_width = 500
                lines = material.split("\n")
                for line in lines:
                    words = line.split()
                    while words:
                        new_line = ""
                        while words and c.stringWidth(new_line + words[0], "Helvetica", 10) < max_width:
                            new_line += words.pop(0) + " "
                        text.textLine(new_line.strip())

                c.drawText(text)
                c.save()
                pdf_output.seek(0)
                st.session_state.pdf_files.append((unit, pdf_output))

        for unit, pdf_output in st.session_state.pdf_files:
            st.download_button(
                label=f"📥 Download {unit} Material (PDF)",
                data=pdf_output,
                file_name=f"{unit.replace(' ', '_')}.pdf",
                mime="application/pdf"
            )
        if st.session_state.pdf_files:
            zip_buffer = BytesIO()
            with zipfile.ZipFile(zip_buffer, "w") as zip_file:
                for unit, pdf_output in st.session_state.pdf_files:
                    pdf_output.seek(0)
                    zip_file.writestr(f"{unit.replace(' ', '_')}.pdf", pdf_output.getvalue())
            zip_buffer.seek(0)
            st.download_button(
                label="📥 Download All PDFs as ZIP",
                data=zip_buffer,
                file_name="course_materials.zip",
                mime="application/zip"
            )