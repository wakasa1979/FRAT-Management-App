import React, { useState, useEffect, useCallback } from 'react';
import './PartsListView.css';
import RegisterPartModal from './RegisterPartModal';
import {
  fetchProductsFromSheets,
  checkFratExists,
  updateShipmentConfirmationTimestamp,
  updateStatusBAndMarkFratTimestamp,
  updatePart,
  sendDeletionRequestEmail,
  deletePart,
  getStatusA,
  getStatusB
} from '../services/sheetsService';

const PartsListView = ({ currentUser, onLogout, onNavigate, locationMaster }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCriteria, setFilterCriteria] = useState({
    searchTerm: '',
    buildingLocation: '',
    building: '',
    statusA: '',
    statusB: ''
  });
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [statusAOptions, setStatusAOptions] = useState([]);
  const [statusBOptions, setStatusBOptions] = useState([]);
  const [fratStatusMap, setFratStatusMap] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  const restrictedStatusBItems = ['FRAT/送り状貼付け済み', 'FRATのみ貼付け済み', '送り状のみ貼付け済み'];
  const allowedStatusAForRestrictedB = ['使用済みパーツ', 'その他', '未使用返却', 'DOA'];

  const statusColorMap = {
    statusA: {
      '未使用・使用前': { bg: '#FFE0E6', text: '#000' },
      '使用済みパーツ': { bg: '#E0F7FF', text: '#000' },
      '未使用返却': { bg: '#E0F7FF', text: '#000' },
      'DOA': { bg: '#E0F7FF', text: '#000' },
      '不明': { bg: '#FFFACD', text: '#000' },
      'その他': { bg: '#FFFACD', text: '#000' },
      '保留': { bg: '#D32F2F', text: '#FFF' },
      '削除依頼': { bg: '#D32F2F', text: '#FFD700' }
    },
    statusB: {
      'FRAT/送り状貼付け済み': { bg: '#E0F7FF', text: '#000' },
      'FRATのみ貼付け済み': { bg: '#FFFACD', text: '#000' },
      '送り状のみ貼付け済み': { bg: '#FFFACD', text: '#000' },
      'その他': { bg: '#FFFACD', text: '#000' },
      '出荷不可': { bg: '#D32F2F', text: '#FFF' },
      '使用不可': { bg: '#D32F2F', text: '#FFF' }
    }
  };

  const getUserId = () => {
    if (typeof currentUser === 'string') return currentUser;
    if (currentUser && currentUser.userId) return currentUser.userId;
    return 'Unknown';
  };

  const getUserName = () => {
    if (typeof currentUser === 'string') return currentUser;
    if (currentUser && currentUser.name) return currentUser.name;
    return 'Unknown';
  };

  const isAdmin = () => {
    if (currentUser && currentUser.isAdmin) return true;
    if (currentUser && currentUser.role === 'admin') return true;
    return false;
  };

  const isStatusBDisabled = (statusBItem) => {
    if (!restrictedStatusBItems.includes(statusBItem)) {
      return false;
    }
    return !allowedStatusAForRestrictedB.includes(editFormData.statusA);
  };

  const getSerialNumberClass = (serial) => {
    const length = serial.length;
    if (length <= 12) return 'card-serial-number';
    if (length <= 14) return 'card-serial-number serial-long';
    return 'card-serial-number serial-very-long';
  };

  const getStatusAStyle = (statusA) => {
    return statusColorMap.statusA[statusA] || { bg: '#FF9800', text: '#FFF' };
  };

  const getStatusBStyle = (statusB) => {
    return statusColorMap.statusB[statusB] || { bg: '#FFFACD', text: '#000' };
  };

  useEffect(() => {
    loadData();
  }, []);

  const filterProducts = useCallback(() => {
    let filtered = products.filter(p => 
      !p.shipmentTimestamp || p.shipmentTimestamp.trim().length === 0
    );

    // 🔍 シリアル番号で部分一致検索
    if (filterCriteria.searchTerm.trim().length > 0) {
      const term = filterCriteria.searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.serial.toLowerCase().includes(term)
      );
    }

    // 場所でフィルター
    if (filterCriteria.buildingLocation) {
      filtered = filtered.filter(p => 
        p.buildingLocation === filterCriteria.buildingLocation
      );
    }

    // 棟でフィルター
    if (filterCriteria.building) {
      filtered = filtered.filter(p => p.building === filterCriteria.building);
    }

    // ステータスA でフィルター
    if (filterCriteria.statusA) {
      filtered = filtered.filter(p => p.statusA === filterCriteria.statusA);
    }

    // ステータスB でフィルター
    if (filterCriteria.statusB) {
      filtered = filtered.filter(p => p.statusB === filterCriteria.statusB);
    }

    // 複合キーでソート
    filtered.sort((a, b) => {
      const buildingCompare = (a.building || '').localeCompare(b.building || '', 'ja');
      if (buildingCompare !== 0) return buildingCompare;
      
      const floorCompare = (a.floor || '').localeCompare(b.floor || '', 'ja');
      if (floorCompare !== 0) return floorCompare;
      
      const div1Compare = (a.division1 || '').localeCompare(b.division1 || '', 'ja');
      if (div1Compare !== 0) return div1Compare;
      
      return (a.pillarNumber || '').localeCompare(b.pillarNumber || '', 'ja');
    });

    setFilteredProducts(filtered);
  }, [products, filterCriteria]);

  useEffect(() => {
    filterProducts();
  }, [products, filterCriteria, filterProducts]);

  useEffect(() => {
    console.log('🐛 DEBUG fratStatusMap:', fratStatusMap);
    console.log('🐛 DEBUG products count:', products.length);
    if (products.length > 0) {
      console.log('🐛 DEBUG first product:', products[0]);
      console.log('🐛 DEBUG first product FRAT status:', fratStatusMap[products[0].serial]);
    }
  }, [fratStatusMap, products]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('📚 Loading all data...');
      const [parts, statusA, statusB] = await Promise.all([
        fetchProductsFromSheets(),
        getStatusA(),
        getStatusB()
      ]);

      console.log('✅ Data loaded:', parts.length, 'parts');
      setProducts(parts);
      setStatusAOptions(statusA);
      setStatusBOptions(statusB);

      const fratMap = {};
      for (const part of parts) {
        const fratResult = await checkFratExists(part.serial);
        fratMap[part.serial] = fratResult.exists;
      }
      setFratStatusMap(fratMap);
      console.log('🐛 DEBUG Final fratStatusMap:', fratMap);

      setLoading(false);
    } catch (error) {
      console.error('❌ Error loading data:', error);
      setLoading(false);
    }
  };

  const handleEditPart = (part) => {
    setEditingPart(part);
    setEditFormData({
      building: part.building,
      floor: part.floor,
      division1: part.division1,
      pillarNumber: part.pillarNumber,
      division2: part.division2,
      statusA: part.statusA,
      statusB: part.statusB,
      serial: part.serial,
      notes: part.notes,
      rowIndex: part.rowIndex
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    const userId = getUserId();
    try {
      await updatePart({
        ...editFormData,
        user: userId
      });
      await loadData();
      setShowEditModal(false);
      alert('✅ パーツ情報が更新されました');
    } catch (error) {
      console.error('❌ Error updating part:', error);
      alert('❌ 更新に失敗しました');
    }
  };

  const handleFratBadgeClick = async (part) => {
    console.log('🎯 FratBadge clicked:', part.serial);
    const userId = getUserId();
    
    if (!window.confirm(`使用済みパーツとして、「FRAT&送り状添付済み」の「出荷待機状態」に変更しますか？\n\nシリアル: ${part.serial}`)) {
      return;
    }

    setIsUpdating(true);
    try {
      await updateStatusBAndMarkFratTimestamp({
        rowIndex: part.rowIndex,
        serial: part.serial,
        user: userId
      });
      await loadData();
      alert('✅ FRATバッジが打たれました');
    } catch (error) {
      console.error('❌ Error:', error);
      alert('❌ エラーが発生しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleShipmentConfirmed = async (part) => {
    console.log('🚀 handleShipmentConfirmed called:', part.serial);
    const userId = getUserId();
    
    if (!window.confirm(`${part.serial} を出荷確認しますか？`)) {
      return;
    }

    setIsUpdating(true);
    try {
      await updateShipmentConfirmationTimestamp({
        rowIndex: part.rowIndex,
        serial: part.serial,
        user: userId
      });
      await loadData();
      alert('✅ 出荷確認が完了しました');
    } catch (error) {
      console.error('❌ Error:', error);
      alert('❌ エラーが発生しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePart = async (part) => {
    const userId = getUserId();
    await sendDeletionRequestEmail(part.serial, part.statusA, userId);
    
    if (window.confirm(`${part.serial} を削除しますか？（この操作は取り消せません）`)) {
      try {
        await deletePart(part.rowIndex, part.serial, userId);
        await loadData();
        alert('✅ パーツが削除されました');
      } catch (error) {
        console.error('❌ Error deleting part:', error);
        alert('❌ 削除に失敗しました');
      }
    }
  };

  const handleShowDetail = (part) => {
    setSelectedPart(part);
    setShowDetailModal(true);
  };

  const uniqueLocations = [...new Set(products.map(p => p.buildingLocation).filter(Boolean))].sort();
  const uniqueBuildings = [...new Set(products.map(p => p.building).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ja'));

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>📦 データを読み込み中...</div>;
  }

  return (
    <div className="parts-list-container">
      <div className="header-bar">
        <div className="header-left">
          <h1>📦 パーツ管理</h1>
          <div className="user-badge">{getUserName()}</div>
        </div>
        <div className="header-right">
          <button className="btn-register" onClick={() => setShowRegisterModal(true)}>
            ➕ 新規登録
          </button>
          <button className="btn-refresh" onClick={() => loadData()}>
            🔄 更新
          </button>
          <button className="btn-search" onClick={() => setShowSearchPanel(!showSearchPanel)}>
            {showSearchPanel ? '🔍 絞込みを閉じる' : '🔍 絞込みを開く'}
          </button>
        </div>
      </div>

      {showSearchPanel && (
        <div className="search-panel">
          <div className="filter-group">
            <label>🔎 シリアル番号検索:</label>
            <input
              type="text"
              placeholder="シリアル番号の一部を入力..."
              value={filterCriteria.searchTerm}
              onChange={(e) => setFilterCriteria({ ...filterCriteria, searchTerm: e.target.value })}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>場所:</label>
            <select
              value={filterCriteria.buildingLocation}
              onChange={(e) => setFilterCriteria({ ...filterCriteria, buildingLocation: e.target.value })}
              className="filter-select"
            >
              <option value="">すべて</option>
              {uniqueLocations.map((loc, idx) => (
                <option key={idx} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>棟:</label>
            <select
              value={filterCriteria.building}
              onChange={(e) => setFilterCriteria({ ...filterCriteria, building: e.target.value })}
              className="filter-select"
            >
              <option value="">すべて</option>
              {uniqueBuildings.map((building, idx) => (
                <option key={idx} value={building}>{building}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>ステータスA:</label>
            <select
              value={filterCriteria.statusA}
              onChange={(e) => setFilterCriteria({ ...filterCriteria, statusA: e.target.value })}
              className="filter-select"
            >
              <option value="">すべて</option>
              {statusAOptions.map((status, idx) => (
                <option key={idx} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>ステータスB:</label>
            <select
              value={filterCriteria.statusB}
              onChange={(e) => setFilterCriteria({ ...filterCriteria, statusB: e.target.value })}
              className="filter-select"
            >
              <option value="">すべて</option>
              {statusBOptions.map((status, idx) => (
                <option key={idx} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <button
            className="btn-clear-filter"
            onClick={() => setFilterCriteria({ searchTerm: '', buildingLocation: '', building: '', statusA: '', statusB: '' })}
          >
            ✖ フィルターをクリア
          </button>
        </div>
      )}

      <div className="info-bar">
        <span>合計: <strong>{filteredProducts.length}</strong> 件 / 全: <strong>{products.length}</strong> 件</span>
      </div>

      <div className="parts-grid">
        {filteredProducts.map((part, idx) => {
          const statusAStyle = getStatusAStyle(part.statusA);
          const statusBStyle = getStatusBStyle(part.statusB);
          const fratExists = fratStatusMap[part.serial] || false;

          return (
            <div key={idx} className="parts-card">
              <div className="card-header">
                <div className={getSerialNumberClass(part.serial)}>
                  {part.serial}
                </div>
              </div>

              <div className="card-body">
                <div className="card-row">
                  <span className="card-label">場所:</span>
                  <span className="card-value">{part.building}-{part.floor}-{part.division1}-{part.pillarNumber}-{part.division2}</span>
                </div>

                <div className="card-row">
                  <span className="card-label">記録者:</span>
                  <span className="card-value">{part.registeredBy || '-'}</span>
                </div>

                <div className="card-status-row">
                  <div
                    className="status-badge"
                    style={{ backgroundColor: statusAStyle.bg, color: statusAStyle.text }}
                  >
                    {part.statusA || '-'}
                  </div>
                  <div
                    className="status-badge"
                    style={{ backgroundColor: statusBStyle.bg, color: statusBStyle.text }}
                  >
                    {part.statusB || '-'}
                  </div>
                </div>

                {part.notes && (
                  <div className="card-notes">
                    <strong>備考:</strong> {part.notes}
                  </div>
                )}
              </div>

              <div className="card-actions">
                <button
                  className="btn-detail"
                  onClick={() => handleShowDetail(part)}
                >
                  📋 詳細
                </button>
                <button
                  className="btn-edit"
                  onClick={() => handleEditPart(part)}
                >
                  ✏️ 編集
                </button>
                {!fratExists && (
                  <button
                    className="btn-frat"
                    onClick={() => handleFratBadgeClick(part)}
                    disabled={isUpdating}
                  >
                    🏷️ FRAT
                  </button>
                )}
                {fratExists && !part.shipmentTimestamp && (
                  <button
                    className="btn-shipment"
                    onClick={() => handleShipmentConfirmed(part)}
                    disabled={isUpdating}
                  >
                    📦 出荷確認
                  </button>
                )}
                {isAdmin() && (
                  <button
                    className="btn-delete"
                    onClick={() => handleDeletePart(part)}
                    disabled={isUpdating}
                  >
                    🗑️ 削除
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showDetailModal && selectedPart && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>📋 詳細情報</h2>
            <div className="detail-content">
              <p><strong>シリアル:</strong> {selectedPart.serial}</p>
              <p><strong>場所:</strong> {selectedPart.building}-{selectedPart.floor}-{selectedPart.division1}-{selectedPart.pillarNumber}-{selectedPart.division2}</p>
              <p><strong>ステータスA:</strong> {selectedPart.statusA}</p>
              <p><strong>ステータスB:</strong> {selectedPart.statusB}</p>
              <p><strong>記録者:</strong> {selectedPart.registeredBy}</p>
              <p><strong>備考:</strong> {selectedPart.notes || '-'}</p>
              <p><strong>登録日時:</strong> {selectedPart.registeredDate}</p>
            </div>
            <button className="btn-close" onClick={() => setShowDetailModal(false)}>閉じる</button>
          </div>
        </div>
      )}

      {showEditModal && editingPart && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>✏️ パーツ編集</h2>
            <div className="edit-form">
              <div className="form-group">
                <label>ステータスA:</label>
                <select
                  value={editFormData.statusA}
                  onChange={(e) => setEditFormData({ ...editFormData, statusA: e.target.value })}
                >
                  {statusAOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>ステータスB:</label>
                <select
                  value={editFormData.statusB}
                  onChange={(e) => setEditFormData({ ...editFormData, statusB: e.target.value })}
                  disabled={isStatusBDisabled(editFormData.statusB)}
                >
                  {statusBOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>備考:</label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  rows="3"
                />
              </div>

              <div className="modal-buttons">
                <button className="btn-save" onClick={handleSaveEdit} disabled={isUpdating}>
                  💾 保存
                </button>
                <button className="btn-cancel" onClick={() => setShowEditModal(false)} disabled={isUpdating}>
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRegisterModal && (
        <RegisterPartModal
          locationMaster={locationMaster}
          onSubmit={() => {
            setShowRegisterModal(false);
            loadData();
          }}
          onCancel={() => setShowRegisterModal(false)}
          isLoading={isUpdating}
          currentUser={currentUser}
        />
      )}

      <button className="btn-logout" onClick={onLogout}>
        ログアウト
      </button>
    </div>
  );
};

export default PartsListView;
