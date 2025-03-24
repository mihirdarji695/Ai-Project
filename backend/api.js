const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.post('/generateAllMaterials', async (req, res) => {
  const syllabusId = req.body.syllabus_id;

  // Generate the materials (this is just a placeholder, replace with actual logic)
  const materials = {
    questionBankUrl: `/downloads/QuestionBank_${syllabusId}.pdf`,
    lessonPlanUrl: `/downloads/LessonPlan_${syllabusId}.pdf`,
    copoMappingUrl: `/downloads/COPOMapping_${syllabusId}.pdf`,
    scheduleUrl: `/downloads/Schedule_${syllabusId}.pdf`,
  };

  // Ensure the files are generated and exist
  // Replace this with actual file generation logic
  fs.writeFileSync(path.join(__dirname, materials.questionBankUrl), 'Question Bank Content');
  fs.writeFileSync(path.join(__dirname, materials.lessonPlanUrl), 'Lesson Plan Content');
  fs.writeFileSync(path.join(__dirname, materials.copoMappingUrl), 'CO-PO Mapping Content');
  fs.writeFileSync(path.join(__dirname, materials.scheduleUrl), 'Schedule Content');

  res.json({ materials });
});

app.get('/downloads/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'downloads', req.params.filename);
  res.download(filePath);
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
