import React, { useState, useEffect } from 'react';
import { getStatusA, getStatusB, getLocationMaster, checkFratExists, sendDeletionRequestEmail } from '../services/sheetsService';
import './PartsListView.css';

const EditPartModal = ({ part, onClose, onSubmit, currentUser }) => {
  const [location, setLocation] = useState('');
  const [statusA, setStatusA] = useState('');
  const [statusB, setStatusB] = useState('');
  const [notes, setNotes] = useState('');
  const [statusAOptions, setStatusAOptions] = useState([]);
  const [statusBOptions, setStatusBOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // ===== FRAT 関連 State（v4 で追加） =====
  const [fratStatus, setFratStatus] = useState(null);
  const [fratChecking, setFratChecking] = useState(false);
  const [showFratWarning, setShowFratWarning] = useState(false);
  const [fratConfirmAction, setFratConfirmAction] = useState(null);

  const restrictedStatusBItems = ['FRAT/送り状貼付け済み', 'FRATのみ貼付け済み', '送り状のみ貼付け済み'];
  const allowedStatusAForRestrictedB = ['使用済みパーツ', 'その他', '未使用返却', 'DOA'];

  useEffect(() => {
    if (part) {
      setLocation(`${part.building}-${part.floor}-${part.area}_${part.pillar}(${part.category})`);
      setStatusA(part.statusA || '');
      setStatusB(part.statusB || '');
      setNotes(part.notes || '');
      // FRAT ステータス確認（v4 で追加）
      checkFratStatus();
    }
    loadMasters();
  }, [part]);

  const loadMasters = async () => {
    try {
      const statusesA = await getStatusA();
      const statusesB = await getStatusB();
      const locations = await getLocationMaster();
      setStatusAOptions(statusesA);
      setStatusBOptions(statusesB);
      setLocationOptions(locations);
      setLoading(false);
    } catch (error) {
      console.error('Error loading masters:', error);
      setLoading(false);
    }
  };

  // ===== FRAT 確認ロジック（v4 で追加） =====
  const checkFratStatus = async () => {
    if (!part || !part.serial) return;
    
    setFratChecking(true);
    try {
      const result = await checkFratExists(part.serial);
      setFratStatus(result);
      console.log('📊 FRAT ステータス確認完了:', part.serial, result);
    } catch (error) {
      console.error('❌ FRAT 確認エラー:', error);
      setFratStatus({ exists: false, frat: null });
    }
    setFratChecking(false);
  };

  const isFratRelatedStatus = (statusBValue) => {
    return restrictedStatusBItems.includes(statusBValue);
  };

  const isStatusBDisabled = (statusBItem) => {
    if (!restrictedStatusBItems.includes(statusBItem)) {
      return false;
    }
    return !allowedStatusAForRestrictedB.includes(statusA);
  };

  const parseLocation = (locationString) => {
    const regex = /^([A-Z0-9]+)-(\d+[A-Z]?)-([^_]+)_([A-Z0-9]+)\(([^)]+)\)$/;
    const match = locationString.match(regex);
    if (match) {
      return {
        building: match[1],
        floor: match[2],
        area: match[3],
        pillar: match[4],
        category: match[5]
      };
    }
    return null;
  };

  // ===== FRAT 確認ロジック（v4 で追加） =====
  const handleStatusBChange = (newStatusB) => {
    setStatusB(newStatusB);
    setShowFratWarning(false);

    // FRAT 関連ステータスに変更する場合、FRAT 確認
    if (isFratRelatedStatus(newStatusB) && fratStatus && !fratStatus.exists) {
      console.log('⚠️ FRAT未発行のまま FRAT関連ステータスに変更しようとしています');
      setShowFratWarning(true);
      setFratConfirmAction('frat_missing');
    }
  };

  const handleSendDeletionRequest = async () => {
    console.log('📧 削除依頼メール送信開始:', part.serial);
    try {
      const result = await sendDeletionRequestEmail(part.serial, statusA, currentUser?.userId || 'Unknown');
      if (result.success) {
        alert('✅ 削除依頼メールを管理者に送信しました');
        setShowFratWarning(false);
      } else {
        alert('❌ エラー: ' + result.message);
      }
    } catch (error) {
      console.error('❌ メール送信エラー:', error);
      alert('❌ エラーが発生しました');
    }
  };

  const handleConfirm = () => {
    if (!location || !statusA || !statusB) {
      alert('必須フィールドを入力してください');
      return;
    }

    const parsed = parseLocation(location);
    if (!parsed) {
      alert('場所のフォーマットが正しくありません');
      return;
    }

    // ===== FRAT確認警告の場合、ユーザー確認（v4 で追加） =====
    if (showFratWarning && isFratRelatedStatus(statusB)) {
      const confirmed = window.confirm(
        '⚠️ このパーツは FRAT が未発行です。\n削除依頼メール送信後、ステータスを更新しますか？'
      );
      if (confirmed) {
        handleSendDeletionRequest();
        // メール送信後、ステータス更新を続行
      } else {
        return; // キャンセル
      }
    }

    const payload = {
      rowIndex: part.rowIndex,
      serial: part.serial,
      building: parsed.building,
      floor: parsed.floor,
      area: parsed.area,
      pillar: parsed.pillar,
      category: parsed.category,
      statusA: statusA,
      statusB: statusB,
      notes: notes,
      user: currentUser?.userId || 'Unknown'
    };

    console.log('📤 Sending edit payload:', payload);
    onSubmit(payload);
  };

  if (!part) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>パーツ編集</h3>
        <p>シリアル: <strong>{part.serial}</strong></p>
        <p style={{ fontSize: '12px', color: '#666' }}>変更者: {currentUser?.userId || 'Unknown'}</p>

        {/* ===== FRAT ステータス表示（v4 で追加） ===== */}
        {!fratChecking && fratStatus && (
          <div style={{
            padding: '10px',
            marginBottom: '16px',
            borderRadius: '4px',
            backgroundColor: fratStatus.exists ? '#d4edda' : '#f8d7da',
            border: `1px solid ${fratStatus.exists ? '#c3e6cb' : '#f5c6cb'}`,
            fontSize: '13px',
            color: fratStatus.exists ? '#155724' : '#721c24'
          }}>
            {fratStatus.exists ? (
              <>✅ FRAT 発行済み</>
            ) : (
              <>❌ FRAT 未発行</>
            )}
          </div>
        )}

        {loading ? (
          <p>マスタデータを読み込み中...</p>
        ) : (
          <>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>場所</label>
              <select 
                value={location} 
                onChange={e => setLocation(e.target.value)}
                style={{ width: '100%', padding: '8px', fontSize: '14px' }}
              >
                <option value="">選択してください</option>
                {locationOptions.map((loc, index) => (
                  <option key={index} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>ステータスA</label>
              <select 
                value={statusA} 
                onChange={e => setStatusA(e.target.value)}
                style={{ width: '100%', padding: '8px', fontSize: '14px' }}
              >
                <option value="">選択してください</option>
                {statusAOptions.map((status, index) => (
                  <option key={index} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>ステータスB</label>
              <select 
                value={statusB} 
                onChange={e => handleStatusBChange(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  fontSize: '14px',
                  borderColor: showFratWarning ? '#f5c6cb' : '#ddd',
                  borderWidth: showFratWarning ? '2px' : '1px'
                }}
                disabled={statusA === ''}
              >
                <option value="">選択してください</option>
                {statusBOptions.map((status, index) => (
                  <option key={index} value={status} disabled={isStatusBDisabled(status)}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* ===== FRAT 警告メッセージ（v4 で追加） ===== */}
            {showFratWarning && fratConfirmAction === 'frat_missing' && (
              <div style={{
                padding: '10px',
                marginBottom: '12px',
                borderRadius: '4px',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                fontSize: '13px',
                color: '#856404'
              }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>
                  ⚠️ 注意: FRAT が未発行です
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  このパーツの削除依頼を管理者に送信することをお勧めします。
                </p>
                <button
                  onClick={handleSendDeletionRequest}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    backgroundColor: '#ff6b6b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  📧 削除依頼を送信
                </button>
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>備考</label>
              <textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                style={{ width: '100%', padding: '8px', fontSize: '14px', minHeight: '60px' }}
                placeholder="備考があればここに入力"
              />
            </div>
          </>
        )}

        <div className="modal-buttons">
          <button onClick={handleConfirm} style={{ backgroundColor: '#5B6FE0', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            更新
          </button>
          <button onClick={onClose} style={{ backgroundColor: '#ccc', color: '#333', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPartModal;
