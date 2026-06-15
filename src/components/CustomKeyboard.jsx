import React, { useState } from 'react';
import '../styles/CustomKeyboard.css';

const CustomKeyboard = ({ onSerialSubmit, onCancel, isLoading }) => {
  const [serial, setSerial] = useState('B4L-');
  const [selectedPrefix, setSelectedPrefix] = useState('B4L-');
  const [numbers, setNumbers] = useState('');
  const [letters, setLetters] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [directInputMode, setDirectInputMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const prefixes = [
    'B4L-',
    'MP-',
    'MPCIPCL-',
    'NCLBS-',
    'NFBS-',
    'NFEV2MP-',
    'NFMP-',
    'NFMPL-',
    'NFV2BS-',
    'NFV2M0MP-',
    'NFV2MP-',
    'YCLMP-',
    'YCLWOMP-',
    'Y-LIDNOZL-',
  ];

  const handlePrefixChange = (prefix) => {
    setSelectedPrefix(prefix);
    setNumbers('');
    setLetters('');
    setSerial(prefix);
    setDropdownOpen(false);
  };

  const handleNumberClick = (num) => {
    const newNumbers = numbers + num;
    setNumbers(newNumbers);
    setSerial(selectedPrefix + newNumbers + letters);
  };

  const handleLetterClick = (letter) => {
    const newLetters = letters + letter;
    setLetters(newLetters);
    setSerial(selectedPrefix + numbers + newLetters);
  };

  const handleBackSpace = () => {
    let newSerial = serial.slice(0, -1);
    setSerial(newSerial);
    
    if (newSerial.startsWith(selectedPrefix)) {
      const suffix = newSerial.slice(selectedPrefix.length);
      const lettersMatch = suffix.match(/[A-Z]+$/);
      if (lettersMatch) {
        setLetters(lettersMatch[0]);
        setNumbers(suffix.slice(0, -lettersMatch[0].length));
      } else {
        setNumbers(suffix);
        setLetters('');
      }
    }
  };

  const handleClear = () => {
    setNumbers('');
    setLetters('');
    setSerial(selectedPrefix);
  };

  const handleDirectInput = (e) => {
    const value = e.target.value.toUpperCase();
    setSerial(value);
  };

  const handleSubmit = () => {
    // 直接入力モードと通常モードで条件を分ける
    const isValid = directInputMode 
      ? serial.trim().length > 0
      : serial.length > selectedPrefix.length;
    
    if (isValid && !isLoading && !isSubmitting) {
      setIsSubmitting(true);
      onSerialSubmit(serial);
    }
  };

  const isProcessing = isLoading || isSubmitting;
  
  // 決定ボタンの有効/無効判定も直接入力モードで分ける
  const isSubmitDisabled = isProcessing || (
    directInputMode 
      ? !serial.trim().length
      : serial.length <= selectedPrefix.length
  );

  return (
    <div className="keyboard-overlay">
      <div className="keyboard-container">
        <div className="keyboard-header">
          <h2>シリアルナンバーを入力してください</h2>
        </div>

        <div className="serial-display">
          {directInputMode ? (
            <input
              type="text"
              className="serial-input-field"
              value={serial}
              onChange={handleDirectInput}
              placeholder="シリアルを入力"
              autoFocus
              maxLength="30"
              disabled={isProcessing}
            />
          ) : (
            <div className="serial-input">{serial}</div>
          )}

          <p className="serial-hint">
            ここに入力したシリアルが出る。
            <br />
            この部分に直接入力も可
            <br />
            直接入力ならプルダウンにないものも可
          </p>
        </div>

        <button
          className="btn-toggle-direct"
          onClick={() => setDirectInputMode(!directInputMode)}
          disabled={isProcessing}
        >
          {directInputMode ? 'キーボードモードに切り替え' : '直接入力モードに切り替え'}
        </button>

        {!directInputMode && (
          <>
            <div className="prefix-selector">
              <label>プルダウンで14種類</label>
              <div className="custom-dropdown-wrapper">
                <button
                  className="custom-dropdown-toggle"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  disabled={isProcessing}
                >
                  {selectedPrefix}
                </button>
                {dropdownOpen && !isProcessing && (
                  <div className="custom-dropdown-menu">
                    {prefixes.map((prefix) => (
                      <div
                        key={prefix}
                        className="custom-dropdown-item"
                        onClick={() => handlePrefixChange(prefix)}
                      >
                        {prefix}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

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
              <div className="pad-row">
                <button className="pad-btn letter-btn" onClick={() => handleLetterClick('A')} disabled={isProcessing}>A</button>
                <button className="pad-btn letter-btn" onClick={() => handleLetterClick('B')} disabled={isProcessing}>B</button>
                <button className="pad-btn letter-btn" onClick={() => handleLetterClick('C')} disabled={isProcessing}>C</button>
                <button className="pad-btn letter-btn" onClick={() => handleLetterClick('D')} disabled={isProcessing}>D</button>
                <button className="pad-btn letter-btn" onClick={() => handleLetterClick('E')} disabled={isProcessing}>E</button>
              </div>
            </div>
          </>
        )}

        <div className="action-buttons">
          {!directInputMode && (
            <button className="btn-backspace" onClick={handleBackSpace} disabled={isProcessing}>
              ← BackSpace
            </button>
          )}
          <button className="btn-clear" onClick={handleClear} disabled={isProcessing}>クリア</button>
          <button className="btn-submit" onClick={handleSubmit} disabled={isSubmitDisabled}>
            {isProcessing ? '送信中...' : '決定'}
          </button>
        </div>

        <button className="btn-cancel" onClick={onCancel} disabled={isProcessing}>キャンセル</button>
      </div>
    </div>
  );
};

export default CustomKeyboard;
