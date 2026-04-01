interface Props {
  x: number;
  y: number;
  onColorSelect: (color: string) => void;
  onClose: () => void;
}

export default function FloatingMenu({ x, y, onColorSelect, onClose }: Props) {
  const colors = [
    { name: 'yellow', hex: '#fef08a' }, // 💡 启发
    { name: 'blue', hex: '#bfdbfe' },   // 🌉 补充/缝合
    { name: 'green', hex: '#bbf7d0' },  // 🔑 重点核心
    { name: 'red', hex: '#fecaca' }     // ❓ 疑难点
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
      <div style={{
        position: 'fixed', left: x, top: y, zIndex: 1000,
        background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
        padding: 8, display: 'flex', gap: 8, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)'
      }}>
        {colors.map(c => (
          <button key={c.name} onClick={() => onColorSelect(c.name)}
            style={{
              width: 24, height: 24, borderRadius: '50%', background: c.hex,
              border: '2px solid transparent', cursor: 'pointer'
            }} />
        ))}
      </div>
    </>
  );
}
