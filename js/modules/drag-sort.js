/* drag-sort.js — Drag-and-drop sorting for brands and models */
const DragSort = {
  _dragging: null,
  _dragSource: null,
  _orders: {}, // { 'brands': [id1, id2, ...], 'models': {...} }

  async init() {
    // Load sort orders from DB
    const saved = await DB.getSetting('sortOrders');
    this._orders = saved || { brands: [], models: {} };
  },

  enable(container, type, onReorder) {
    if (!container) return;
    const items = container.querySelectorAll('[data-id]');
    
    items.forEach(item => {
      item.draggable = true;
      item.style.cursor = 'grab';
      
      item.addEventListener('dragstart', e => {
        this._dragging = item;
        this._dragSource = type;
        item.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', () => {
        this._dragging = null;
        item.style.opacity = '1';
      });

      item.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (this._dragging && this._dragging !== item && this._dragSource === type) {
          this._insertBefore(item, this._dragging);
        }
      });

      item.addEventListener('drop', async e => {
        e.preventDefault();
        if (this._dragging && this._dragSource === type) {
          const ids = Array.from(container.querySelectorAll('[data-id]')).map(el => parseInt(el.dataset.id));
          this._orders[type] = ids;
          await DB.setSetting('sortOrders', this._orders);
          if (onReorder) onReorder(ids);
        }
      });
    });
  },

  _insertBefore(referenceNode, newNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode);
  },

  getSortedIds(type, allIds) {
    const saved = this._orders[type] || [];
    const sorted = saved.filter(id => allIds.includes(id));
    const unsorted = allIds.filter(id => !sorted.includes(id));
    return [...sorted, ...unsorted];
  }
};
