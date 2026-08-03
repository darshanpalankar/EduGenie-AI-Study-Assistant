# EduGenie-AI-Study-Assistant 

EduGenie is an AI-powered study assistant that enables students to get instant answers to academic questions, resolve doubts efficiently, and generate concise, easy-to-understand study notes. Built with Flask and the Gemini API, it delivers an interactive, intelligent, and accessible learning experience. 🚀

<p style="border-radius: 20px;" align="center">
    <img src="https://github.com/darshanpalankar/EduGenie-AI-Study-Assistant/blob/main/static/images/logo.png" width="300"/>
</p>

<p style="border-radius: 20px;" align="center">
    <img src="https://github.com/darshanpalankar/EduGenie-AI-Study-Assistant/blob/main/static/images/home_robot.png" width="300"/>
</p>

<p style="border-radius: 20px;" align="center">
    <img src="https://github.com/darshanpalankar/EduGenie-AI-Study-Assistant/blob/main/static/images/robot.png" width="300"/>
</p>

<video autoplay muted loop width="500">
    <source src="https://github.com/darshanpalankar/EduGenie-AI-Study-Assistant/blob/main/Images/EduGenie_Testing.mp4" type="video/mp4">
</video>

## Features
- Ask academic questions and get AI-generated answers
- Generate short and easy-to-understand notes
- Simple and responsive user interface
- Fast doubt-solving assistant

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Python, Flask
- AI Model: Gemini API

## 📂 Project Structure

```text
EDUGENIE - AI ASSISTANT/
│
├── App/
│   ├── app.py
│   └── chatbot.py
│
├── Static/
│   ├── Images/
│   │   └── EduGenie - Logo.png
│   ├── script.js
│   └── style.css
│
└── Templates/
    ├── ai_chat.html
    ├── code_generator.html
    ├── index.html
    ├── notes_generator.html
    └── quiz_generator.html
```


## Setup

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Set your Gemini API key as an environment variable:
   ```
   export GENAI_API_KEY="your-api-key-here"
   ```
   (On Windows: `set GENAI_API_KEY=your-api-key-here`)

3. (Optional) Set a Flask secret key for session security in production:
   ```
   export FLASK_SECRET_KEY="some-random-string"
   ```

4. Run the app:
   ```
   python app.py
   ```

5. Open your browser to `http://127.0.0.1:5000`.

## Notes

- Chat history is kept in memory per browser session and is tied to a single running server process. Restarting the server clears all conversations.
- Click "New wish" to reset your conversation and start fresh.
- For production deployment, use a proper WSGI server (e.g. gunicorn) and set `debug=False`.


## Future Enhancements
- Question history
- User authentication
- PDF note generation
- Dark mode
- Personalized study recommendations

## Author
- Darshan Palankar
- Priyesh Kondvilkar
