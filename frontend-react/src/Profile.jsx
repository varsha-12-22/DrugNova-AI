import { useState } from 'react';
import { User, Mail, Beaker, Save, LogOut, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

const API_BASE = "http://localhost:8000";

const PURPOSE_OPTIONS = [
    "Academic Research",
    "Drug Discovery",
    "Healthcare Professional",
    "Personal Learning"
];

const PURPOSE_ICONS = {
    "Academic Research": "🔬",
    "Drug Discovery": "💊",
    "Healthcare Professional": "🏥",
    "Personal Learning": "📚"
};

export default function Profile({ user, onUpdate, onLogout, onBack }) {
    const [name, setName] = useState(user.name);
    const [purpose, setPurpose] = useState(user.purpose);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const handleSave = async () => {
        setLoading(true);
        setMessage(null);
        setError(null);
        try {
            const token = localStorage.getItem('drugnova_token');
            const res = await fetch(`${API_BASE}/update-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, purpose })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Failed to update profile');

            localStorage.setItem('drugnova_token', data.token);
            localStorage.setItem('drugnova_user', JSON.stringify({
                name: data.name,
                email: data.email,
                purpose: data.purpose
            }));

            onUpdate({ name: data.name, email: data.email, purpose: data.purpose });
            setMessage("Profile updated successfully!");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="profile-page fade-in">
            <div className="profile-container">
                <button className="back-link" onClick={onBack}>
                    <ArrowLeft size={18} /> Back to Dashboard
                </button>

                <div className="profile-card glass">
                    <div className="profile-header">
                        <div className="profile-avatar">
                            <User size={40} />
                        </div>
                        <div className="profile-title">
                            <h2>User Profile</h2>
                            <p>Manage your account settings and preferences</p>
                        </div>
                    </div>

                    <div className="profile-form">
                        <div className="input-group-row">
                            <label><Mail size={16} /> Email Address</label>
                            <input type="text" value={user.email} disabled className="disabled-input" />
                            <p className="input-hint">Email cannot be changed</p>
                        </div>

                        <div className="input-group-row">
                            <label><User size={16} /> Full Name</label>
                            <input 
                                type="text" 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                placeholder="Enter your name"
                            />
                        </div>

                        <div className="input-group-row">
                            <label><Beaker size={16} /> Primary Purpose</label>
                            <div className="purpose-select-grid">
                                {PURPOSE_OPTIONS.map(p => (
                                    <button
                                        key={p}
                                        className={`purpose-select-btn ${purpose === p ? 'active' : ''}`}
                                        onClick={() => setPurpose(p)}
                                    >
                                        <span className="p-icon">{PURPOSE_ICONS[p]}</span>
                                        <span className="p-text">{p}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {message && (
                            <div className="profile-message success">
                                <CheckCircle2 size={18} /> {message}
                            </div>
                        )}

                        {error && (
                            <div className="profile-message error">
                                <AlertCircle size={18} /> {error}
                            </div>
                        )}

                        <div className="profile-actions">
                            <button 
                                className="save-btn" 
                                onClick={handleSave} 
                                disabled={loading || (name === user.name && purpose === user.purpose)}
                            >
                                {loading ? "Saving..." : <><Save size={18} /> Save Changes</>}
                            </button>
                            <button className="logout-action-btn" onClick={onLogout}>
                                <LogOut size={18} /> Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
