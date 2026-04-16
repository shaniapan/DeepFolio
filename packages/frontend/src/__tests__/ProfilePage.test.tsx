import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProfilePage from '../pages/ProfilePage';
import { BrowserRouter } from 'react-router-dom';

describe('ProfilePage', () => {
  it('renders the profile setup form', () => {
    render(
      <BrowserRouter>
        <ProfilePage />
      </BrowserRouter>
    );
    expect(screen.getByText('👤 完善你是谁')).toBeInTheDocument();
    expect(screen.getByText('保存系统级档案')).toBeInTheDocument();
  });
});
