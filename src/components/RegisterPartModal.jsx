import React, { useState, useEffect } from 'react';
import { getSerialPrefixes, getStatusA, getStatusB, sendNewLocationRequestEmail, addPart } from '../services/sheetsService';
import '../styles/RegisterPartModal.css';

const RegisterPartModal = ({ locationMaster, onSubmit, onCancel, isLoading, currentUser }) => {
  const [serialPrefixes, setSerialPrefixes] = useState([]);
  const [statusAOptions, setStatusAOptions] = useState([]);
  const [statusBOptions, setStatusBOptions] = useState([]);
  const [serialPrefix, setSerialPrefix] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [serialSuffix, setSerialSuffix] = useState('');
  const [location, setLocation] = useState('');
  const [locationData, setLocationData] = useState(null);
  const [statusA, setStatusA] = useState('');
  const [statusB, setStatusB] = useState('');
  const [notes, setNotes] = useState('');
  const [directInputOpen, setDirectInputOpen] = useState(false);
  const [directInputValue, setDirectInputValue] = useState('');
  const [prefixDropdownOpen, setPrefixDropdownOpen] = useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [statusADropdownOpen, setStatusADropdownOpen] = useState(false);
  const [statusBDropdownOpen, setStatusBDropdownOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showNewLocationDialog, setShowNewLocationDialog] = useState(false);
  const [newLocationBuilding, setNewLocationBuilding] = useState('');
  const [newLocationFloor, setNewLocationFloor] = useState('');
  const [newLocationArea, setNewLocationArea] = useState('');
  const [newLocationPillar, setNewLocationPillar] = useState('');
  const [newLocationCategory, setNewLocationCategory] = useState('');
  const [sendingLocationRequest, setSendingLocationRequest] = useState(false);

  const suffixOptions = ['', 'A', 'B', 'C', 'D', 'E'];
  const restrictedStatusBItems = ['FRAT/送り状貼付け済み', 'FRATのみ貼付け済み', '送り状のみ貼付け済み'];
  const allowedStatusAForRestrictedB = ['使用済みパーツ', 'その他', '未使用返却', 'DOA'];

  useEffect(() => {
    loadMasters();
  }, []);

  const loadMasters = async () => {
    try {
      const prefixes = await getSerialPrefixes();
      const statusesA = await getStatusA();
      const statusesB = await getStatusB();
      setSerialPrefixes(prefixes);
      setStatusAOptions(statusesA);
      setStatusBOptions(statusesB);
    } catch (error) {
      console.error('Error loading masters:', error);
    }
  };

  const handleNumberClick = (num) => {
    setSerialNumber(prev => prev + num);
  };

  const handleSuffixClick = (suffix) => {
    setSerialSuffix(suffix);
  };

  const handleBackspace = () => {
    setSerialNumber(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setSerialPrefix('');
    setSerialNumber('');
    setSerialSuffix('');
    setLocation('');
    setLocationData(null);
    setStatusA('');
    setStatusB('');
    setNotes('');
    setDirectInputValue('');
  };

  const handleDirectInputSubmit = () => {
    if (directInputValue.trim()) {
      setSerialPrefix(directInputValue.trim());
      setDirectInputValue('');
      setDirectInputOpen(false);
    }
  };

  const isStatusBDisabled = (statusBItem) => {
    if (!restrictedStatusBItems.includes(statusBItem)) {
      return false;
    }
    return !allowedStatusAForRestrictedB.includes(statusA);
  };

  const handleOpenNewLocationDialog = () => {
    setNewLocationBuilding('');
    setNewLocationFloor('');
    setNewLocationArea('');
    setNewLocationPillar('');
    setNewLocationCategory('');
    setShowNewLocationDialog(true);
  };

  const handleSendNewLocationRequest = async () => {
    if (!newLocationBuilding.trim() || !newLocationFloor.trim() || !newLocationArea.trim() || !newLocationPillar.trim() || !newLocationCategory.trim()) {
      alert('すべてのフィールドを入力してください');
      return;
    }

    setSendingLocationRequest(true);
    
    try {
      const locationInfo = `棟: ${newLocationBuilding}, 階: ${newLocationFloor}, 外周/CR: ${newLocationArea}, 柱番号: ${newLocationPillar}, 区分: ${newLocationCategory}`;
      const result = await sendNewLocationRequestEmail(locationInfo, currentUser?.userId || 'Unknown');
      
      if (result.success) {
        alert('✅ 新規仮置き場所登録依頼を管理者に送信しました');
        setShowNewLocationDialog(false);
        setNewLocationBuilding('');
        setNewLocationFloor('');
        setNewLocationArea('');
        setNewLocationPillar('');
        setNewLocationCategory('');
      } else {
        alert('❌ エラー: ' + result.message);
      }
    } catch (error) {
      console.error('❌ 新規仮置き場所登録依頼エラー:', error);
      alert('❌ エラーが発生しました');
    } finally {
      setSendingLocationRequest(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!serialPrefix.trim()) newErrors.serialPrefix = 'シリアル頭文字を選択してください';
    if (!serialNumber.trim()) newErrors.serialNumber = 'シリアル番号を入力してください';
    if (!location.trim()) newErrors.location = '場所を選択してください';
    if (!locationData) newErrors.location = '場所のデータが不正です';
    if (!statusA) newErrors.statusA = 'ステータスAを選択してください';
    if (!statusB) newErrors.statusB = 'ステータスBを選択してください';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      const fullSerial = `${serialPrefix}${serialNumber}${serialSuffix}`;

      const payload = {
        data: {
          serialNumber: fullSerial,
          building: locationData.building,
          floor: locationData.floor,
          division1: locationData.division1,
          pillarNumber: locationData.pillarNumber,
          division2: locationData.division2,
          statusA: statusA,
          statusB: statusB,
          registeredBy: currentUser?.name || 'Unknown',
          notes: notes
        }
      };

      const result = await addPart(payload);
      
      if (result.success) {
        await onSubmit(payload);
        handleClear();
        setErrors({});
      } else {
        alert('❌ ' + (result.message || '登録に失敗しました'));
        setErrors({ submit: result.message || '登録に失敗しました' });
      }
    } catch (error) {
      setErrors({ submit: error.message || '登録に失敗しました' });
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isProcessing = isLoading || isSubmitting;
  const fullSerial = `${serialPrefix}${serialNumber}${serialSuffix}`;

  const handleLocationSelect = (locObject) => {
    setLocation(locObject.display);
    setLocationData(locObject);
    setLocationDropdownOpen(false);
  };

  return (
    <div className="keyboard-overlay">
      <div className="keyboard-container">
        <div className="keyboard-header">
          <h1>新規パーツ登録</h1>
          {currentUser && (
            <div className="user-info">
              記録者: <strong>{currentUser.name}</strong>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <div className="form-section">
            <label className="section-label">シリアル頭文字</label>
            <div className="custom-dropdown-wrapper">
              <button
                className="custom-dropdown-toggle"
                onClick={() => setPrefixDropdownOpen(!prefixDropdownOpen)}
                disabled={isProcessing}
              >
                {serialPrefix || 'プルダウンで選択'}
              </button>
              {prefixDropdownOpen && (
                <div className="custom-dropdown-menu" style={{ top: `${document.querySelector('.custom-dropdown-toggle')?.getBoundingClientRect().bottom}px`, left: `${document.querySelector('.custom-dropdown-toggle')?.getBoundingClientRect().left}px`, width: `${document.querySelector('.custom-dropdown-toggle')?.getBoundingClientRect().width}px` }}>
                  {serialPrefixes.length > 0 ? (
                    serialPrefixes.map((prefix, index) => (
                      <div
                        key={index}
                        className="custom-dropdown-item"
                        onClick={() => {
                          setSerialPrefix(prefix);
                          setPrefixDropdownOpen(false);
                          if (errors.serialPrefix) setErrors({ ...errors, serialPrefix: '' });
                        }}
                      >
                        {prefix}
                      </div>
                    ))
                  ) : (
                    <div className="custom-dropdown-item">読み込み中...</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <label className="section-label">シリアル番号</label>
            <div className="serial-display" onClick={() => setDirectInputOpen(true)}>
              <div className="serial-input">
                {fullSerial || 'ここにシリアルが出る'}
              </div>
              <div className="serial-hint">(タップして直接入力)</div>
            </div>

            {directInputOpen && (
              <div className="direct-input-overlay">
                <div className="direct-input-box">
                  <input
                    type="text"
                    className="direct-input-field"
                    value={directInputValue}
                    onChange={(e) => setDirectInputValue(e.target.value.toUpperCase())}
                    placeholder="シリアルを入力"
                    autoFocus
                  />
                  <div className="direct-input-buttons">
                    <button className="btn-confirm-input" onClick={handleDirectInputSubmit}>確定</button>
                    <button className="btn-cancel-input" onClick={() => setDirectInputOpen(false)}>キャンセル</button>
                  </div>
                </div>
              </div>
            )}

            <div className="number-pad">
              <div className="pad-row">
                <button className="pad-btn" onClick={() => handleNumberClick('1')} disabled={isProcessing}>1</button>
                <button className="pad-btn" onClick={() => handleNumberClick('2')} disabled={isProcessing}>2</button>
                <button className="pad-btn" onClick={() => handleNumberClick('3')} disabled={isProcessing}>3</button>
                <button className="pad-btn" onClick={() => handleNumberClick('4')} disabled={isProcessing}>4</button>
                <button className="pad-btn" onClick={() => handleNumberClick('5')} disabled={isProcessing}>5</button>
              </div>
              <div className="pad-row">
                <button className="pad-btn" onClick={() => handleNumberClick('6')} disabled={isProcessing}>6</button>
                <button className="pad-btn" onClick={() => handleNumberClick('7')} disabled={isProcessing}>7</button>
                <button className="pad-btn" onClick={() => handleNumberClick('8')} disabled={isProcessing}>8</button>
                <button className="pad-btn" onClick={() => handleNumberClick('9')} disabled={isProcessing}>9</button>
                <button className="pad-btn" onClick={() => handleNumberClick('0')} disabled={isProcessing}>0</button>
              </div>
            </div>

            <label className="section-label" style={{ marginTop: '16px' }}>アルファベット末尾</label>
            <div className="suffix-buttons">
              {suffixOptions.map((suffix) => (
                <button
                  key={suffix}
                  className={`suffix-btn ${serialSuffix === suffix ? 'active' : ''}`}
                  onClick={() => handleSuffixClick(suffix)}
                  disabled={isProcessing}
                >
                  {suffix || 'なし'}
                </button>
              ))}
            </div>

            <div className="action-buttons">
              <button className="btn-backspace" onClick={handleBackspace} disabled={isProcessing}>← BACKSPACE</button>
              <button className="btn-clear" onClick={handleClear} disabled={isProcessing}>クリア</button>
            </div>
          </div>

          <div className="form-section">
            <label className="section-label">場所</label>
            <div className="custom-dropdown-wrapper">
              <button
                className="custom-dropdown-toggle"
                onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
                disabled={isProcessing}
              >
                {location || 'プルダウンで選択'}
              </button>
              {locationDropdownOpen && locationMaster && locationMaster.length > 0 && (
                <div className="custom-dropdown-menu" style={{ top: `${document.querySelector('.custom-dropdown-toggle')?.getBoundingClientRect().bottom}px`, left: `${document.querySelector('.custom-dropdown-toggle')?.getBoundingClientRect().left}px`, width: `${document.querySelector('.custom-dropdown-toggle')?.getBoundingClientRect().width}px` }}>
                  {locationMaster.map((item, index) => (
                    <div
                      key={index}
                      className="custom-dropdown-item"
                      onClick={() => {
                        if (typeof item === 'object' && item.display) {
                          handleLocationSelect(item);
                        } else {
                          setLocation(item);
                          setLocationDropdownOpen(false);
                        }
                      }}
                    >
                      {typeof item === 'object' && item.display ? item.display : item}
                    </div>
                  ))}
                  <div
                    className="custom-dropdown-item"
                    onClick={handleOpenNewLocationDialog}
                    style={{
                      backgroundColor: '#e8f5e9',
                      color: '#2e7d32',
                      fontWeight: 'bold',
                      borderTop: '2px solid #c8e6c9'
                    }}
                  >
                    ➕ 新規場所を登録
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <label className="section-label">ステータスA</label>
            <div className="custom-dropdown-wrapper">
              <button
                className="custom-dropdown-toggle"
                onClick={() => setStatusADropdownOpen(!statusADropdownOpen)}
                disabled={isProcessing}
              >
                {statusA || 'プルダウンで選択'}
              </button>
              {statusADropdownOpen && (
                <div className="custom-dropdown-menu" style={{ top: `${document.querySelector('.custom-dropdown-toggle')?.getBoundingClientRect().bottom}px`, left: `${document.querySelector('.custom-dropdown-toggle')?.getBoundingClientRect().left}px`, width: `${document.querySelector('.custom-dropdown-toggle')?.getBoundingClientRect().width}px` }}>
                  {statusAOptions.map((option, index) => (
                    <div
                      key={index}
                      className="custom-dropdown-item"
                      onClick={() => {
                        setStatusA(option);
                        setStatusADropdownOpen(false);
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <label className="section-label">ステータスB</label>
            <div className="custom-dropdown-wrapper">
              <button
                className="custom-dropdown-toggle"
                onClick={() => setStatusBDropdownOpen(!statusBDropdownOpen)}
                disabled={isProcessing}
              >
                {statusB || 'プルダウンで選択'}
              </button>
              {statusBDropdownOpen && (
                <div className="custom-dropdown-menu" style={{ top: `${document.querySelector('.custom-dropdown-toggle')?.getBoundingClientRect().bottom}px`, left: `${document.querySelector('.custom-dropdown-toggle')?.getBoundingClientRect().left}px`, width: `${document.querySelector('.custom-dropdown-toggle')?.getBoundingClientRect().width}px` }}>
                  {statusBOptions.map((option, index) => (
                    <div
                      key={index}
                      className={`custom-dropdown-item ${isStatusBDisabled(option) ? 'disabled-item' : ''}`}
                      onClick={() => {
                        if (!isStatusBDisabled(option)) {
                          setStatusB(option);
                          setStatusBDropdownOpen(false);
                        }
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <label className="section-label">備考（任意）</label>
            <textarea
              className="notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="備考があればここに入力してください"
              disabled={isProcessing}
              rows="3"
            />
          </div>

          {errors.submit && (
            <div className="error-alert">
              <p className="error-message">⚠️ {errors.submit}</p>
            </div>
          )}
        </div>

        <div className="action-buttons-main">
          <button
            className="btn-submit"
            onClick={handleSubmit}
            disabled={isProcessing || !serialPrefix || !serialNumber || !location || !statusA || !statusB}
          >
            {isProcessing ? '登録中...' : '登録'}
          </button>
          <button className="btn-cancel" onClick={onCancel} disabled={isProcessing}>
            キャンセル
          </button>
        </div>
      </div>

      {showNewLocationDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 'bold' }}>
              📍 新規仮置き場所登録依頼
            </h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
                棟
              </label>
              <input
                type="text"
                value={newLocationBuilding}
                onChange={(e) => setNewLocationBuilding(e.target.value)}
                placeholder="例: Y2、Y4"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
                階
              </label>
              <input
                type="text"
                value={newLocationFloor}
                onChange={(e) => setNewLocationFloor(e.target.value)}
                placeholder="例: 2階、3階"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
                外周/CR
              </label>
              <input
                type="text"
                value={newLocationArea}
                onChange={(e) => setNewLocationArea(e.target.value)}
                placeholder="例: 外周"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
                柱番号
              </label>
              <input
                type="text"
                value={newLocationPillar}
                onChange={(e) => setNewLocationPillar(e.target.value)}
                placeholder="例: E(東)35"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
                区分
              </label>
              <input
                type="text"
                value={newLocationCategory}
                onChange={(e) => setNewLocationCategory(e.target.value)}
                placeholder="例: 共用/入出荷"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleSendNewLocationRequest}
                disabled={sendingLocationRequest}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                {sendingLocationRequest ? '送信中...' : '📧 登録依頼を送信'}
              </button>
              <button
                onClick={() => setShowNewLocationDialog(false)}
                disabled={sendingLocationRequest}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#ccc',
                  color: '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPartModal;
