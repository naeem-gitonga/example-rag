import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from '../Home';

jest.mock('@/components/ThemeToggle/ThemeToggle', () => ({
  __esModule: true,
  default: () => <button data-testid="theme-toggle">Theme Toggle</button>,
}));

jest.mock('../Home.module.scss', () => ({
  container: 'container',
  header: 'header',
  logo: 'logo',
  nav: 'nav',
  navLink: 'navLink',
  main: 'main',
  hero: 'hero',
  heroTitle: 'heroTitle',
  heroAccent: 'heroAccent',
  heroDescription: 'heroDescription',
  heroActions: 'heroActions',
  primaryButton: 'primaryButton',
  secondaryButton: 'secondaryButton',
  features: 'features',
  feature: 'feature',
  featureIcon: 'featureIcon',
  featureTitle: 'featureTitle',
  featureDescription: 'featureDescription',
  footer: 'footer',
}));

describe('Home', () => {
  describe('Header', () => {
    it('should render the logo', () => {
      render(<Home />);

      expect(screen.getByRole('heading', { name: 'RAG Chat', level: 1 })).toBeInTheDocument();
    });

    it('should render Chat navigation link', () => {
      render(<Home />);

      const chatLink = screen.getByRole('link', { name: 'Chat' });
      expect(chatLink).toBeInTheDocument();
      expect(chatLink).toHaveAttribute('href', '/chat');
    });

    it('should render Add Knowledge navigation link', () => {
      render(<Home />);

      const links = screen.getAllByRole('link', { name: 'Add Knowledge' });
      const navLink = links[0];
      expect(navLink).toHaveAttribute('href', '/upload');
    });

    it('should render ThemeToggle', () => {
      render(<Home />);

      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });
  });

  describe('Hero Section', () => {
    it('should render hero title', () => {
      render(<Home />);

      expect(screen.getByText('Chat with Your Data')).toBeInTheDocument();
    });

    it('should render hero accent text', () => {
      render(<Home />);

      expect(screen.getByText('Powered by RAG')).toBeInTheDocument();
    });

    it('should render hero description', () => {
      render(<Home />);

      expect(
        screen.getByText(/An AI assistant that knows your documents/)
      ).toBeInTheDocument();
    });

    it('should render Start Chatting button linking to /chat', () => {
      render(<Home />);

      const button = screen.getByRole('link', { name: 'Start Chatting' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('href', '/chat');
      expect(button).toHaveClass('primaryButton');
    });

    it('should render Add Knowledge button linking to /upload', () => {
      render(<Home />);

      const links = screen.getAllByRole('link', { name: 'Add Knowledge' });
      const heroButton = links.find((link) => link.classList.contains('secondaryButton'));
      expect(heroButton).toBeInTheDocument();
      expect(heroButton).toHaveAttribute('href', '/upload');
    });
  });

  describe('Features Section', () => {
    it('should render Natural Conversation feature', () => {
      render(<Home />);

      expect(screen.getByText('Natural Conversation')).toBeInTheDocument();
      expect(screen.getByText(/Chat naturally like you would/)).toBeInTheDocument();
      expect(screen.getByText('💬')).toBeInTheDocument();
    });

    it('should render Your Knowledge Base feature', () => {
      render(<Home />);

      expect(screen.getByText('Your Knowledge Base')).toBeInTheDocument();
      expect(screen.getByText(/Add your own documents, notes, and data/)).toBeInTheDocument();
      expect(screen.getByText('📚')).toBeInTheDocument();
    });

    it('should render Grounded Responses feature', () => {
      render(<Home />);

      expect(screen.getByText('Grounded Responses')).toBeInTheDocument();
      expect(screen.getByText(/Answers are backed by your documents/)).toBeInTheDocument();
      expect(screen.getByText('🎯')).toBeInTheDocument();
    });

    it('should render exactly 3 features', () => {
      render(<Home />);

      const featureTitles = screen.getAllByRole('heading', { level: 3 });
      expect(featureTitles).toHaveLength(3);
    });
  });

  describe('Footer', () => {
    it('should render footer with company name', () => {
      render(<Home />);

      expect(screen.getByText(/GTNG, Inc/)).toBeInTheDocument();
    });

    it('should render footer with current year', () => {
      render(<Home />);

      const currentYear = new Date().getFullYear().toString();
      expect(screen.getByText(new RegExp(currentYear))).toBeInTheDocument();
    });
  });
});
