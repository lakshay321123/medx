import { GET } from '../app/api/rxnorm/route';

describe('GET /api/rxnorm', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches data for provided query', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: '123' })
    });
    global.fetch = mockFetch as any;
    const req = new Request('http://localhost/api/rxnorm?q=aspirin');
    const res = await GET(req as any);
    expect(mockFetch).toHaveBeenCalledWith('https://rxnav.nlm.nih.gov/REST/rxcui.json?name=aspirin');
    const data = await res.json();
    expect(data).toEqual({ id: '123' });
  });

  it('defaults to metformin when query missing', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: '456' })
    });
    global.fetch = mockFetch as any;
    const req = new Request('http://localhost/api/rxnorm');
    await GET(req as any);
    expect(mockFetch).toHaveBeenCalledWith('https://rxnav.nlm.nih.gov/REST/rxcui.json?name=metformin');
  });
});
