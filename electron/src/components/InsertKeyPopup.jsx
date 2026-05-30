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
             <div className="success-checkmark-wrapper">
               <svg className="success-checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                 <circle className="success-checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                 <path className="success-checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
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
