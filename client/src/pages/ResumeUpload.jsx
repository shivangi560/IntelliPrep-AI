
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

function ResumeUpload() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [analysis, setAnalysis] = useState(null);

  const getToken = () => localStorage.getItem("token");

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!file) {
      setMessage("Please select your resume first.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);

    try {
      setLoading(true);
      setMessage("");
      setAnalysis(null);

      const response = await API.post("/resume/upload", formData, {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });

      setMessage(response.data.message);
      setResumeText(response.data.resume.extractedText);
      setResumeName(response.data.resume.originalName);

    } catch (error) {
      setMessage(error.response?.data?.message || "Resume upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      setMessage("");
      setAnalysis(null);

      const response = await API.post(
        "/resume/analyze",
        {},
        {
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        }
      );

      setAnalysis(response.data.analysis);
      setMessage(response.data.message);

    } catch (error) {
      setMessage(
        error.response?.data?.message || "AI resume analysis failed."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="resume-page">
      <header className="resume-header">
        <div>
          <h2>🎓 IntelliPrep <span>AI</span></h2>
          <p>AI-Powered Resume Analysis</p>
        </div>
        <button onClick={() => navigate("/dashboard")}>
          ← Dashboard
        </button>
      </header>

      <main className="resume-content">
        <section className="resume-welcome">
          <p>YOUR CAREER JOURNEY STARTS HERE</p>
          <h1>Resume Analysis</h1>
          <p>
            Upload your resume and let AI help you prepare for your dream job.
          </p>
        </section>

        <section className="resume-upload-box">
          <div className="upload-symbol">📄</div>
          <h2>Upload Your Resume</h2>
          <p>Choose your PDF or DOCX resume to get started.</p>

          <form onSubmit={handleUpload}>
            <label className="resume-drop-area">
              <span className="upload-cloud">☁</span>
              <strong>Click to browse your files</strong>
              <span>PDF or DOCX · Maximum 5 MB</span>
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => {
                  setFile(e.target.files[0] || null);
                  setAnalysis(null);
                  setResumeText("");
                  setMessage("");
                }}
              />
            </label>

            {file && (
              <div className="selected-resume">
                <span>📎 {file.name}</span>
                <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            )}

            <button
              className="analyze-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Uploading..." : "Upload Resume →"}
            </button>
          </form>

          {message && <p className="resume-message">{message}</p>}
        </section>

        {resumeText && (
          <>
            <section className="resume-result">
              <div>
                <span className="result-icon">✓</span>
                <div>
                  <h2>Resume Uploaded Successfully!</h2>
                  <p>{resumeName}</p>
                </div>
              </div>
              <span className="success-label">Uploaded</span>
            </section>

            <section className="resume-details">
              <div className="details-heading">
                <h2>Resume Content</h2>
                <span>Extracted successfully</span>
              </div>

              <p className="details-description">
                Your resume text has been extracted and is ready for AI analysis.
              </p>

              <div className="resume-text-box">
                <pre>{resumeText}</pre>
              </div>

              <button
                className="analyze-button"
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                {analyzing ? "AI is analyzing your resume..." : "Continue to AI Analysis →"}
              </button>
            </section>
          </>
        )}

        {analysis && (
          <section className="resume-details">
            <h2>🤖 Your AI Resume Analysis</h2>

            <h3>Resume Score</h3>
            <h1>{analysis.resumeScore}/100</h1>

            <h3>Summary</h3>
            <p>{analysis.summary}</p>

            <h3>Identified Skills</h3>
            <ul>
              {analysis.skills.map((skill, index) => (
                <li key={index}>{skill}</li>
              ))}
            </ul>

            <h3>Strengths</h3>
            <ul>
              {analysis.strengths.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>

            <h3>Areas to Improve</h3>
            <ul>
              {analysis.weaknesses.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>

            <h3>Recommended Skills</h3>
            <ul>
              {analysis.missingSkills.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>

            <h3>AI Recommendations</h3>
            <ul>
              {analysis.recommendations.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>

            <button
              className="analyze-button"
              onClick={() => navigate("/interview")}
            >
              Start AI Interview →
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

export default ResumeUpload;
