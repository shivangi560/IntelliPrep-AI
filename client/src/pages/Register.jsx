
import React, { useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const response = await API.post("/auth/register", {
        name,
        email,
        password
      });

      setMessage(response.data.message);
      setName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Registration failed. Try again."
      );
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-decoration circle-one"></div>
      <div className="auth-decoration circle-two"></div>
      <div className="auth-decoration circle-three"></div>
      <div className="dot-pattern dots-one"></div>
      <div className="dot-pattern dots-two"></div>

      <div className="auth-card">
        <div className="brand-logo">
          <svg viewBox="0 0 64 54" width="76" height="62" fill="none">
            <path
              d="M3 18L32 3L61 18L32 33L3 18Z"
              fill="url(#capGradient)"
            />
            <path
              d="M14 24V37C14 37 22 48 32 48C42 48 50 37 50 37V24L32 34L14 24Z"
              fill="#5736DF"
            />
            <path d="M59 19V36" stroke="#7655ED" strokeWidth="3" />
            <circle cx="59" cy="39" r="3" fill="#7655ED" />
            <defs>
              <linearGradient id="capGradient" x1="3" y1="3" x2="61" y2="33">
                <stop stopColor="#3526D9" />
                <stop offset="1" stopColor="#9147F4" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 className="brand-name">
          IntelliPrep <span>AI</span>
        </h1>
        <p className="brand-tagline">
          Prepare Smarter. Get Hired Faster.
        </p>

        <div className="auth-heading">
          <h2>Create Account</h2>
          <p>Join IntelliPrep AI</p>
        </div>

        <form onSubmit={handleRegister} className="auth-form">
          <div className="input-wrapper">
            <svg viewBox="0 0 24 24" className="field-icon">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21C4 16.5 7.5 14 12 14C16.5 14 20 16.5 20 21" />
            </svg>
            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="input-wrapper">
            <svg viewBox="0 0 24 24" className="field-icon">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 7L12 13L21 7" />
            </svg>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-wrapper">
            <svg viewBox="0 0 24 24" className="field-icon">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Create your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Toggle password visibility"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button type="submit" className="auth-button">
            Create Account
          </button>

          {message && <p className="auth-message">{message}</p>}
        </form>

        <div className="auth-switch">
          <span></span>
          <p>
            Already have an account? <Link to="/login">Login</Link>
          </p>
          <span></span>
        </div>
      </div>
    </div>
  );
}

export default Register;
