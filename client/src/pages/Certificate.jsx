
import React, { useEffect, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function Certificate() {
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState([]);
  const [certificate, setCertificate] = useState(null);
  const [certificateId, setCertificateId] = useState("");
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const response = await API.get("/certificate/interviews", {
        headers: { Authorization: `Bearer ${token}` }
      });

      setInterviews(response.data.interviews);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not load interviews."
      );
    } finally {
      setLoading(false);
    }
  };

  const generateCertificate = async (interviewId) => {
    try {
      setGenerating(true);
      setMessage("");

      const response = await API.post(
        "/certificate/generate",
        { interviewId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCertificate(response.data.certificate);
      setMessage(response.data.message);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Certificate generation failed."
      );
    } finally {
      setGenerating(false);
    }
  };

const downloadCertificate = async () => {
  const certificateElement = document.getElementById("certificate-print");

  if (!certificateElement) {
    setMessage("Certificate not found.");
    return;
  }

  try {
    const canvas = await html2canvas(certificateElement, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true
    });

    const image = canvas.toDataURL("image/png");

    const pdf = new jsPDF("landscape", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(image, "PNG", 0, 0, pageWidth, pageHeight);

    pdf.save(`IntelliPrep-Certificate-${certificate.certificateId}.pdf`);
  } catch (error) {
    console.error("Certificate PDF error:", error);
    setMessage("Could not download certificate. Please try again.");
  }
};

  const verifyCertificate = async (e) => {
    e.preventDefault();
    setVerification(null);

    if (!certificateId.trim()) {
      setMessage("Please enter a Certificate ID.");
      return;
    }

    try {
      const response = await API.get(
        `/certificate/verify/${encodeURIComponent(certificateId.trim())}`
      );

      setVerification(response.data);
    } catch (error) {
      setVerification({
        verified: false,
        message:
          error.response?.data?.message || "Certificate verification failed."
      });
    }
  };

  return (
    <div className="certificate-page">
      <header className="resume-header">
        <div>
          <h2>🎓 IntelliPrep <span>AI</span></h2>
          <p>Certificate Center</p>
        </div>

        <button onClick={() => navigate("/dashboard")}>
          ← Dashboard
        </button>
      </header>

      <main className="resume-content">
        <section className="resume-welcome">
          <p>YOUR ACHIEVEMENTS</p>
          <h1>Certificates</h1>
          <p>Generate and verify your AI interview assessment certificates.</p>
        </section>

        <section className="resume-details">
          <h2>My Interview Results</h2>
          <p className="details-description">
            Select an eligible completed interview to generate your certificate.
          </p>

          {loading ? (
            <p>Loading interviews...</p>
          ) : interviews.length === 0 ? (
            <p>No completed interviews found. Complete an interview first.</p>
          ) : (
            interviews.map((item) => (
              <div className="selected-resume" key={item._id}>
                <div>
                  <strong>{item.role}</strong>
                  <p>Score: {item.totalScore}/100</p>
                  <p>
                    {new Date(
                      item.completedAt || item.createdAt
                    ).toLocaleDateString()}
                  </p>
                </div>

                <button
                  className="analyze-button"
                  disabled={generating || item.totalScore < 50}
                  onClick={() => generateCertificate(item._id)}
                >
                  {generating
                    ? "Generating..."
                    : item.totalScore < 50
                    ? "Not Eligible"
                    : "Generate Certificate"}
                </button>
              </div>
            ))
          )}

          {message && <p className="resume-message">{message}</p>}
        </section>

        {certificate && (
          <section className="certificate-card">
            <div className="certificate-content" id="certificate-print">
              <p>INTELLIPREP AI</p>
              <h1>Certificate of Achievement</h1>
              <p>This certificate is proudly presented to</p>

              <h2>{certificate.candidateName}</h2>

              <p>
                For successfully completing a simulated AI interview
                assessment for the role of:
              </p>

              <h3>{certificate.role}</h3>

              <h2>{certificate.score}/100</h2>
              <p>{certificate.level} Level</p>

              <p>
                Certificate ID: {certificate.certificateId}
              </p>

              <p>
                Issued on:{" "}
                {new Date(certificate.issuedAt).toLocaleDateString()}
              </p>

              <p className="certificate-disclaimer">
                This certificate represents an AI-based simulated interview
                assessment. It is not an official industry certification.
              </p>
            </div>

            <button
  className="analyze-button"
  onClick={downloadCertificate}
>
  Download Certificate PDF ↓
</button>
          </section>
        )}

<section className="resume-details">
  <h2>🏆 Certificate Eligibility Criteria</h2>

  <p className="details-description">
    Complete an AI mock interview and achieve at least 50 marks
    to earn your assessment certificate.
  </p>

  <div className="selected-resume">
    <div>
      <strong>50–69 Marks</strong>
      <p>Completion Certificate</p>
    </div>
    <span>✓ Eligible</span>
  </div>

  <div className="selected-resume">
    <div>
      <strong>70–84 Marks</strong>
      <p>Proficiency Certificate</p>
    </div>
    <span>✓ Eligible</span>
  </div>

  <div className="selected-resume">
    <div>
      <strong>85–100 Marks</strong>
      <p>Excellence Certificate</p>
    </div>
    <span>✓ Eligible</span>
  </div>

  <div className="selected-resume">
    <div>
      <strong>Below 50 Marks</strong>
      <p>Certificate not available</p>
    </div>
    <span>Not Eligible</span>
  </div>
</section>

        <section className="resume-details">
          <h2>Verify a Certificate</h2>
          <p className="details-description">
            Enter a Certificate ID to check its authenticity.
          </p>

          <form onSubmit={verifyCertificate}>
            <input
              type="text"
              value={certificateId}
              onChange={(e) => setCertificateId(e.target.value)}
              placeholder="Enter Certificate ID"
            />

            <button className="analyze-button" type="submit">
              Verify Certificate
            </button>
          </form>

          {verification && (
            <div className="resume-result">
              <div>
                <h3>
                  {verification.verified
                    ? "✓ Certificate Verified"
                    : "✕ Verification Failed"}
                </h3>
                <p>{verification.message}</p>

                {verification.certificate && (
                  <>
                    <p>
                      Candidate: {verification.certificate.candidateName}
                    </p>
                    <p>Role: {verification.certificate.role}</p>
                    <p>Score: {verification.certificate.score}/100</p>
                    <p>Level: {verification.certificate.level}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Certificate;
