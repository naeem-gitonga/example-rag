import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopicSelector } from '../TopicSelector';
import { DEFAULT_TOPICS } from '../types';

// Mock the styles
jest.mock('../DocumentUpload.module.scss', () => ({
  formGroup: 'formGroup',
  label: 'label',
  topicSelector: 'topicSelector',
  topicChip: 'topicChip',
  selected: 'selected',
  customTopicInputWrapper: 'customTopicInputWrapper',
  customTopicInput: 'customTopicInput',
  addTopicButton: 'addTopicButton',
}));

describe('TopicSelector', () => {
  const defaultProps = {
    selectedTopics: [] as string[],
    onToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all default topics', () => {
    render(<TopicSelector {...defaultProps} />);

    DEFAULT_TOPICS.forEach((topic) => {
      expect(screen.getByRole('button', { name: topic })).toBeInTheDocument();
    });
  });

  it('should render with default label', () => {
    render(<TopicSelector {...defaultProps} />);

    expect(screen.getByText('Topics')).toBeInTheDocument();
  });

  it('should render with custom label', () => {
    render(<TopicSelector {...defaultProps} label="Custom Label" />);

    expect(screen.getByText('Custom Label')).toBeInTheDocument();
  });

  it('should call onToggle when topic is clicked', () => {
    const onToggle = jest.fn();
    render(<TopicSelector {...defaultProps} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('button', { name: 'science' }));

    expect(onToggle).toHaveBeenCalledWith('science');
  });

  it('should apply selected class to selected topics', () => {
    render(<TopicSelector {...defaultProps} selectedTopics={['science', 'physics']} />);

    const scienceButton = screen.getByRole('button', { name: 'science' });
    const physicsButton = screen.getByRole('button', { name: 'physics' });
    const artButton = screen.getByRole('button', { name: 'art' });

    expect(scienceButton).toHaveClass('selected');
    expect(physicsButton).toHaveClass('selected');
    expect(artButton).not.toHaveClass('selected');
  });

  it('should have type="button" to prevent form submission', () => {
    render(<TopicSelector {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  it('should render custom topics', () => {
    render(
      <TopicSelector
        {...defaultProps}
        customTopics={['custom1', 'custom2']}
        onAddCustomTopic={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'custom1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'custom2' })).toBeInTheDocument();
  });

  it('should show custom topic input when onAddCustomTopic is provided', () => {
    render(
      <TopicSelector
        {...defaultProps}
        onAddCustomTopic={jest.fn()}
      />
    );

    expect(screen.getByPlaceholderText('Add custom topic...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('should not show custom topic input when onAddCustomTopic is not provided', () => {
    render(<TopicSelector {...defaultProps} />);

    expect(screen.queryByPlaceholderText('Add custom topic...')).not.toBeInTheDocument();
  });

  it('should call onAddCustomTopic when add button is clicked', () => {
    const onAddCustomTopic = jest.fn();
    render(
      <TopicSelector
        {...defaultProps}
        onAddCustomTopic={onAddCustomTopic}
      />
    );

    const input = screen.getByPlaceholderText('Add custom topic...');
    fireEvent.change(input, { target: { value: 'newtopic' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAddCustomTopic).toHaveBeenCalledWith('newtopic');
  });

  it('should disable Add button when input is empty', () => {
    render(
      <TopicSelector
        {...defaultProps}
        onAddCustomTopic={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });
});
