import { renderHook, act, waitFor } from '@testing-library/react';
import { useTextEntry, getTodayDate } from '../hooks/useTextEntry';
import * as api from '../api';

jest.mock('../api');
const mockSubmitEntry = api.submitEntry as jest.MockedFunction<typeof api.submitEntry>;

describe('useTextEntry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTodayDate', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const result = getTodayDate();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return today\'s date', () => {
      const result = getTodayDate();
      const today = new Date().toISOString().split('T')[0];
      expect(result).toBe(today);
    });
  });

  describe('initial state', () => {
    it('should initialize with empty text', () => {
      const { result } = renderHook(() => useTextEntry());
      expect(result.current.entryText).toBe('');
    });

    it('should initialize with today\'s date', () => {
      const { result } = renderHook(() => useTextEntry());
      const today = new Date().toISOString().split('T')[0];
      expect(result.current.entryDate).toBe(today);
    });

    it('should initialize with empty topics', () => {
      const { result } = renderHook(() => useTextEntry());
      expect(result.current.selectedTopics).toEqual([]);
    });

    it('should initialize with null submit status', () => {
      const { result } = renderHook(() => useTextEntry());
      expect(result.current.submitStatus).toBeNull();
    });

    it('should not be submittable initially', () => {
      const { result } = renderHook(() => useTextEntry());
      expect(result.current.canSubmit).toBe(false);
    });
  });

  describe('setEntryText', () => {
    it('should update entry text', () => {
      const { result } = renderHook(() => useTextEntry());

      act(() => {
        result.current.setEntryText('New entry');
      });

      expect(result.current.entryText).toBe('New entry');
    });

    it('should enable submit when text is not empty', () => {
      const { result } = renderHook(() => useTextEntry());

      act(() => {
        result.current.setEntryText('Some text');
      });

      expect(result.current.canSubmit).toBe(true);
    });

    it('should disable submit when text is only whitespace', () => {
      const { result } = renderHook(() => useTextEntry());

      act(() => {
        result.current.setEntryText('   ');
      });

      expect(result.current.canSubmit).toBe(false);
    });
  });

  describe('setEntryDate', () => {
    it('should update entry date', () => {
      const { result } = renderHook(() => useTextEntry());

      act(() => {
        result.current.setEntryDate('2024-06-15');
      });

      expect(result.current.entryDate).toBe('2024-06-15');
    });
  });

  describe('toggleTopic', () => {
    it('should add topic when not selected', () => {
      const { result } = renderHook(() => useTextEntry());

      act(() => {
        result.current.toggleTopic('happy');
      });

      expect(result.current.selectedTopics).toContain('happy');
    });

    it('should remove topic when already selected', () => {
      const { result } = renderHook(() => useTextEntry());

      act(() => {
        result.current.toggleTopic('happy');
      });

      act(() => {
        result.current.toggleTopic('happy');
      });

      expect(result.current.selectedTopics).not.toContain('happy');
    });

    it('should allow multiple topics', () => {
      const { result } = renderHook(() => useTextEntry());

      act(() => {
        result.current.toggleTopic('happy');
        result.current.toggleTopic('calm');
        result.current.toggleTopic('grateful');
      });

      expect(result.current.selectedTopics).toEqual(['happy', 'calm', 'grateful']);
    });
  });

  describe('submit', () => {
    it('should not submit when text is empty', async () => {
      const { result } = renderHook(() => useTextEntry());

      await act(async () => {
        await result.current.submit();
      });

      expect(mockSubmitEntry).not.toHaveBeenCalled();
    });

    it('should set uploading status when submitting', async () => {
      mockSubmitEntry.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      const { result } = renderHook(() => useTextEntry());

      act(() => {
        result.current.setEntryText('Test entry');
      });

      act(() => {
        result.current.submit();
      });

      expect(result.current.submitStatus?.status).toBe('uploading');
    });

    it('should call submitEntry with correct params', async () => {
      mockSubmitEntry.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useTextEntry());

      act(() => {
        result.current.setEntryText('Test entry');
        result.current.setEntryDate('2024-01-15');
        result.current.toggleTopic('happy');
      });

      await act(async () => {
        await result.current.submit();
      });

      expect(mockSubmitEntry).toHaveBeenCalledWith({
        entryDate: '2024-01-15',
        text: 'Test entry',
        topics: ['happy'],
      });
    });

    it('should set success status on successful submit', async () => {
      mockSubmitEntry.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useTextEntry());

      act(() => {
        result.current.setEntryText('Test entry');
      });

      await act(async () => {
        await result.current.submit();
      });

      expect(result.current.submitStatus?.status).toBe('success');
      expect(result.current.submitStatus?.message).toBe('Entry saved successfully');
    });

    it('should clear form on successful submit', async () => {
      mockSubmitEntry.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useTextEntry());

      act(() => {
        result.current.setEntryText('Test entry');
        result.current.toggleTopic('happy');
      });

      await act(async () => {
        await result.current.submit();
      });

      expect(result.current.entryText).toBe('');
      expect(result.current.selectedTopics).toEqual([]);
    });

    it('should set error status on failed submit', async () => {
      mockSubmitEntry.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useTextEntry());

      act(() => {
        result.current.setEntryText('Test entry');
      });

      await act(async () => {
        await result.current.submit();
      });

      expect(result.current.submitStatus?.status).toBe('error');
      expect(result.current.submitStatus?.message).toBe('Network error');
    });

    it('should handle non-Error rejections', async () => {
      mockSubmitEntry.mockRejectedValueOnce('Unknown error');

      const { result } = renderHook(() => useTextEntry());

      act(() => {
        result.current.setEntryText('Test entry');
      });

      await act(async () => {
        await result.current.submit();
      });

      expect(result.current.submitStatus?.status).toBe('error');
      expect(result.current.submitStatus?.message).toBe('Submit failed');
    });
  });
});
