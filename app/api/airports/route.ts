import { NextResponse } from 'next/server';
import { loadAirportsDynamic } from '@/lib/airports-dynamic';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min( parseInt(searchParams.get('limit') || '50'), 200 );

    const all = await loadAirportsDynamic();

    const filtered = q
      ? all.filter(a => {
          return [a.iata, a.icao, a.name, a.city, a.country]
            .filter(Boolean)
            .some(v => v.toLowerCase().includes(q));
        })
      : all;

    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(Math.max(1, page), pages);
    const start = (currentPage - 1) * limit;
    const slice = filtered.slice(start, start + limit).map(a => ({
      iata: a.iata || '',
      icao: a.icao || '',
      name: a.name,
      city: a.city,
      country: a.country,
      timezone: a.tz,
    }));

    return NextResponse.json({
      data: slice,
      pagination: {
        page: currentPage,
        limit,
        total,
        pages,
      },
      query: q || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 });
  }
}
