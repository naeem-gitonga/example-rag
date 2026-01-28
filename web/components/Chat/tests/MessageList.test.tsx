import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageList } from '../MessageList';
import { ChatMessage } from '@shared/chat-types';

jest.mock('../Chat.module.scss', () => ({
  emptyState: 'emptyState',
  messageList: 'messageList',
  message: 'message',
  user: 'user',
  assistant: 'assistant',
  messageContent: 'messageContent',
  roleLabel: 'roleLabel',
  messageText: 'messageText',
  timestamp: 'timestamp',
  ragContext: 'ragContext',
  contextHeader: 'contextHeader',
  contextLabel: 'contextLabel',
  contextCaret: 'contextCaret',
  contextList: 'contextList',
  contextItem: 'contextItem',
  contextDate: 'contextDate',
  contextSnippet: 'contextSnippet',
  typingIndicator: 'typingIndicator',
  expanded: 'expanded',
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

describe('MessageList', () => {
  const mockMessages: ChatMessage[] = [
    {
      message_id: '1',
      session_id: 'session-1',
      role: 'user',
      content: 'Hello, how are you?',
      created_at: new Date('2024-01-15T10:30:00'),
    },
    {
      message_id: '2',
      session_id: 'session-1',
      role: 'assistant',
      content: 'I am doing well, thank you!',
      created_at: new Date('2024-01-15T10:30:05'),
    },
  ];

  it('should render empty state when no messages', () => {
    render(<MessageList messages={[]} isLoading={false} />);
    expect(screen.getByText('Start a conversation by typing a message below.')).toBeInTheDocument();
  });

  it('should not render empty state when loading', () => {
    render(<MessageList messages={[]} isLoading={true} />);
    expect(screen.queryByText('Start a conversation by typing a message below.')).not.toBeInTheDocument();
  });

  it('should render user messages', () => {
    render(<MessageList messages={mockMessages} isLoading={false} />);
    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
    expect(screen.getByText('Me')).toBeInTheDocument();
  });

  it('should render assistant messages', () => {
    render(<MessageList messages={mockMessages} isLoading={false} />);
    expect(screen.getByText('I am doing well, thank you!')).toBeInTheDocument();
    expect(screen.getByText('Assistant')).toBeInTheDocument();
  });

  it('should apply correct CSS class for user messages', () => {
    const { container } = render(<MessageList messages={[mockMessages[0]]} isLoading={false} />);
    const messageElement = container.querySelector('.message');
    expect(messageElement?.className).toContain('user');
  });

  it('should apply correct CSS class for assistant messages', () => {
    const { container } = render(<MessageList messages={[mockMessages[1]]} isLoading={false} />);
    const messageElement = container.querySelector('.message');
    expect(messageElement?.className).toContain('assistant');
  });

  it('should render typing indicator when loading', () => {
    const { container } = render(<MessageList messages={mockMessages} isLoading={true} />);
    expect(container.querySelector('.typingIndicator')).toBeInTheDocument();
  });

  it('should not render typing indicator when not loading', () => {
    const { container } = render(<MessageList messages={mockMessages} isLoading={false} />);
    expect(container.querySelector('.typingIndicator')).not.toBeInTheDocument();
  });

  it('should render RAG context toggle when present', () => {
    const messageWithContext: ChatMessage[] = [
      {
        message_id: '1',
        session_id: 'session-1',
        role: 'assistant',
        content: 'Based on your notes...',
        created_at: new Date('2024-01-15T10:30:00'),
        rag_context: [
          {
            entry_id: 'entry-1',
            entry_date: '2024-01-10',
            text_snippet: 'This is a relevant snippet',
            score: 0.95,
          },
        ],
      },
    ];

    render(<MessageList messages={messageWithContext} isLoading={false} />);
    expect(screen.getByText('Sources (1)')).toBeInTheDocument();
  });

  it('should not render RAG context section when context is empty', () => {
    const messageWithoutContext: ChatMessage[] = [
      {
        message_id: '1',
        session_id: 'session-1',
        role: 'assistant',
        content: 'Hello!',
        created_at: new Date('2024-01-15T10:30:00'),
        rag_context: [],
      },
    ];

    render(<MessageList messages={messageWithoutContext} isLoading={false} />);
    expect(screen.queryByText(/Sources/)).not.toBeInTheDocument();
  });

  it('should hide sources by default (collapsed state)', () => {
    const messageWithContext: ChatMessage[] = [
      {
        message_id: '1',
        session_id: 'session-1',
        role: 'assistant',
        content: 'Based on your notes...',
        created_at: new Date('2024-01-15T10:30:00'),
        rag_context: [
          {
            entry_id: 'entry-1',
            entry_date: '2024-01-10',
            text_snippet: 'This is a relevant snippet',
            score: 0.95,
          },
        ],
      },
    ];

    render(<MessageList messages={messageWithContext} isLoading={false} />);
    expect(screen.queryByText('2024-01-10')).not.toBeInTheDocument();
    expect(screen.queryByText('This is a relevant snippet')).not.toBeInTheDocument();
  });

  it('should expand sources when clicking the toggle button', () => {
    const messageWithContext: ChatMessage[] = [
      {
        message_id: '1',
        session_id: 'session-1',
        role: 'assistant',
        content: 'Based on your notes...',
        created_at: new Date('2024-01-15T10:30:00'),
        rag_context: [
          {
            entry_id: 'entry-1',
            entry_date: '2024-01-10',
            text_snippet: 'This is a relevant snippet',
            score: 0.95,
          },
        ],
      },
    ];

    render(<MessageList messages={messageWithContext} isLoading={false} />);

    // Click the toggle button
    fireEvent.click(screen.getByText('Sources (1)'));

    // Sources should now be visible
    expect(screen.getByText('2024-01-10')).toBeInTheDocument();
    expect(screen.getByText('This is a relevant snippet')).toBeInTheDocument();
  });

  it('should collapse sources when clicking the toggle button again', () => {
    const messageWithContext: ChatMessage[] = [
      {
        message_id: '1',
        session_id: 'session-1',
        role: 'assistant',
        content: 'Based on your notes...',
        created_at: new Date('2024-01-15T10:30:00'),
        rag_context: [
          {
            entry_id: 'entry-1',
            entry_date: '2024-01-10',
            text_snippet: 'This is a relevant snippet',
            score: 0.95,
          },
        ],
      },
    ];

    render(<MessageList messages={messageWithContext} isLoading={false} />);

    const toggleButton = screen.getByText('Sources (1)');

    // Expand
    fireEvent.click(toggleButton);
    expect(screen.getByText('This is a relevant snippet')).toBeInTheDocument();

    // Collapse
    fireEvent.click(toggleButton);
    expect(screen.queryByText('This is a relevant snippet')).not.toBeInTheDocument();
  });

  it('should add expanded class when sources are expanded', () => {
    const messageWithContext: ChatMessage[] = [
      {
        message_id: '1',
        session_id: 'session-1',
        role: 'assistant',
        content: 'Based on your notes...',
        created_at: new Date('2024-01-15T10:30:00'),
        rag_context: [
          {
            entry_id: 'entry-1',
            entry_date: '2024-01-10',
            text_snippet: 'This is a relevant snippet',
            score: 0.95,
          },
        ],
      },
    ];

    render(<MessageList messages={messageWithContext} isLoading={false} />);

    const toggleButton = screen.getByRole('button', { name: /Sources/ });

    // Initially not expanded
    expect(toggleButton.className).not.toContain('expanded');

    // Click to expand
    fireEvent.click(toggleButton);
    expect(toggleButton.className).toContain('expanded');
  });

  it('should track expanded state independently for multiple messages', () => {
    const messagesWithContext: ChatMessage[] = [
      {
        message_id: '1',
        session_id: 'session-1',
        role: 'assistant',
        content: 'First response',
        created_at: new Date('2024-01-15T10:30:00'),
        rag_context: [
          {
            entry_id: 'entry-1',
            entry_date: '2024-01-10',
            text_snippet: 'First snippet',
            score: 0.95,
          },
        ],
      },
      {
        message_id: '2',
        session_id: 'session-1',
        role: 'assistant',
        content: 'Second response',
        created_at: new Date('2024-01-15T10:31:00'),
        rag_context: [
          {
            entry_id: 'entry-2',
            entry_date: '2024-01-11',
            text_snippet: 'Second snippet',
            score: 0.90,
          },
        ],
      },
    ];

    render(<MessageList messages={messagesWithContext} isLoading={false} />);

    const toggleButtons = screen.getAllByRole('button', { name: /Sources/ });
    expect(toggleButtons).toHaveLength(2);

    // Expand only the first one
    fireEvent.click(toggleButtons[0]);

    expect(screen.getByText('First snippet')).toBeInTheDocument();
    expect(screen.queryByText('Second snippet')).not.toBeInTheDocument();

    // Expand the second one
    fireEvent.click(toggleButtons[1]);

    expect(screen.getByText('First snippet')).toBeInTheDocument();
    expect(screen.getByText('Second snippet')).toBeInTheDocument();
  });

  it('should display correct count for multiple sources', () => {
    const messageWithMultipleSources: ChatMessage[] = [
      {
        message_id: '1',
        session_id: 'session-1',
        role: 'assistant',
        content: 'Based on your notes...',
        created_at: new Date('2024-01-15T10:30:00'),
        rag_context: [
          { entry_id: 'entry-1', entry_date: '2024-01-10', text_snippet: 'Snippet 1', score: 0.95 },
          { entry_id: 'entry-2', entry_date: '2024-01-11', text_snippet: 'Snippet 2', score: 0.90 },
          { entry_id: 'entry-3', entry_date: '2024-01-12', text_snippet: 'Snippet 3', score: 0.85 },
        ],
      },
    ];

    render(<MessageList messages={messageWithMultipleSources} isLoading={false} />);
    expect(screen.getByText('Sources (3)')).toBeInTheDocument();
  });

  it('should render multiple messages in order', () => {
    render(<MessageList messages={mockMessages} isLoading={false} />);
    const messages = screen.getAllByText(/Hello|doing well/);
    expect(messages).toHaveLength(2);
  });

  it('should call scrollIntoView when messages change', () => {
    const { rerender } = render(<MessageList messages={[]} isLoading={false} />);
    rerender(<MessageList messages={mockMessages} isLoading={false} />);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
