import { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { Category } from '../types';
import { Plus, Trash2 } from 'lucide-react';

const CATEGORY_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', 
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#E74C3C'
];

export default function CategoriesManagement() {
  const { categories, addCategory, deleteCategory } = useBudget();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as Category['type'],
    color: CATEGORY_COLORS[0],
    parentId: '' as string | undefined,
  });

  const mainCategories = categories.filter(c => !c.parentId);
  const subCategories = categories.filter(c => c.parentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addCategory({
      ...formData,
      parentId: formData.parentId || undefined,
    });
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', type: 'expense', color: CATEGORY_COLORS[0], parentId: '' });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this category? This will also delete all subcategories and associated transactions.')) {
      deleteCategory(id);
    }
  };

  return (
    <div className="categories-management">
      <div className="page-header">
        <h2 className="page-title">Categories</h2>
        <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={16} /> Add Category
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3>Add Category</h3>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label>Category Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Category['type'] })}
                required
              >
                <option value="expense">Expense</option>
                <option value="debt">Debt</option>
                <option value="savings">Savings</option>
              </select>
            </div>

            <div className="form-group">
              <label>Parent Category (optional - leave empty for main category)</label>
              <select
                value={formData.parentId}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value || undefined })}
              >
                <option value="">None (Main Category)</option>
                {mainCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Color</label>
              <div className="color-picker">
                {CATEGORY_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`color-option ${formData.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Add Category
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="categories-section">
        {['expense', 'debt', 'savings'].map(type => {
          const typeMainCats = mainCategories.filter(c => c.type === type);
          if (typeMainCats.length === 0) return null;

          return (
            <div key={type} className="category-group">
              <h3>{type.charAt(0).toUpperCase() + type.slice(1)} Categories</h3>
              {typeMainCats.map(cat => {
                const subs = subCategories.filter(sc => sc.parentId === cat.id);
                return (
                  <div key={cat.id} className="category-card">
                    <div className="category-header">
                      <div className="category-info">
                        <span 
                          className="category-color" 
                          style={{ backgroundColor: cat.color }}
                        />
                        <h4>{cat.name}</h4>
                      </div>
                      <button className="icon-btn text-danger" onClick={() => handleDelete(cat.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {subs.length > 0 && (
                      <div className="subcategories">
                        {subs.map(sub => (
                          <div key={sub.id} className="subcategory-item">
                            <span className="category-color" style={{ backgroundColor: sub.color }} />
                            <span>{sub.name}</span>
                            <button className="icon-btn text-danger" onClick={() => handleDelete(sub.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

