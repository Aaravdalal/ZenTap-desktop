import { useState, useEffect } from 'react';
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
            }, 3000);

            const id = Date.now() + Math.random();
            setNotifications(prev => [...prev, { id, appName }]);
            
            // Auto-dismiss after 3 seconds
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, 3000);
        });
    }, []);

    if (notifications.length === 0) return null;

    return (
        <div className="blocked-notifications">
            {notifications.map(n => (
                <div key={n.id} className="blocked-toast">
                    <span className="blocked-icon">🚫</span>
                    <div className="blocked-text">
                        <span className="blocked-title">{n.appName}</span>
                        <span className="blocked-subtitle">is blocked by ZenTap</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
