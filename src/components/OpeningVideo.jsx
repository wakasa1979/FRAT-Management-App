import React, { useEffect } from 'react';
import './OpeningVideo.css';

const OpeningVideo = ({ onOpeningComplete }) => {
  useEffect(() => {
    const videoElement = document.querySelector('.opening-video');
    if (videoElement) {
      videoElement.play().catch(err => {
        console.error('❌ Video play error:', err);
        setTimeout(onOpeningComplete, 2000);
      });
    }
  }, [onOpeningComplete]);

  const handleVideoEnd = () => {
    console.log('✅ Opening video ended, navigating to main menu');
    onOpeningComplete();
  };

  return (
    <div className="opening-video-container">
      <video 
        autoPlay 
        muted 
        onEnded={handleVideoEnd}
        className="opening-video"
        playsInline
      >
        <source src="/videos/TKMサポートオープニング.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="loading-indicator">
        <div className="spinner"></div>
        <p>準備中...</p>
      </div>
    </div>
  );
};

export default OpeningVideo;
