import React, { useState } from 'react';
import './MainMenu.css';
import { generateDailyReport } from '../services/sheetsService';

const MainMenu = ({ currentUser, onLogout, onNavigate }) => {
  const [isLoading, setIsLoading] = useState(false);

  const getUserName = () => {
    if (typeof currentUser === 'string') return currentUser;
    if (currentUser && currentUser.name) return currentUser.name;
    return 'Unknown';
  };

  const getLoginDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const isAdmin = () => {
    if (currentUser && currentUser.isAdmin) return true;
    if (currentUser && currentUser.role === 'admin') return true;
    return false;
  };

  const handleNavigate = (screen) => {
    onNavigate(screen);
  };

  const handleDailyReportClick = async () => {
    if (!window.confirm('当日実績報告をメール送信します。\n(wakasayoshifumi@gmail.com)\n\nよろしいですか？')) {
      return;
    }

    setIsLoading(true);

    try {
      console.log('📤 当日実績報告を実行中...');
      const result = await generateDailyReport();
      
      if (result.success) {
        alert('✅ ' + result.message);
        console.log('✅ 当日実績報告完了');
      } else {
        alert('❌ エラー: ' + result.message);
        console.error('❌ 当日実績報告失敗:', result.message);
      }
    } catch (error) {
      console.error('❌ 当日実績報告エラー:', error);
      alert('❌ エラーが発生しました: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-menu">
      <div className="menu-header">
        <div className="logo-section">
          <div className="logo">TKMサポート</div>
          <div className="logo-subtitle">by-KMT</div>
        </div>
        <div className="user-info">
          <div className="user-info-label">ログインユーザー: {getUserName()}</div>
          <div className="user-info-label">ログイン年月日: {getLoginDateTime()}</div>
        </div>
      </div>

      <div className="menu-content">
        <h2 className="menu-title">メインメニュー</h2>
        
        <div className="menu-buttons">
          <button
            className="menu-btn"
            onClick={() => handleNavigate('parts-list')}
            disabled={isLoading}
          >
            FRAT貼付け管理
          </button>

          <button
            className="menu-btn"
            onClick={handleDailyReportClick}
            disabled={isLoading}
          >
            {isLoading ? '送信中...' : '当日実績報告'}
          </button>

          <button
            className="menu-btn"
            onClick={() => handleNavigate('location-search')}
            disabled={isLoading}
          >
            仮置場検索（開発中）
          </button>

          <button
            className="menu-btn"
            onClick={() => handleNavigate('shift-check')}
            disabled={isLoading}
          >
            サポートチームシフト確認（開発中）
          </button>

          {isAdmin() && (
            <>
              <button
                className="menu-btn admin-btn"
                onClick={() => handleNavigate('admin-settings')}
                disabled={isLoading}
              >
                管理者設定
              </button>

              <button
                className="menu-btn admin-btn"
                onClick={() => handleNavigate('deletion-history')}
                disabled={isLoading}
              >
                削除履歴
              </button>
            </>
          )}
        </div>

        <button className="logout-btn" onClick={onLogout} disabled={isLoading}>
          ログアウト
        </button>
      </div>
    </div>
  );
};

export default MainMenu;
