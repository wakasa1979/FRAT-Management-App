import React, { useState } from 'react';
import '../styles/SearchModal.css';
import { sheetsService } from '../services/sheetsService';

export const SearchModal = ({ isOpen, onClose, onSelectPart }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

  // ==================== 検索実行 ====================
  const handleSearch = async (query) => {
    setSearchQuery(query);

    if (query.trim().length === 0) {
      setSearchResults([]);
      setSelectedResult(null);
      return;
    }

    setIsSearching(true);
    try {
      const results = await sheetsService.searchPartsByPartialMatch(query);
      setSearchResults(results);
      setSelectedResult(null);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // ==================== パーツ選択 ====================
  const handleSelectPart = (part) => {
    setSelectedResult(part);
  };

  // ==================== 確定ボタン ====================
  const handleConfirm = () => {
    if (selectedResult) {
      onSelectPart(selectedResult);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedResult(null);
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        {/* ==================== ヘッダー ==================== */}
        <div className="search-modal-header">
          <h2>シリアル検索</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* ==================== 検索入力 ==================== */}
        <div className="search-modal-input-section">
          <input
            type="text"
            placeholder="シリアルナンバーを入力（部分一致対応）"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
            className="search-input"
          />
          <small className="search-hint">例：「B4L」「777」「user001」で検索可能</small>
        </div>

        {/* ==================== 検索結果 ==================== */}
        <div className="search-modal-results">
          {isSearching && <div className="loading">検索中...</div>}

          {!isSearching && searchResults.length === 0 && searchQuery.trim().length > 0 && (
            <div className="no-results">
              「{searchQuery}」に一致するパーツが見つかりません
            </div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="results-list">
              <div className="results-count">
                {searchResults.length} 件見つかりました
              </div>
              {searchResults.map((part, index) => (
                <div
                  key={index}
                  className={`result-item ${selectedResult === part ? 'selected' : ''}`}
                  onClick={() => handleSelectPart(part)}
                >
                  <div className="result-serial">{part.serial}</div>
                  <div className="result-info">
                    <span className={`status-badge status-${part.status}`}>
                      {part.status}
                    </span>
                    <span className="result-user">{part.user}</span>
                    <span className="result-date">{part.registeredDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ==================== 詳細表示 ==================== */}
        {selectedResult && (
          <div className="search-modal-detail">
            <h3>詳細情報</h3>
            <div className="detail-section">
              <div className="detail-row">
                <label>シリアル:</label>
                <span className="detail-serial">{selectedResult.serial}</span>
              </div>
              <div className="detail-row">
                <label>ステータス:</label>
                <span className={`status-badge status-${selectedResult.status}`}>
                  {selectedResult.status}
                </span>
              </div>
              <div className="detail-row">
                <label>登録者:</label>
                <span>{selectedResult.user}</span>
              </div>
              <div className="detail-row">
                <label>位置:</label>
                <span>{selectedResult.location || '未設定'}</span>
              </div>
              <div className="detail-row">
                <label>登録日:</label>
                <span>{selectedResult.registeredDate || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <label>備考:</label>
                <span>{selectedResult.notes || '-'}</span>
              </div>
            </div>

            {/* ==================== 移動履歴プレビュー ==================== */}
            <div className="history-preview">
              <h4>ステータス遷移候補</h4>
              <div className="transition-buttons">
                {sheetsService.getStatusTransitions()[selectedResult.status]?.map((status) => (
                  <span key={status} className="transition-badge">
                    → {status}
                  </span>
                )) || <span className="no-transitions">遷移不可</span>}
              </div>
            </div>
          </div>
        )}

        {/* ==================== フッター ==================== */}
        <div className="search-modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="btn-confirm"
            onClick={handleConfirm}
            disabled={!selectedResult}
          >
            この パーツを選択
          </button>
        </div>
      </div>
    </div>
  );
};
