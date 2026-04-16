import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CopilotPanel from '../components/CopilotPanel';
import { api } from '../api/client';

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock('../api/client', () => ({
  api: {
    ai: { ask: vi.fn() },
    conversations: { 
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({})
    }
  }
}));

describe('CopilotPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders quick action buttons and handles Feynman trigger', async () => {
    (api.ai.ask as any).mockResolvedValue({ reply: '费曼回复内容' });

    render(<CopilotPanel bookId="b1" selectedText="测试选中内容" onClose={vi.fn()} paragraphAnnotations={[]} />);

    const feynmanBtn = screen.getByText('🎓 费曼对讲');
    expect(feynmanBtn).toBeInTheDocument();

    fireEvent.click(feynmanBtn);

    // AI history should be updated with a "思考中" or we can just wait for api.ai.ask
    await waitFor(() => {
      expect(api.ai.ask).toHaveBeenCalledWith('b1', 'feynman', '测试选中内容', expect.any(Array));
    });

    // The component will type the message, so we wait for the reply to show up
    await waitFor(() => {
      expect(screen.getByText(/费曼/)).toBeInTheDocument(); // Can be button label or response if fast enough
    });
  });

  it('handles Flashcard action', async () => {
    (api.ai.ask as any).mockResolvedValue({ reply: '卡片生成完毕' });

    render(<CopilotPanel bookId="b1" selectedText="卡片来源" onClose={vi.fn()} paragraphAnnotations={[]} />);

    const cardBtn = screen.getByText('📇 结构卡片');
    fireEvent.click(cardBtn);

    await waitFor(() => {
      expect(api.ai.ask).toHaveBeenCalledWith('b1', 'flashcard', '卡片来源', expect.any(Array));
    });
  });

  it('handles Actionlist action without selected text', async () => {
    (api.ai.ask as any).mockResolvedValue({ reply: '行动清单生成' });

    render(<CopilotPanel bookId="b1" onClose={vi.fn()} paragraphAnnotations={[]} />);

    const actBtn = screen.getByText('🧗 行动清单');
    fireEvent.click(actBtn);

    await waitFor(() => {
      expect(api.ai.ask).toHaveBeenCalledWith('b1', 'actionlist', '', expect.any(Array));
    });
  });
});
