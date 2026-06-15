import React, { useState } from 'react';
import './LoginScreen.css';
import * as crypto from 'crypto-js';

const LoginScreen = ({ onLogin }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const passwordHash = crypto.SHA256(password).toString();

      await fetch(
        'https://script.google.com/macros/s/AKfycbwpIrMliSVQYLa6KcMY1NUH1b_wFJPY_nF_FJ1np4hE0V2ylP2l3WSqJu0bqmSEcT_J/exec',
        {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'authenticateUser',
            userId: userId,
            passwordHash: passwordHash,
          }),
        }
      );

      console.log('✅ Authentication request sent');
      
      onLogin({
        userId: userId,
        name: userId,
        isAdmin: userId === 'U0001',
      });
    } catch (err) {
      console.error('❌ Login error:', err);
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-header">
          <h1>FRAT パーツ管理システム</h1>
          <p className="login-subtitle">ログイン</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="userId">ユーザーID</label>
            <input
              id="userId"
              type="text"
              placeholder="例: U0001"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              placeholder="パスワードを入力"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className="login-footer">
          <p className="test-account-info">
            テストアカウント: U0001 / 1111
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
