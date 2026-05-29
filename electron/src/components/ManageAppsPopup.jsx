import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import './ManageAppsPopup.css';

export default function ManageAppsPopup({ onClose, selectedApps, setSelectedApps, selectedWebsites, setSelectedWebsites }) {
  const [activeTab, setActiveTab] = useState('apps'); // 'apps' or 'websites'
  
  const [allApps, setAllApps] = useState([]);
  const [search, setSearch] = useState('');
  
  const [webInput, setWebInput] = useState('');

  // Fetch installed apps & start stream
  useEffect(() => {
    let isMounted = true;
    
    // 1. Initial Load (Instant from cache)
    if (window.electron && window.electron.getInstalledApps) {
      window.electron.getInstalledApps().then(apps => {
        if (!isMounted) return;
        const arr = apps.map(app => ({
           ...app,
           checked: selectedApps.some(sa => sa.name === app.name)
        }));
        setAllApps(arr);
        
        // 2. Start Background Stream
        window.electron.startIconStream();
      });

      // 3. Listen for incoming icons
      window.electron.onAppIconReady(({ path, icon, exeName }) => {
        if (!isMounted) return;
        setAllApps(prev => prev.map(a => 
           (a.path === path) ? { ...a, icon, ...(exeName ? { exeName } : {}) } : a
        ));
      });

    } else {
      // Browser Mock
      setAllApps([
        { name: "Chrome", path: "chrome", checked: false },
        { name: "Discord", path: "discord", checked: false },
        { name: "Spotify", path: "spotify", checked: false },
        { name: "Visual Studio Code", path: "vscode", checked: false },
      ].map(a => ({...a, checked: selectedApps.some(sa => sa.name === a.name)})));
    }
    
    return () => { isMounted = false; };
  }, []);

  const toggleApp = (app) => {
    const updated = [...allApps];
    const idx = updated.findIndex(a => a.path === app.path);
    if (idx === -1) return;
    
    if (!updated[idx].checked && selectedApps.length >= 15) {
      window.electron?.showError('Warning', 'Max 15 apps allowed.');
      return;
    }
    
    updated[idx].checked = !updated[idx].checked;
    setAllApps(updated);
    
    const newSelected = updated.filter(a => a.checked);
    setSelectedApps(newSelected);
  };

  const addWebsite = async () => {
    let kw = webInput.trim();
    if (!kw) return;
    if (!kw.includes('.')) kw += '.com';
    
    if (selectedWebsites.some(w => w.keyword.toLowerCase() === kw.toLowerCase())) return;
    
    // Fetch favicon
    let icon = null;
    if (window.electron && window.electron.fetchFavicon) {
        icon = await window.electron.fetchFavicon(kw);
    }
    
    setSelectedWebsites([...selectedWebsites, { keyword: kw, icon: icon }]);
    setWebInput('');
  };

  const removeWebsite = (kw) => {
    setSelectedWebsites(selectedWebsites.filter(w => w.keyword !== kw));
  };

  const filteredApps = allApps.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="popup-overlay" onClick={onClose}></div>
      <div className="popup-window">
         {/* Custom Title Bar */}
         <div className="popup-title-bar">
            <span>Edit Block List</span>
            <button className="popup-done" onClick={onClose}>Done</button>
         </div>

         {/* Tab Selectors */}
         <div className="tab-container">
            <div className={`tab-btn ${activeTab === 'apps' ? 'active' : ''}`} onClick={() => setActiveTab('apps')}>
                Apps
            </div>
            <div className={`tab-btn ${activeTab === 'websites' ? 'active' : ''}`} onClick={() => setActiveTab('websites')}>
                Websites
            </div>
         </div>

         <div className="popup-content">
            {activeTab === 'apps' ? (
               <div className="apps-tab">
                  <div className="search-pill">
                     <Search size={16} className="search-icon" />
                     <input 
                       value={search} 
                       onChange={e => setSearch(e.target.value)} 
                       placeholder="Search apps..." 
                     />
                  </div>
                  <div className="selection-count">
                     {selectedApps.length}/15 Apps Blocked
                  </div>
                  <div className="apps-list">
                     {allApps.length === 0 ? (
                        <div className="loading-state">Scanning system...</div>
                     ) : (
                        filteredApps.map(app => (
                           <div key={app.path} className="app-row" onClick={() => toggleApp(app)}>
                              <div className="app-icon">
                                 {app.icon ? <img src={app.icon} alt="" onError={(e) => e.target.src = '/missing_icon.png'} /> : <img src="/missing_icon.png" alt="" />}
                              </div>
                              <span className={`app-name ${app.checked ? 'bold' : ''}`}>{app.name}</span>
                              <div className={`app-checkbox ${app.checked ? 'checked' : ''}`}>
                                 {app.checked && <span className="check-mark">✓</span>}
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            ) : (
               <div className="websites-tab">
                  <p className="web-instruct">Block browser tabs containing these keywords:</p>
                  
                  <div className="web-add-row">
                     <div className="web-input-pill">
                        <input 
                          value={webInput} 
                          onChange={e => setWebInput(e.target.value)} 
                          onKeyDown={e => e.key === 'Enter' && addWebsite()}
                          placeholder="domain.com"
                        />
                     </div>
                     <button className="btn-add" onClick={addWebsite}>+ Add</button>
                  </div>
                  
                  <div className="websites-list">
                     {selectedWebsites.length === 0 ? (
                        <div className="empty-state">No keywords added yet.</div>
                     ) : (
                        selectedWebsites.map(web => (
                           <div key={web.keyword} className="web-row">
                              {web.icon ? <img src={web.icon} className="web-icon" alt="" onError={(e) => e.target.src = '/missing_icon.png'} /> : <img src="/missing_icon.png" className="web-icon" alt="" />}
                              <span className="web-keyword">{web.keyword}</span>
                              <span className="web-remove" onClick={() => removeWebsite(web.keyword)}>✕</span>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            )}
         </div>
      </div>
    </>
  );
}
