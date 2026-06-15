import React, { useState, useEffect } from 'react';
import './App.css';
import LoginScreen from './components/LoginScreen';
import MainMenu from './components/MainMenu';
import PartsListView from './components/PartsListView';
import OpeningVideo from './components/OpeningVideo';
import { getLocationMaster } from './services/sheetsService';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('menu');
  const [locationMaster, setLocationMaster] = useState([]);
  const [isLoadingMasters, setIsLoadingMasters] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      loadLocationMaster();
    }
  }, [isLoggedIn]);

  const loadLocationMaster = async () => {
    try {
      setIsLoadingMasters(true);
      console.log('📍 Loading location master...');
      const locations = await getLocationMaster();
      setLocationMaster(locations);
      console.log('✅ Location master loaded:', locations.length, 'locations');
    } catch (error) {
      console.error('❌ Error loading location master:', error);
      setLocationMaster([]);
    } finally {
      setIsLoadingMasters(false);
    }
  };

  const handleLogin = (user) => {
    console.log('✅ User logged in:', user);
    setCurrentUser(user);
    setIsLoggedIn(true);
    setCurrentScreen('opening');
  };

  const handleOpeningComplete = () => {
    console.log('🎬 Opening video complete, navigating to main menu');
    setCurrentScreen('menu');
  };

  const handleLogout = () => {
    console.log('👋 User logged out');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setCurrentScreen('menu');
    setLocationMaster([]);
  };

  const handleNavigate = (screen) => {
    console.log('🧭 Navigating to:', screen);
    setCurrentScreen(screen);
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      {currentScreen === 'opening' && (
        <OpeningVideo onOpeningComplete={handleOpeningComplete} />
      )}
      {currentScreen === 'menu' && (
        <MainMenu currentUser={currentUser} onLogout={handleLogout} onNavigate={handleNavigate} />
      )}
      {currentScreen === 'parts-list' && (
        <PartsListView 
          currentUser={currentUser} 
          onLogout={handleLogout} 
          onNavigate={handleNavigate}
          locationMaster={locationMaster}
          isLoadingMasters={isLoadingMasters}
        />
      )}
    </div>
  );
};

export default App;
