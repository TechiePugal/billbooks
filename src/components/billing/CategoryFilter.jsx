export default function CategoryFilter({ categories, active, onChange }) {
  return (
    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
      <Chip label="All" isActive={active === 'all'} onClick={() => onChange('all')} />
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
      className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
        isActive ? 'bg-brand-500 text-white' : 'bg-white text-gray-500 shadow-sm'
      }`}
    >
      {label}
    </button>
  );
}
