import { BrowserRouter, Routes, Route } from 'react-router-dom';

import LibraryPage from './pages/LibraryPage';
import ReaderPage from './pages/ReaderPage';
import SettingsPage from './pages/SettingsPage';

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
