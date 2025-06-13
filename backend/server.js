const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');
const Resume = require('./models/Resume');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb+srv://sohail098:Sq58t1AJTj6W2kla@cluster0.piyymfl.mongodb.net/resumePortfolio', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// File upload config
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Upload and parse resume using OpenRouter (GPT-3.5)
app.post('/upload', upload.single('resume'), async (req, res) => {
  try {
    const buffer = fs.readFileSync(req.file.path);
    const data = await pdfParse(buffer);
    const text = data.text;

    const prompt = `
Extract the following information from this resume text and give output in JSON format only (no backticks or markdown):

{
  "name": "",
  "email": "",
  "phone": "",
  "skills": [],
  "education": "",
  "experience": "",
  "projects": "",
  "summary": ""
}

Resume Text:
${text}
`;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a resume parser bot. Only return valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = response.data.choices[0].message.content;

    const cleaned = reply.replace(/```json|```/g, '').trim();

    const parsed = JSON.parse(cleaned);

    const resume = new Resume({
      name: parsed.name || 'Not found',
      email: parsed.email || 'Not found',
      skills: parsed.skills || [],
      fullText: text,
      education: parsed.education || '',
      experience: parsed.experience || '',
      projects: parsed.projects || '',
      summary: parsed.summary || '',
      createdAt: new Date()
    });

    await resume.save();
    res.status(201).json({ message: '✅ Resume parsed with GPT-3.5 via OpenRouter', data: resume });

  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ error: 'OpenRouter parsing failed', details: err.message });
  }
});


app.get('/portfolio', async (req, res) => {
  try {
    const latest = await Resume.findOne().sort({ createdAt: -1 });
    if (!latest) return res.status(404).json({ message: 'No resume found' });
    res.json(latest);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});


app.listen(5000, () => console.log('🚀 Server running on http://localhost:5000'));
