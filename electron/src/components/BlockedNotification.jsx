import { useState, useEffect, useRef } from 'react';
import './BlockedNotification.css';

export default function BlockedNotification() {
    const [notifications, setNotifications] = useState([]);
    const recentAppNames = useRef(new Set());

    useEffect(() => {
        if (!window.electron?.onAppBlocked) return;

        window.electron.onAppBlocked((appName) => {
            // Deduplicate on frontend to be absolutely sure
            if (recentAppNames.current.has(appName)) return;
            
            recentAppNames.current.add(appName);
            setTimeout(() => {
                recentAppNames.current.delete(appName);
            }, 4000);

            // Clean up the app name (remove debug prefixes, .exe, etc.)
            let cleanName = appName
                .replace(/^Blocked:\s*/i, '')
                .replace(/\s*\(restricted site\)\s*$/i, '')
                .replace(/\.exe$/i, '')
                .trim();
            
            // Capitalize first letter
            if (cleanName.length > 0) {
                cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
            }

            const id = Date.now() + Math.random();
            setNotifications(prev => [...prev, { id, appName: cleanName }]);
            
            // Auto-dismiss after 3.5 seconds
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, 3500);
        });
    }, []);

    if (notifications.length === 0) return null;

    return (
        <div className="blocked-notifications">
            {notifications.map(n => (
                <div key={n.id} className="blocked-toast">
                    <span className="blocked-icon">🚫</span>
                    <span className="blocked-message">
                        <strong>{n.appName}</strong> is blocked in your focus session
                    </span>
                </div>
            ))}
        </div>
    );
}
