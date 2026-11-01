
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

function Interview() {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [difficulty, setDifficulty] = useState("medium");
  const [role, setRole] = useState("Software Developer");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
const [evaluation, setEvaluation] = useState(null);
const [showEvaluation, setShowEvaluation] = useState(false);
const [saving, setSaving] = useState(false);
const [savedQuestions, setSavedQuestions] = useState([]);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (!started) return;

    const timer = setInterval(() => {
      setTime((previous) => previous + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [started]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(
      remaining
    ).padStart(2, "0")}`;
  };

  
  // AI interviewer speaks the question
  const speakQuestion = (text) => {
    if (!("speechSynthesis" in window)) {
      alert("Your browser does not support AI voice.");
      return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    speech.rate = 0.9;
    speech.pitch = 1;

    setSpeaking(true);

    speech.onend = () => setSpeaking(false);
    speech.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(speech);
  };
  
const [recognitionInstance, setRecognitionInstance] = useState(null);

const stopListening = () => {
  if (recognitionInstance) {
    recognitionInstance.stop();
  }
  setListening(false);
};


  // Candidate speaks and browser converts speech into text
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported. Please use Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let transcript = "";

      for (
        let i = 0;
        i < event.results.length;
        i++
      ) {
        transcript += event.results[i][0].transcript + " ";
      }

      setAnswer(transcript.trim());
    };

    recognition.onerror = (event) => {
      setListening(false);
      alert("Microphone error: " + event.error);
    };

    recognition.onend = () => {
      setListening(false);
    };
    setRecognitionInstance(recognition);
    recognition.start();
    setListening(true);
  };

  const startInterview = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const response = await API.post(
        "/interview/start",
        { difficulty, role },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setQuestions(response.data.questions);
      setCurrent(0);
      setAnswer("");
      setTime(0);
      setStarted(true);
    } catch (error) {
      alert(
        error.response?.data?.message ||
        "Could not start interview."
      );
    } finally {
      setLoading(false);
    }
  };

const evaluateAnswer = async () => {
  if (!answer.trim()) {
    alert("Please enter your answer first.");
    return;
  }

  try {
    setEvaluating(true);
    setShowEvaluation(false);

    const token = localStorage.getItem("token");

    const response = await API.post(
      "/interview/evaluate",
      {
        question: questions[current]?.question,
        answer,
        role,
        topic: questions[current]?.topic,
        difficulty
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    setEvaluation(response.data.evaluation);
    setSavedQuestions((previous) => {
  const updated = [...previous];

  updated[current] = {
    question: questions[current]?.question,
    topic: questions[current]?.topic,
    answer,
    evaluation: response.data.evaluation
  };

  return updated;
});
    setShowEvaluation(true);

  } catch (error) {
    alert(
      error.response?.data?.message ||
      "Could not evaluate your answer."
    );
  } finally {
    setEvaluating(false);
  }
};

const saveInterview = async () => {
  try {
    setSaving(true);

    const token = localStorage.getItem("token");

    const response = await API.post(
      "/interview/save",
      {
        role,
        difficulty,
        questions: savedQuestions
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    alert(
      `Interview saved successfully! Average Score: ${response.data.totalScore}/100`
    );

    setStarted(false);
    setShowEvaluation(false);
    setEvaluation(null);
    setSavedQuestions([]);

  } catch (error) {
    alert(
      error.response?.data?.message ||
      "Could not save interview."
    );
  } finally {
    setSaving(false);
  }
};


  const nextQuestion = () => {
    if (!answer.trim()) {
      alert("Please enter your answer first.");
      return;
    }

    if (current < questions.length - 1) {
      setCurrent(current + 1);
      setAnswer("");
    } else {
      alert("Interview questions completed!");
      setStarted(false);
    }
  };

  const progress = questions.length
    ? ((current + 1) / questions.length) * 100
    : 0;

  return (
    <div className="interview-page">
      <header className="interview-topbar">
        <div className="interview-brand">
          <span className="interview-brand-icon">✦</span>
          <span>IntelliPrep <b>AI</b></span>
        </div>

        <button
          className="interview-back"
          onClick={() => navigate("/dashboard")}
        >
          ← Dashboard
        </button>
      </header>

      {!started ? (
        <main className="interview-setup">
          <div className="interview-heading">
            <span className="interview-tag">✦ AI POWERED PRACTICE</span>
            <h1>Ready to ace your interview?</h1>
            <p>
              Practice with your personal AI interviewer
              and improve your interview skills.
            </p>
          </div>

          <div className="setup-card">
            <div className="setup-card-icon">✦</div>
            <h2>Configure Your Interview</h2>
            <p>Customize your practice session</p>

            <label>Target Job Role</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Software Developer"
            />

            <label>Difficulty Level</label>
            <div className="difficulty-options">
              {["easy", "medium", "hard"].map((level) => (
                <button
                  key={level}
                  className={
                    difficulty === level ? "difficulty active" : "difficulty"
                  }
                  onClick={() => setDifficulty(level)}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>

            <div className="interview-info">
              <span>✦ 5 AI-generated questions</span>
              <span>◷ Self-paced session</span>
              <span>◎ Resume-based questions</span>
            </div>

            <button
              className="start-interview-btn"
              onClick={startInterview}
              disabled={loading || !role.trim()}
            >
              {loading ? "AI is preparing..." : "Start AI Interview →"}
            </button>

            <small>Your resume will be used to personalize questions.</small>
          </div>
        </main>
      ) : (
        <main className="live-interview">
          <div className="live-heading">
            <div>
              <span className="interview-tag">LIVE SESSION</span>
              <h1>AI Mock Interview</h1>
              <p>{role} · {difficulty} level</p>
            </div>

            <div className="interview-timer">
              <span>◷</span> {formatTime(time)}
            </div>
          </div>

          <div className="interview-progress">
            <div>
              <span>Interview Progress</span>
              <b>{current + 1} / {questions.length}</b>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="interviewer-card">
            <div className="ai-avatar">✦</div>
            <div>
              <span>YOUR AI INTERVIEWER</span>
              <h3>IntelliPrep AI</h3>
              <p>I'm listening. Take your time to answer.</p>
            </div>
            <span className="online-dot">● Online</span>
          </div>

          <section className="question-card">
            <div className="question-meta">
              <span>QUESTION {current + 1}</span>
              <span>{questions[current]?.type || "Technical"}</span>
            </div>

            <h2>{questions[current]?.question}</h2>
            <p className="question-topic">
              Topic: {questions[current]?.topic || "General"}
            </p>

            <label>Your Answer</label>
            <textarea
              rows="8"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Start typing your answer here..."
            />

            <div className="answer-footer">
              <span>{answer.trim().split(/\s+/).filter(Boolean).length} words</span>
              <span>Be clear and explain with examples.</span>
            </div>
            
<div className="voice-controls">
  <button
    type="button"
    className="voice-btn"
    onClick={() => speakQuestion(questions[current]?.question)}
  >
    {speaking ? "🔊 Speaking..." : "🔊 Listen to Question"}
  </button>

  <button
    type="button"
    className={`voice-btn ${listening ? "recording" : ""}`}
    onClick={startListening}
    disabled={listening}
  >
    {listening ? "🎙 Listening..." : "🎤 Start Speaking"}
  </button>

  {listening && (
    <button
      type="button"
      className="voice-btn"
      onClick={stopListening}
    >
      Stop Recording
    </button>
  )}
</div>

{showEvaluation && evaluation && (
  <div className="evaluation-card">
    <div className="evaluation-header">
      <div>
        <span>AI PERFORMANCE REPORT</span>
        <h2>Your Answer Evaluation</h2>
      </div>
      <div className="evaluation-score">
        {evaluation.score}/100
      </div>
    </div>

    <p className="evaluation-feedback">
      {evaluation.feedback}
    </p>

    <h3>Performance Breakdown</h3>

    {[
      ["Correctness", evaluation.correctness],
      ["Relevance", evaluation.relevance],
      ["Technical Depth", evaluation.technicalDepth],
      ["Completeness", evaluation.completeness],
      ["Communication", evaluation.communication]
    ].map(([label, score]) => (
      <div className="score-row" key={label}>
        <div>
          <span>{label}</span>
          <b>{score}/100</b>
        </div>
        <div className="score-track">
          <div
            className="score-fill"
            style={{
              width: `${Math.max(0, Math.min(100, Number(score) || 0))}%`
            }}
          />
        </div>
      </div>
    ))}

    <div className="feedback-columns">
      <div>
        <h3>✓ Strengths</h3>
        <ul>
          {evaluation.strengths?.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3>↗ Areas to Improve</h3>
        <ul>
          {evaluation.improvements?.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    </div>

    <div className="ideal-answer">
      <h3>Suggested Ideal Answer</h3>
      <p>{evaluation.idealAnswer}</p>
    </div>
  </div>
)}



            <div className="question-actions">
                
<button
  className="evaluate-btn"
  onClick={evaluateAnswer}
  disabled={evaluating || !answer.trim()}
>
  {evaluating ? "AI is evaluating..." : "✦ Evaluate My Answer"}
</button>

              <button
                className="end-interview-btn"
                onClick={() => {
                  if (window.confirm("End this interview session?")) {
                    setStarted(false);
                  }
                }}
              >
                End Interview
              </button>

              <button
                className="next-question-btn"
                onClick={
  current === questions.length - 1
    ? saveInterview
    : nextQuestion
}
disabled={saving}
              >
                {current === questions.length - 1
  ? saving
    ? "Saving..."
    : "Finish & Save Interview ✓"
  : "Next Question →"}
              </button>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

export default Interview;
