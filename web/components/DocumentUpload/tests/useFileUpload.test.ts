import { renderHook, act } from '@testing-library/react';
import { useFileUpload, getTodayDate } from '../hooks/useFileUpload';
import * as api from '../api';

jest.mock('../api');
const mockSubmitFileContent = api.submitFileContent as jest.MockedFunction<
  typeof api.submitFileContent
>;

describe('useFileUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTodayDate', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const result = getTodayDate();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('initial state', () => {
    it('should initialize with empty files', () => {
      const { result } = renderHook(() => useFileUpload());
      expect(result.current.files).toEqual([]);
    });

    it('should initialize with empty upload statuses', () => {
      const { result } = renderHook(() => useFileUpload());
      expect(result.current.uploadStatuses).toEqual([]);
    });

    it('should initialize with isDragging false', () => {
      const { result } = renderHook(() => useFileUpload());
      expect(result.current.isDragging).toBe(false);
    });

    it('should initialize with today\'s date', () => {
      const { result } = renderHook(() => useFileUpload());
      const today = new Date().toISOString().split('T')[0];
      expect(result.current.fileDate).toBe(today);
    });

    it('should initialize with empty moods', () => {
      const { result } = renderHook(() => useFileUpload());
      expect(result.current.fileMoods).toEqual([]);
    });
  });

  describe('setFileDate', () => {
    it('should update file date', () => {
      const { result } = renderHook(() => useFileUpload());

      act(() => {
        result.current.setFileDate('2024-06-15');
      });

      expect(result.current.fileDate).toBe('2024-06-15');
    });
  });

  describe('toggleMood', () => {
    it('should add mood when not selected', () => {
      const { result } = renderHook(() => useFileUpload());

      act(() => {
        result.current.toggleMood('happy');
      });

      expect(result.current.fileMoods).toContain('happy');
    });

    it('should remove mood when already selected', () => {
      const { result } = renderHook(() => useFileUpload());

      act(() => {
        result.current.toggleMood('happy');
      });

      act(() => {
        result.current.toggleMood('happy');
      });

      expect(result.current.fileMoods).not.toContain('happy');
    });
  });

  describe('drag handlers', () => {
    it('should set isDragging true on dragOver', () => {
      const { result } = renderHook(() => useFileUpload());
      const event = { preventDefault: jest.fn() } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragOver(event);
      });

      expect(result.current.isDragging).toBe(true);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should set isDragging false on dragLeave', () => {
      const { result } = renderHook(() => useFileUpload());
      const event = { preventDefault: jest.fn() } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragOver(event);
      });

      act(() => {
        result.current.handleDragLeave(event);
      });

      expect(result.current.isDragging).toBe(false);
    });

    it('should add files on drop', () => {
      const { result } = renderHook(() => useFileUpload());
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const event = {
        preventDefault: jest.fn(),
        dataTransfer: { files: [file] },
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDrop(event);
      });

      expect(result.current.isDragging).toBe(false);
      expect(result.current.files).toHaveLength(1);
      expect(result.current.files[0].name).toBe('test.txt');
    });
  });

  describe('handleFileSelect', () => {
    it('should add selected files', () => {
      const { result } = renderHook(() => useFileUpload());
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const event = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileSelect(event);
      });

      expect(result.current.files).toHaveLength(1);
      expect(result.current.uploadStatuses).toHaveLength(1);
      expect(result.current.uploadStatuses[0]).toEqual({
        name: 'test.txt',
        status: 'pending',
      });
    });

    it('should handle null files', () => {
      const { result } = renderHook(() => useFileUpload());
      const event = {
        target: { files: null },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileSelect(event);
      });

      expect(result.current.files).toHaveLength(0);
    });
  });

  describe('removeFile', () => {
    it('should remove file at index', () => {
      const { result } = renderHook(() => useFileUpload());
      const file1 = new File(['content1'], 'test1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'test2.txt', { type: 'text/plain' });

      act(() => {
        const event = {
          target: { files: [file1, file2] },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        result.current.handleFileSelect(event);
      });

      act(() => {
        result.current.removeFile(0);
      });

      expect(result.current.files).toHaveLength(1);
      expect(result.current.files[0].name).toBe('test2.txt');
      expect(result.current.uploadStatuses).toHaveLength(1);
    });
  });

  describe('uploadAll', () => {
    it('should upload all files', async () => {
      mockSubmitFileContent.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useFileUpload());
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      act(() => {
        const event = {
          target: { files: [file] },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        result.current.handleFileSelect(event);
        result.current.toggleMood('happy');
        result.current.setFileDate('2024-01-15');
      });

      await act(async () => {
        await result.current.uploadAll();
      });

      expect(mockSubmitFileContent).toHaveBeenCalledWith(file, '2024-01-15', ['happy']);
      expect(result.current.uploadStatuses[0].status).toBe('success');
    });

    it('should set uploading status during upload', async () => {
      let resolvePromise: (value: { success: boolean }) => void;
      mockSubmitFileContent.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderHook(() => useFileUpload());
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      act(() => {
        const event = {
          target: { files: [file] },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        result.current.handleFileSelect(event);
      });

      act(() => {
        result.current.uploadAll();
      });

      expect(result.current.uploadStatuses[0].status).toBe('uploading');

      await act(async () => {
        resolvePromise!({ success: true });
      });
    });

    it('should set error status on failed upload', async () => {
      mockSubmitFileContent.mockRejectedValue(new Error('Upload failed'));

      const { result } = renderHook(() => useFileUpload());
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      act(() => {
        const event = {
          target: { files: [file] },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        result.current.handleFileSelect(event);
      });

      await act(async () => {
        await result.current.uploadAll();
      });

      expect(result.current.uploadStatuses[0].status).toBe('error');
      expect(result.current.uploadStatuses[0].message).toBe('Upload failed');
    });
  });

  describe('clearCompleted', () => {
    it('should remove completed files', async () => {
      mockSubmitFileContent.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useFileUpload());
      const file1 = new File(['content1'], 'test1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'test2.txt', { type: 'text/plain' });

      act(() => {
        const event = {
          target: { files: [file1, file2] },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        result.current.handleFileSelect(event);
      });

      // Upload only first file
      mockSubmitFileContent.mockResolvedValueOnce({ success: true });
      await act(async () => {
        // Manually set first file to success
        result.current.uploadAll();
      });

      act(() => {
        result.current.clearCompleted();
      });

      // Should only have pending files left
      const pendingFiles = result.current.uploadStatuses.filter(
        (s) => s.status === 'pending'
      );
      expect(result.current.files.length).toBe(pendingFiles.length);
    });

    it('should keep pending files', () => {
      const { result } = renderHook(() => useFileUpload());
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      act(() => {
        const event = {
          target: { files: [file] },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        result.current.handleFileSelect(event);
      });

      act(() => {
        result.current.clearCompleted();
      });

      expect(result.current.files).toHaveLength(1);
      expect(result.current.uploadStatuses).toHaveLength(1);
    });
  });

  describe('openFileDialog', () => {
    it('should have fileInputRef', () => {
      const { result } = renderHook(() => useFileUpload());
      expect(result.current.fileInputRef).toBeDefined();
    });
  });
});
