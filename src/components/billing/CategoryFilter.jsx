import { useTranslation } from 'react-i18next';

export default function CategoryFilter({ categories, active, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
      <Chip label={t('billing.allCategory')} isActive={active === 'all'} onClick={() => onChange('all')} />
      {categories.map((cat) => (
        <Chip key={cat.id} label={cat.name} isActive={active === cat.id} onClick={() => onChange(cat.id)} />
      ))}
    </div>
  );
}

function Chip({ label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
        isActive ? 'bg-brand-500 text-white' : 'bg-white text-gray-500 shadow-sm'
      }`}
    >
      {label}
    </button>
  );
}
