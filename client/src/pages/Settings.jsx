import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";

function Settings() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    name: "",
    email: ""
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  // Fetch Profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await API.get("/user/profile", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setProfile({
          name: response.data.user.name || "",
          email: response.data.user.email || ""
        });
      } catch (err) {
        setError(
          err.response?.data?.message || "Could not load profile."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  // Update Profile
  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const response = await API.put(
  "/user/profile",
  {
    name: profile.name,
    email: profile.email
  },
  {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
);

      const updatedUser = response.data.user;

localStorage.setItem("user", JSON.stringify(updatedUser));

setProfile({
  name: updatedUser.name,
  email: updatedUser.email
});

setMessage("Profile updated successfully!");
    } catch (err) {
      setError(
        err.response?.data?.message || "Profile update failed."
      );
    } finally {
      setSaving(false);
    }
  };

  // Change Password
  const handlePasswordChange = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (newPassword.length < 8) {
      setError("New password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    try {
      setChangingPassword(true);

      const response = await API.put(
        "/user/change-password",
        {
          currentPassword,
          newPassword
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setMessage(response.data.message);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

    } catch (err) {
      setError(
        err.response?.data?.message || "Password change failed."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (loading) {
    return <div className="settings-loading">Loading settings...</div>;
  }

  return (
    <div className="settings-page">

      <header className="settings-header">
        <div>
          <h1>Account Settings</h1>
          <p>Manage your profile and account security.</p>
        </div>

        <Link to="/dashboard" className="settings-back">
          ← Back to Dashboard
        </Link>
      </header>

      {message && (
        <div className="settings-success">
          {message}
        </div>
      )}

      {error && (
        <div className="settings-error">
          {error}
        </div>
      )}

      {/* Profile Section */}
      <section className="settings-card">

        <h2>👤 Profile Information</h2>

        <p>Update your personal account details.</p>

        <form onSubmit={handleProfileUpdate}>

          <label>Full Name</label>

          <input
            type="text"
            value={profile.name}
            onChange={(e) =>
              setProfile({
                ...profile,
                name: e.target.value
              })
            }
            placeholder="Enter your name"
            required
          />

          <label>Email Address</label>

          <input
  type="email"
  value={profile.email}
  onChange={(e) =>
    setProfile({ ...profile, email: e.target.value })
  }
  required
/>

          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </button>

        </form>
      </section>

      {/* Password Section */}
      <section className="settings-card">

        <h2>🔐 Change Password</h2>

        <p>Keep your account secure with a strong password.</p>

        <form onSubmit={handlePasswordChange}>

          <label>Current Password</label>

          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            required
          />

          <label>New Password</label>

          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            minLength={8}
            required
          />

          <label>Confirm New Password</label>

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
          />

          <button type="submit" disabled={changingPassword}>
            {changingPassword ? "Updating..." : "Change Password"}
          </button>

        </form>
      </section>

      {/* Account Section */}
      <section className="settings-card logout-card">

        <h2>🚪 Account</h2>

        <p>Sign out from your IntelliPrep AI account.</p>

        <button onClick={handleLogout}>
          Logout
        </button>

      </section>

    </div>
  );
}

export default Settings;