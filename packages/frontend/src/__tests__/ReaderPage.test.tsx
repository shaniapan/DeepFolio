import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReaderPage from '../pages/ReaderPage';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api } from '../api/client';

vi.mock('../components/PdfReader', () => ({
  default: () => <div>Mocked PdfReader</div>
}));

vi.mock('../api/client', () => ({
  api: {
    books: { 
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([{ id: 'b1', title: 'Test Book', format: 'epub', filename: 'test.epub', has_text_layer: 1 }])
    },
    progress: { get: vi.fn().mockResolvedValue({ position: '0', last_mode: 'immersive' }) },
    highlights: { list: vi.fn().mockResolvedValue([]) },
    settings: { get: vi.fn().mockResolvedValue({}) },
    conversations: { list: vi.fn().mockResolvedValue([]) },
    paragraphs: { 
      generate: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue([]) 
    }
  }
}));

describe('ReaderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={['/reader/b1']}>
        <Routes>
          <Route path="/reader/:bookId" element={<ReaderPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders correctly and hides Copilot when has_text_layer === 0', async () => {
    (api.books.list as any).mockResolvedValue([{
      id: 'b1', title: 'Scanned Book', format: 'pdf', filename: 'test.pdf', has_text_layer: 0
    }]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Scanned Book')).toBeInTheDocument();
    });

    // CopilotPanel should NOT render since has_text_layer === 0 and copilot.isOpen remains false.
    // However, TopBar logic might render Mode Switcher if format rules apply. Mocks say mode={undefined}
    expect(screen.queryByText('工具')).not.toBeInTheDocument(); 
  });

  it('renders Copilot in tools mode for normal books', async () => {
    (api.books.list as any).mockResolvedValue([{
      id: 'b1', title: 'Normal Book', format: 'epub', filename: 'test.epub', has_text_layer: 1
    }]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Normal Book')).toBeInTheDocument();
      // Should show tools button in top bar
      expect(screen.getByRole('button', { name: '工具' })).toBeInTheDocument();
    });

    // TopBar has a button to switch modes. 
    const immersiveBtn = screen.getByRole('button', { name: '沉浸' });
    fireEvent.click(immersiveBtn);

    // Clicking immersive should hide copilot panel in the parent 
    // Copilot Panel renders "提问" when active. Since it's hidden, "提问" should disappear.
    // wait, does CopilotPanel unmount?
    // ReaderPage: `{copilot.isOpen && book.has_text_layer !== 0 && (<CopilotPanel ... />)}`
    await waitFor(() => {
       const copilotInputs = screen.queryByPlaceholderText(/提问/);
       expect(copilotInputs).not.toBeInTheDocument();
    });
  });
});
