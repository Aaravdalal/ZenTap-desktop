import { useState, useEffect } from 'react';
import './InsertKeyPopup.css';

export default function InsertKeyPopup({ onClose, onInsert, isSuccess }) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isSuccess) {
      // Wait for animation to finish, then call onInsert
      const timer = setTimeout(() => {
         setIsClosing(true);
         setTimeout(() => onInsert(), 300);
      }, 1500); // Wait 1.5 seconds to show the animation
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onInsert]);

  const handleClose = () => {
    if (isSuccess) return; // Prevent closing manually if already successful
    setIsClosing(true);
    setTimeout(() => onClose(), 300);
  };

  return (
    <>
      <div className={`insert-key-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}></div>
      <div className={`insert-key-popup ${isClosing ? 'closing' : ''}`}>
        {!isSuccess && <button className="insert-key-close" onClick={handleClose}>✕</button>}
        
        <div className="insert-key-header">
           <h2 className="insert-key-title">{isSuccess ? "Zen-Key Connected" : "Insert Zen-Key"}</h2>
           <p className="insert-key-subtitle">{isSuccess ? "Initializing Zen mode..." : "Plug the Zen Key into your computer"}</p>
        </div>
        
        <div className="insert-key-icon-container">
           {isSuccess ? (
             <div className="google-pay-checkmark-wrapper">
               <svg className="gpay-circle-svg" width="140" height="140" viewBox="0 0 140 140">
                 <circle className="gpay-circle-outline" cx="70" cy="70" r="60" stroke="#1A73E8" strokeWidth="8" fill="none" strokeDasharray="400" strokeDashoffset="400" strokeLinecap="round" transform="rotate(-90 70 70)" />
               </svg>
               <div className="gpay-circle-fill"></div>
               <svg className="gpay-check-svg" width="140" height="140" viewBox="0 0 140 140">
                 <path className="gpay-check-path" d="M 40 72 L 60 92 L 100 45" stroke="#FFFFFF" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="100" strokeDashoffset="100" />
               </svg>
             </div>
           ) : (
             <img 
               src="/usb_insert_graphic.png" 
               alt="Insert USB-C Key" 
               className="insert-key-image" 
             />
           )}
        </div>
        
        {!isSuccess && <button className="insert-key-cancel" onClick={handleClose}>Cancel</button>}
      </div>
    </>
  );
}
