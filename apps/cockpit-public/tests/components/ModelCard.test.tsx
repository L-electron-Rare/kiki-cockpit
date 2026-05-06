import type { components } from '@cockpit/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ModelCard } from '../../src/components/ModelCard';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, params, children, ...props }: any) => {
    const href = to.replace('$owner', params?.owner || '').replace('$name', params?.name || '');
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

type Card = components['schemas']['ModelCard'];

const baseCard: Card = {
  id: 'clemsail/micro-kiki-v3',
  owner: 'clemsail',
  name: 'micro-kiki-v3',
  display_name: 'Micro-KIKI v3',
  status: 'featured',
  chat_backend: 'hf_external',
  chat_eligible: false,
  downloads: 242,
  likes: 4,
  hf_url: 'https://huggingface.co/clemsail/micro-kiki-v3',
  description: null,
  base_model: null,
  domain: null,
  last_modified: null,
  featured_rank: 1,
  featured_headline: 'HEADLINE',
  top_eval_score: null,
  top_eval_benchmark: null,
};

describe('ModelCard', () => {
  it('renders display name and downloads', () => {
    render(<ModelCard card={baseCard} />);
    expect(screen.getByText('Micro-KIKI v3')).toBeInTheDocument();
    expect(screen.getByText(/242/)).toBeInTheDocument();
  });

  it('shows featured headline when present', () => {
    render(<ModelCard card={baseCard} />);
    expect(screen.getByText('HEADLINE')).toBeInTheDocument();
  });

  it('renders Try button as enabled for chat_eligible models', () => {
    const card: Card = { ...baseCard, chat_eligible: true, chat_backend: 'ailiance_live' };
    render(<ModelCard card={card} />);
    const button = screen.getByRole('link', { name: /try/i });
    expect(button.getAttribute('href')).toContain('/chat/');
  });

  it('renders external HF link when not chat_eligible', () => {
    render(<ModelCard card={baseCard} />);
    const link = screen.getByRole('link', { name: /huggingface/i });
    expect(link.getAttribute('href')).toBe('https://huggingface.co/clemsail/micro-kiki-v3');
  });
});
