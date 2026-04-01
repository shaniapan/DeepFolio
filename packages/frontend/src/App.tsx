import { BrowserRouter, Routes, Route } from 'react-router-dom';

// 页面占位，Task 6+ 会替换
const LibraryPage = () => <div style={{ padding: 40, color: '#94a3b8' }}>书库（开发中）</div>;
const ReaderPage = () => <div style={{ padding: 40, color: '#94a3b8' }}>阅读器（开发中）</div>;
const SettingsPage = () => <div style={{ padding: 40, color: '#94a3b8' }}>设置（开发中）</div>;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/reader/:bookId" element={<ReaderPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
