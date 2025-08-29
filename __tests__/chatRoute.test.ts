import { POST } from '../app/api/chat/route';

describe('POST /api/chat', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.LLM_BASE_URL;
  });

  it('returns error when LLM_BASE_URL not set', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ question: 'hi', role: 'patient' })
    });

    const res = await POST(req as any);
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('LLM_BASE_URL not set');
  });

  it('returns model response text', async () => {
    process.env.LLM_BASE_URL = 'https://llm.example.com';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hello' } }] })
    }) as any;

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ question: 'hi', role: 'patient' })
    });

    const res = await POST(req as any);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://llm.example.com/chat/completions',
      expect.any(Object)
    );
    expect(await res.text()).toBe('hello');
  });
});
