import React, { useEffect, useState } from 'react';
import { sheetsService } from '../services/sheetsService';
import './LogoAnimationScreen.css';

function LogoAnimationScreen({ onAnimationComplete }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const preloadData = async () => {
      try {
        console.log('📥 Background loading started...');
        await sheetsService.getLocationMaster();
        await sheetsService.getStatusA();
        await sheetsService.getStatusB();
        await sheetsService.getSerialPrefixes();
        console.log('✅ Background loading completed');
      } catch (error) {
        console.error('⚠️ Background loading error:', error);
      }
    };

    preloadData();

    const timer = setTimeout(() => {
      setIsLoading(false);
      onAnimationComplete();
    }, 11000);

    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  return (
    <div className="logo-animation-screen">
      <video 
        className="logo-animation-video"
        autoPlay 
        muted 
        playsInline
        onEnded={onAnimationComplete}
      >
        <source src="/logo-animation.mp4" type="video/mp4" />
      </video>
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}
    </div>
  );
}

export default LogoAnimationScreen;
