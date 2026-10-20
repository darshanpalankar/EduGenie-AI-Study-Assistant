# EduGenie - AI Study Assistant

<p align="center">
  <img 
    src="https://github.com/darshanpalankar/EduGenie-AI-Study-Assistant/blob/main/static/images/edugenie_logo.png" 
    width="280"
    alt="EduGenie Logo"
  >
</p>

<p align="center">
  <strong>An AI-powered study assistant designed to make learning faster, simpler, and more interactive.</strong>
</p>

<p align="center">
  <a href="https://github.com/darshanpalankar/EduGenie-AI-Study-Assistant">
    <img src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github" alt="GitHub Repository">
  </a>
  <img src="https://img.shields.io/badge/Python-3.x-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Flask-Backend-000000?style=for-the-badge&logo=flask&logoColor=white" alt="Flask">
  <img src="https://img.shields.io/badge/Gemini-AI-4285F4?style=for-the-badge&logo=google" alt="Gemini AI">
  <img src="https://img.shields.io/badge/Status-Active-2EA44F?style=for-the-badge" alt="Project Status">
</p>

---

## 📖 About

**EduGenie** is an AI-powered study assistant built to help students understand academic topics, resolve doubts, generate concise study material, and interact with AI through a simple web interface.

The application combines a **Flask backend**, a **HTML/CSS/JavaScript frontend**, and the **Ollama API** to provide an interactive learning experience.

> **Project goal:** Make AI-assisted studying simple, accessible, and student-friendly.

---

## ✨ Features

### 💬 AI Chat
Ask academic questions and receive AI-generated explanations through an interactive chat interface.

### 📝 Study Notes
Generate concise, easy-to-understand study notes from academic topics.

### 💻 Code Generator
Generate programming code and explanations with the help of AI.

### 🧠 Quiz Generator
Create AI-generated quizzes to practice and test your understanding.

### 🧠 Notes Generator
Create custom study notes instantly to practice, review, and master any subject.

### 🧠 Math Solver
Get instant, step-by-step solutions to master complex math problems and practice your skills.

### 🤖 Interactive Experience
EduGenie includes a responsive interface and animated robot elements to make the learning experience more engaging.

### 📱 Responsive UI
The frontend is designed using HTML, CSS, and JavaScript with a focus on a clean and responsive user experience.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python, Flask |
| AI | Ollama API |
| Development | VS Code |
| Version Control | Git & GitHub |

---

## 📂 Project Structure

```text
EduGenie - AI Study Assistant/
│
├── App/
│   └── app.py
│
├── static/
│   ├── css/
│   │   ├── base.css
│   │   ├── chat.css
│   │   ├── code-generator.css
│   │   ├── notes.css
│   │   ├── home.css
│   │   └── quiz-generator.css
│   │
│   ├── images/
│   │   └── ai_robot_animated.webm
│   │
│   └── js/
│       ├── base.js
│       ├── chat.js
│       ├── code-generator.js
│       ├── home.js
│       └── quiz-generator.js
│
├── templates/
│   ├── ai_chat.html
│   ├── code_generator.html
│   ├── index.html
│   └── quiz_generator.html
│
├── requirements.txt
└── README.md
```

---

## ⚙️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/darshanpalkar/EduGenie-AI-Study-Assistant.git
cd EduGenie-AI-Study-Assistant
```

### 2. Create a virtual environment

**Windows PowerShell:**

```powershell
python -m venv venv
venv\Scripts\Activate.ps1
```

**Windows Command Prompt:**

```cmd
python -m venv venv
venv\Scripts\activate.bat
```

**macOS / Linux:**

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure the Ollama API key

Create an API key through Ollama Website and configure it as an environment variable.

**Windows PowerShell:**

```powershell
$env:OLLAMA_API_KEY="your-api-key-here"
```

**Windows Command Prompt:**

```cmd
set OLLAMA_API_KEY=your-api-key-here
```

**macOS / Linux:**

```bash
export OLLAMA_API_KEY="your-api-key-here"
```

> **Security:** Never commit your API key, `.env` files containing secrets, or other credentials to GitHub.

### 5. Run EduGenie

```bash
python App/app.py
```

Then open:

```text
http://127.0.0.1:5000
```

---

## 🔐 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OLLAMA_API_KEY` | Yes | API key used to access the Ollama API |
| `FLASK_SECRET_KEY` | Optional | Secret key for Flask session/security configuration |

For production use, configure secrets through your hosting platform or environment rather than hard-coding them in source code.

---

## 🧪 Development

A typical development workflow is:

```bash
git status
git add .
git commit -m "Your commit message"
git push origin main
```

Before committing, make sure sensitive credentials and local environment files are excluded from the repository.

---

## 🚀 Future Enhancements

Planned improvements include:

- [ ] Question and conversation history
- [ ] User authentication
- [ ] PDF-based note generation
- [ ] Personalized study recommendations
- [ ] Additional AI-powered learning tools
- [ ] Further UI and accessibility improvements

---

## 🎯 Project Objectives

EduGenie was developed with the following objectives:

1. Provide students with quick access to AI-assisted academic support.
2. Simplify complex topics through concise explanations.
3. Make study material generation faster and easier.
4. Provide interactive tools such as quizzes and code generation.
5. Demonstrate the integration of AI APIs with a Flask web application.

---

## 👨‍💻 Authors

**Darshan Palankar**  

---

## 📄 License

This project is intended for educational and academic purposes.

---

## ⭐ Support

If you find **EduGenie** useful, consider giving the repository a ⭐ on GitHub.

<p align="center">
  <strong>EduGenie — Learn Smarter. Study Better. 🚀</strong>
</p>
