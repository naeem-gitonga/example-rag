import { submitEntry, submitFileContent, SubmitEntryParams } from '../api';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('api', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('submitEntry', () => {
    const defaultParams: SubmitEntryParams = {
      entryDate: '2024-01-15',
      text: 'Test entry text',
      moods: ['happy', 'calm'],
    };

    it('should submit entry with correct payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await submitEntry(defaultParams);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8002',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody).toEqual({
        action: 'ingest',
        entry_date: '2024-01-15',
        text: 'Test entry text',
        moods: ['happy', 'calm'],
      });
    });

    it('should include entry_id when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await submitEntry({ ...defaultParams, entryId: 'my-file.txt' });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.entry_id).toBe('my-file.txt');
    });

    it('should not include entry_id when not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await submitEntry(defaultParams);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody).not.toHaveProperty('entry_id');
    });

    it('should return success response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await submitEntry(defaultParams);

      expect(result).toEqual({ success: true });
    });

    it('should throw error with message from response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Invalid entry date' }),
      });

      await expect(submitEntry(defaultParams)).rejects.toThrow('Invalid entry date');
    });

    it('should throw error with statusText when no message in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
        json: async () => ({}),
      });

      await expect(submitEntry(defaultParams)).rejects.toThrow(
        'Submit failed: Internal Server Error'
      );
    });

    it('should handle json parse failure gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Gateway',
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(submitEntry(defaultParams)).rejects.toThrow('Submit failed: Bad Gateway');
    });
  });

  describe('submitFileContent', () => {
    it('should read file content and submit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const fileContent = 'File content here';
      const file = new File([fileContent], 'test.txt', { type: 'text/plain' });
      // Mock the text() method since jsdom doesn't support it fully
      file.text = jest.fn().mockResolvedValue(fileContent);

      await submitFileContent(file, '2024-01-15', ['happy']);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody).toEqual({
        action: 'ingest',
        entry_date: '2024-01-15',
        text: 'File content here',
        moods: ['happy'],
        entry_id: 'test.txt',
      });
    });

    it('should use file name as entry_id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const fileContent = 'content';
      const file = new File([fileContent], 'my-document.md', { type: 'text/markdown' });
      file.text = jest.fn().mockResolvedValue(fileContent);

      await submitFileContent(file, '2024-01-15', []);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.entry_id).toBe('my-document.md');
    });
  });
});
