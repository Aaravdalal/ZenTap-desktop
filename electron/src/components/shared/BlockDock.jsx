import { Plus } from 'lucide-react';
import './BlockDock.css';

export default function BlockDock({ label, items, onOpen, slots = 10 }) {
  return (
    <div className="block-dock-group">
      <div className="block-dock-header">
        <span className="block-dock-label">{label}</span>
        <div className="block-dock-header-right">
          <span className="block-dock-count">{items.length}</span>
          <button className="block-dock-add" onClick={onOpen} aria-label={`Add to ${label}`}>
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
      <div className="block-dock-grid" onClick={onOpen}>
        {[...Array(slots)].map((_, i) => {
          const item = items[i];
          return (
            <div key={i} className="block-dock-slot">
              {item && (
                <img
                  src={item.icon || 'missing_icon.png'}
                  alt={item.name || item.keyword || ''}
                  onError={(e) => { e.target.src = 'missing_icon.png'; }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
