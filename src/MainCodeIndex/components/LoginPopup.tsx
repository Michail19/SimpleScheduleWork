import React, {useEffect, useState} from 'react';
import {translations} from "../translations";
import {Language} from "../types";

interface LoginPopupProps {
    onClose: () => void;
    onLoginSuccess: (token: string) => void;
    currentTranslation: typeof translations[Language];
}

const LoginPopup: React.FC<LoginPopupProps> = ({ onClose, onLoginSuccess, currentTranslation }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showLoadingMessage, setShowLoadingMessage] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('https://ssw-backend-django.onrender.com/auth/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                throw new Error(`${currentTranslation.invalidCredentials}`);
            }

            const data = await response.json();
            const token = data.token;

            // Сохраняем токен
            localStorage.setItem('authToken', token);
            onLoginSuccess(token);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : `${currentTranslation.unknownError}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (loading) {
            const timer = setTimeout(() => {
                setShowLoadingMessage(true);
            }, 3000);

            return () => {
                clearTimeout(timer);
                setShowLoadingMessage(false); // Скрывать сообщение при отмене
            };
        }
    }, [loading]);


    return (
        <div className="login-popup">
            <div className="login-content">
                <h2>{currentTranslation.login}</h2>
                <form onSubmit={handleLogin}>
                    <input
                        type="text"
                        placeholder={currentTranslation.usernamePlaceholder}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder={currentTranslation.passwordPlaceholder}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    {error && <p className="error">{error}</p>}
                    <button type="submit" disabled={loading}>
                        {loading ? (
                            <span className="loading-wrapper">
                                <span className="loading-dot">.</span>
                                <span className="loading-dot">.</span>
                                <span className="loading-dot">.</span>
                            </span>
                        ) : `${currentTranslation.loginButton}`}
                    </button>
                </form>
                <button onClick={onClose}>{currentTranslation.cancelButton}</button>

                {/* Сообщение о долгой загрузке */}
                {loading && (
                    <div className={`loading-message ${showLoadingMessage ? 'visible' : ''}`}>
                        {currentTranslation.loadingSlowMessage}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginPopup;
