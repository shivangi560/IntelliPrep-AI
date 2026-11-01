import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";

function Dashboard() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [skillAnalysis, setSkillAnalysis] = useState(null);
  const [skillLoading, setSkillLoading] = useState(false);
  const [skillError, setSkillError] = useState("");

  const [roadmap, setRoadmap] = useState(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState("");

  const [stats, setStats] = useState({
    totalInterviews: 0,
    averageScore: 0,
    bestScore: 0,
    history: []
  });

  const [statsLoading, setStatsLoading] = useState(true);

  // Resume score and generated certificate count
  const [summary, setSummary] = useState({
    resumeScore: null,
    certificateCount: 0
  });

  // Save completed roadmap tasks in localStorage
  const [completedTasks, setCompletedTasks] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("roadmapCompletedTasks") || "{}"
      );
    } catch {
      return {};
    }
  });

  // Toggle roadmap task
  const toggleTask = (taskId) => {
    setCompletedTasks((previous) => {
      const updated = {
        ...previous,
        [taskId]: !previous[taskId]
      };

      localStorage.setItem(
        "roadmapCompletedTasks",
        JSON.stringify(updated)
      );

      return updated;
    });
  };

  // Fetch dashboard statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await API.get("/interview/stats", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setStats({
          totalInterviews: response.data.totalInterviews || 0,
          averageScore: response.data.averageScore || 0,
          bestScore: response.data.bestScore || 0,
          history: response.data.history || []
        });
      } catch (error) {
        console.error("Dashboard stats error:", error);
      } finally {
        setStatsLoading(false);
      }
    };

    // Fetch resume score and certificate count
    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await API.get("/dashboard/summary", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setSummary({
          resumeScore: response.data.resumeScore ?? null,
          certificateCount: response.data.certificateCount ?? 0
        });
      } catch (error) {
        console.error("Dashboard summary error:", error);
      }
    };

    fetchStats();
    fetchSummary();
  }, []);

  // AI Skill Gap Analysis
  const analyzeSkills = async () => {
    try {
      setSkillLoading(true);
      setSkillError("");

      const token = localStorage.getItem("token");

      const response = await API.get("/skills/analyze", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setSkillAnalysis(response.data.analysis);
    } catch (error) {
      setSkillError(
        error.response?.data?.message ||
        "Could not analyze your skills. Please try again."
      );
    } finally {
      setSkillLoading(false);
    }
  };

  // Generate AI Learning Roadmap
  const generateRoadmap = async () => {
    try {
      setRoadmapLoading(true);
      setRoadmapError("");

      const token = localStorage.getItem("token");

      const response = await API.get("/roadmap/generate", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setRoadmap(response.data.roadmap);
    } catch (error) {
      setRoadmapError(
        error.response?.data?.message ||
        "Could not generate roadmap. Please try again."
      );
    } finally {
      setRoadmapLoading(false);
    }
  };

  // Calculate roadmap progress
  const allTasks =
    roadmap?.days?.flatMap((day) =>
      (day.tasks || []).map((task, index) => ({
        id: `${day.day}-task-${index}`,
        label: task
      }))
    ) || [];

  const completedCount = allTasks.filter(
    (task) => completedTasks[task.id]
  ).length;

  const roadmapProgress = allTasks.length
    ? Math.round((completedCount / allTasks.length) * 100)
    : 0;

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };
const skillAverage = skillAnalysis?.skills?.length
  ? Math.round(
      skillAnalysis.skills.reduce(
        (total, skill) => total + (Number(skill.score) || 0),
        0
      ) / skillAnalysis.skills.length
    )
  : null;

const resumeProgress = summary.resumeScore ?? 0;
const interviewProgress = stats.averageScore || 0;
  return (
    <div className="dashboard-page">

      {/* Sidebar */}
      <aside className="sidebar">
        <h2>
          🎓 IntelliPrep <span>AI</span>
        </h2>

        <p className="sidebar-tagline">
          Prepare Smarter. Get Hired Faster.
        </p>

        <nav>
          <a className="active" href="/dashboard">
            ⌂ Dashboard
          </a>

          <a href="#resume">▤ Resume Analysis</a>
          <a href="#interview">🎙 AI Mock Interview</a>
          <a href="#skills">▥ Skill Gap Analysis</a>
          <a href="#roadmap">▧ Learning Roadmap</a>
          <a href="#history">◷ Interview History</a>
          <Link to="/certificate">♕ Certificates</Link>
          <Link to="/settings">⚙ Settings</Link>
        </nav>

        <div className="upgrade-card">
          <h3>👑 Upgrade to Pro</h3>
          <p>
            Get advanced features and personalized guidance.
          </p>
          <button>Upgrade Now</button>
        </div>
      </aside>

      {/* Main Dashboard */}
      <main className="dashboard-main">

        {/* Topbar */}
        <header className="dashboard-topbar">
          <input
            placeholder="Search for topics, interviews, or anything..."
          />

          <div className="profile-area">
            <span>🔔</span>

            <strong>{user.name || "Student"}</strong>

            <button onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        {/* Welcome Section */}
        <section className="welcome-banner">
          <p>Hi {user.name || "Student"} 👋</p>

          <h1>
            Welcome to IntelliPrep <span>AI</span>
          </h1>

          <p>
            Your personal AI companion for interview preparation.
          </p>

          <p>
            Analyze, practice, learn and get hired faster!
          </p>
        </section>

        {/* Statistics Cards */}
        <section className="stats-grid">

          <div className="stat-card">
            <h3>📄 Resume Score</h3>

            <h2>
              {summary.resumeScore !== null
                ? `${summary.resumeScore}/100`
                : "--"}
            </h2>

            <p>
              {summary.resumeScore !== null
                ? "Your latest resume score"
                : "Upload your resume to begin"}
            </p>
          </div>

          <div className="stat-card">
            <h3>🎯 Mock Interviews</h3>

            <h2>
              {statsLoading ? "..." : stats.totalInterviews}
            </h2>

            <p>Completed interviews</p>
          </div>

          <div className="stat-card">
            <h3>📊 Average Score</h3>

            <h2>
              {statsLoading
                ? "..."
                : `${stats.averageScore}/100`}
            </h2>

            <p>
              Best score: {stats.bestScore}/100
            </p>
          </div>

          <div className="stat-card">
            <h3>🏅 Certificates</h3>

            <h2>{summary.certificateCount}</h2>

            <p>Your achievements</p>
          </div>

        </section>

        {/* Interview Readiness */}
        <section className="readiness-card">
          <div>
            <span className="readiness-label">
              YOUR INTERVIEW READINESS
            </span>

            <h2>
              {statsLoading
                ? "..."
                : `${stats.averageScore}%`}
            </h2>

            <p>
              {stats.totalInterviews > 0
                ? "Based on your completed AI mock interviews"
                : "Complete your first mock interview to calculate readiness."}
            </p>
          </div>

          <div className="readiness-progress">
            <div
              className="readiness-progress-fill"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(0, stats.averageScore)
                )}%`
              }}
            />
          </div>
        </section>

        {/* Quick Actions */}
        <h2 className="section-heading">
          Quick Actions
        </h2>

        <section className="quick-grid">

          <div className="action-card" id="resume">
            <h3>📄 Analyze Resume</h3>

            <p>
              Get AI-powered feedback on your resume.
            </p>

            <Link
              to="/resume-upload"
              className="dashboard-action-link"
            >
              Upload Resume →
            </Link>
          </div>

          <div className="action-card" id="interview">
            <h3>🎙 Start Mock Interview</h3>

            <p>
              Practice with an AI interviewer.
            </p>

            <Link
              to="/interview"
              className="dashboard-action-link"
            >
              Start Now →
            </Link>
          </div>

          <div className="action-card">
            <h3>📊 Skill Gap Analysis</h3>

            <p>
              Find and improve your weak skills.
            </p>

            <button
              onClick={analyzeSkills}
              disabled={skillLoading}
            >
              {skillLoading ? "Analyzing..." : "Analyze Now →"}
            </button>
          </div>

          <div className="action-card">
            <h3>📚 Learning Roadmap</h3>

            <p>
              Get a personalized study plan.
            </p>

            <button
              onClick={generateRoadmap}
              disabled={roadmapLoading}
            >
              {roadmapLoading ? "Creating Plan..." : "View Roadmap →"}
            </button>
          </div>

        </section>

        {/* Skill Gap Analysis */}
        <section className="skill-analysis-section" id="skills">

          <div className="skill-section-heading">
            <div>
              <span>AI POWERED INSIGHTS</span>

              <h2>Skill Gap Analysis</h2>

              <p>
                Discover your strengths and areas to improve.
              </p>
            </div>

            <button
              onClick={analyzeSkills}
              disabled={skillLoading}
            >
              {skillLoading
                ? "Analyzing..."
                : "✦ Analyze My Skills"}
            </button>
          </div>

          {skillError && (
            <p className="skill-error">
              {skillError}
            </p>
          )}

          {skillAnalysis && (
            <>
              <div className="skill-summary">
                <h3>AI Performance Summary</h3>

                <p>
                  {skillAnalysis.overallSummary}
                </p>
              </div>

              <div className="skill-results-grid">

                {skillAnalysis.skills?.map((skill, index) => (
                  <div
                    className="skill-result-card"
                    key={index}
                  >
                    <div className="skill-result-heading">
                      <h3>{skill.name}</h3>

                      <b>{skill.score}/100</b>
                    </div>

                    <div className="skill-score-track">
                      <div
                        className="skill-score-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, Number(skill.score) || 0)
                          )}%`
                        }}
                      />
                    </div>

                    <span className="skill-level">
                      {skill.level}
                    </span>

                    <p>{skill.recommendation}</p>
                  </div>
                ))}

              </div>

              <div className="priority-topics">
                <h3>Priority Topics to Practice</h3>

                <ul>
                  {skillAnalysis.priorityTopics?.map(
                    (topic, index) => (
                      <li key={index}>{topic}</li>
                    )
                  )}
                </ul>
              </div>
            </>
          )}

        </section>

        {/* Learning Roadmap */}
        <section className="roadmap-section" id="roadmap">

          <div className="roadmap-heading">
            <div>
              <span>PERSONALIZED AI LEARNING</span>

              <h2>My Learning Roadmap</h2>

              <p>
                Improve your weak skills with a personalized 7-day plan.
              </p>
            </div>

            <button
              onClick={generateRoadmap}
              disabled={roadmapLoading}
            >
              {roadmapLoading
                ? "Creating Plan..."
                : "✦ Generate Roadmap"}
            </button>
          </div>

          {roadmapError && (
            <p className="roadmap-error">
              {roadmapError}
            </p>
          )}

          {roadmap && (
            <>
              {/* Roadmap Summary */}
              <div className="roadmap-summary">
                <h3>{roadmap.title}</h3>

                <p>{roadmap.summary}</p>
              </div>

              {/* Roadmap Progress */}
              <div className="roadmap-progress-card">
                <div className="roadmap-progress-heading">
                  <div>
                    <h3>Your Learning Progress</h3>

                    <p>
                      {completedCount} of {allTasks.length} tasks completed
                    </p>
                  </div>

                  <strong>{roadmapProgress}%</strong>
                </div>

                <div className="roadmap-progress-track">
                  <div
                    className="roadmap-progress-fill"
                    style={{
                      width: `${roadmapProgress}%`
                    }}
                  />
                </div>
              </div>

              {/* Roadmap Days */}
              <div className="roadmap-days">

                {roadmap.days?.map((day, index) => (
                  <article
                    className="roadmap-day"
                    key={index}
                  >
                    <div className="roadmap-day-number">
                      Day {day.day}
                    </div>

                    <h3>{day.topic}</h3>

                    <p className="roadmap-goal">
                      <b>Goal:</b> {day.goal}
                    </p>

                    {/* Learning Tasks */}
                    <h4>Learning Tasks</h4>

                    <div className="roadmap-task-list">
                      {day.tasks?.map((task, i) => {
                        const taskId = `${day.day}-task-${i}`;

                        return (
                          <label
                            className="roadmap-task"
                            key={taskId}
                          >
                            <input
                              type="checkbox"
                              checked={!!completedTasks[taskId]}
                              onChange={() => toggleTask(taskId)}
                            />

                            <span
                              className={
                                completedTasks[taskId]
                                  ? "task-completed"
                                  : ""
                              }
                            >
                              {task}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Recommended Websites */}
                    <h4>Recommended Websites</h4>

                    <div className="roadmap-resources">

                      {day.resources?.map((resource, i) => {
                        const trustedDomains = [
                          "react.dev",
                          "developer.mozilla.org",
                          "freecodecamp.org",
                          "dev.java",
                          "docs.python.org",
                          "javascript.info",
                          "w3schools.com"
                        ];

                        let validUrl = false;

                        try {
                          const parsedUrl = new URL(resource.url);

                          validUrl =
                            parsedUrl.protocol === "https:" &&
                            trustedDomains.some(
                              (domain) =>
                                parsedUrl.hostname === domain ||
                                parsedUrl.hostname.endsWith("." + domain)
                            );
                        } catch {
                          validUrl = false;
                        }

                        return (
                          <div
                            className="roadmap-resource"
                            key={i}
                          >
                            <div>
                              <b>{resource.name}</b>

                              <p>{resource.type}</p>
                            </div>

                            {validUrl ? (
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Visit Website →
                              </a>
                            ) : (
                              <span>Link unavailable</span>
                            )}
                          </div>
                        );
                      })}

                    </div>

                    {/* Practice Projects */}
                    <h4>Practice Projects</h4>

                    <ul>
                      {day.practiceTasks?.map((task, i) => (
                        <li key={i}>{task}</li>
                      ))}
                    </ul>

                  </article>
                ))}

              </div>
            </>
          )}

        </section>

                {/* Bottom Dashboard Section */}
        <section className="bottom-grid">

          {/* Interview History */}
          <div className="activity-card" id="history">

            <h2>Recent Interview Activity</h2>

            {statsLoading ? (
              <p>Loading interview history...</p>
            ) : stats.history.length === 0 ? (
              <p>
                No activity yet. Start your preparation today!
              </p>
            ) : (
              <div className="history-list">

                {stats.history.map((item, index) => (
                  <div
                    className="history-item"
                    key={index}
                  >
                    <div>
                      <h3>{item.role}</h3>

                      <p>
                        {new Date(item.date).toLocaleDateString("en-IN")}
                      </p>
                    </div>

                    <span className="history-score">
                      {item.score}/100
                    </span>
                  </div>
                ))}

              </div>
            )}

          </div>

          {/* Preparation Progress */}
          <div className="activity-card">

            <h2>Your Preparation Progress</h2>

            {/* Resume Progress */}
            <div className="preparation-item">
              <div className="preparation-heading">
                <span>Resume Preparation</span>

                <strong>
                  {summary.resumeScore !== null
                    ? `${resumeProgress}%`
                    : "Not started"}
                </strong>
              </div>

              <div className="preparation-track">
                <div
                  className="preparation-fill"
                  style={{
                    width: `${resumeProgress}%`
                  }}
                />
              </div>
            </div>

            {/* Technical Skills */}
            <div className="preparation-item">
              <div className="preparation-heading">
                <span>Technical Skills</span>

                <strong>
                  {skillAverage !== null
                    ? `${skillAverage}%`
                    : "Not analyzed"}
                </strong>
              </div>

              <div className="preparation-track">
                <div
                  className="preparation-fill"
                  style={{
                    width: `${skillAverage ?? 0}%`
                  }}
                />
              </div>
            </div>

            {/* Mock Interviews */}
            <div className="preparation-item">
              <div className="preparation-heading">
                <span>Mock Interviews</span>

                <strong>
                  {stats.averageScore}%
                </strong>
              </div>

              <div className="preparation-track">
                <div
                  className="preparation-fill"
                  style={{
                    width: `${interviewProgress}%`
                  }}
                />
              </div>
            </div>

            {/* Aptitude and HR */}
            <div className="preparation-item">
              <div className="preparation-heading">
                <span>Aptitude & HR</span>
                <strong>Not tracked yet</strong>
              </div>
            </div>

          </div>

        </section>

      </main>
    </div>
  );
}

export default Dashboard;