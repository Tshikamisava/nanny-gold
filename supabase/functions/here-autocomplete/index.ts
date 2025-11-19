import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helpers
const toRad = (v: number) => (v * Math.PI) / 180;
const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const norm = (s?: string) => (s || '').toLowerCase().trim();

async function getLocalityHint(key: string, proximity?: { lat: number; lng: number }) {
  if (!proximity) return { text: '', parts: {} as any };
  try {
    const rev = new URL('https://us1.locationiq.com/v1/reverse.php');
    rev.searchParams.set('key', key);
    rev.searchParams.set('lat', String(proximity.lat));
    rev.searchParams.set('lon', String(proximity.lng));
    rev.searchParams.set('format', 'json');
    rev.searchParams.set('addressdetails', '1');
    const r = await fetch(rev.toString());
    if (!r.ok) return { text: '', parts: {} as any };
    const j = await r.json();
    const addr = j.address || {};
    const suburb = addr.suburb || addr.neighbourhood || addr.city_district || '';
    const city = addr.city || addr.town || addr.village || addr.municipality || '';
    const county = addr.county || addr.state_district || '';
    const state = addr.state || addr.province || '';
    const locality = [suburb, city || county, state].filter(Boolean).join(', ');
    return { text: locality, parts: { suburb, city, county, state } };
  } catch {
    return { text: '', parts: {} as any };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, resolveText, proximity } = await req.json()

    if (!resolveText && (!query || query.length < 3)) {
      return new Response(
        JSON.stringify({ error: 'Query must be at least 3 characters long' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Switch from HERE to LocationIQ Autocomplete
    const locationIqKey = Deno.env.get('LOCATIONIQ_API_KEY')
    console.log('LocationIQ key present:', !!locationIqKey)

    if (!locationIqKey) {
      console.error('LocationIQ API key not found in environment')
      return new Response(
        JSON.stringify({ error: 'LocationIQ API key not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    // If a direct resolution text is provided, perform a forward geocode search and return the best match
    if (resolveText && resolveText.length >= 3) {
      const { text: localityText, parts: localityParts } = await getLocalityHint(locationIqKey, proximity);
      const q = localityText ? `${resolveText}, ${localityText}` : resolveText;

      const searchUrl = new URL('https://api.locationiq.com/v1/search.php')
      searchUrl.searchParams.set('key', locationIqKey)
      searchUrl.searchParams.set('q', q)
      searchUrl.searchParams.set('limit', '5')
      searchUrl.searchParams.set('countrycodes', 'za')
      searchUrl.searchParams.set('addressdetails', '1')
      searchUrl.searchParams.set('accept-language', 'en')

      console.log('Requesting LocationIQ search:', searchUrl.toString().replace(locationIqKey, '[API_KEY]'))
      const res = await fetch(searchUrl.toString())
      if (!res.ok) {
        const txt = await res.text()
        // Gracefully degrade for not-found type errors
        if (res.status === 404 || res.status === 422) {
          console.warn(`LocationIQ search returned ${res.status}: ${txt}`)
          return new Response(JSON.stringify({ items: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
        }
        console.error(`LocationIQ search error: ${res.status} - ${txt}`)
        throw new Error(`LocationIQ search error: ${res.status}`)
      }
      const results = await res.json()

      const items = Array.isArray(results) ? results.map((item: any) => {
        const lat = parseFloat(String(item.lat))
        const lon = parseFloat(String(item.lon))
        const addr = item.address || {}
        const address = {
          houseNumber: addr.house_number,
          street: addr.road || addr.pedestrian || addr.footway || addr.path,
          district: addr.suburb || addr.neighbourhood || addr.city_district,
          city: addr.city || addr.town || addr.village || addr.municipality,
          county: addr.county || addr.state_district,
          state: addr.state || addr.province,
          countryName: addr.country,
          postalCode: addr.postcode,
          label: item.display_name
        }
        return { id: String(item.place_id || item.osm_id || `${lat},${lon}`), title: item.display_name, address, position: { lat, lng: lon } }
      }) : []

      // Score and sort by closeness to the user and locality match
      const tokens = norm(resolveText).split(/\s|,|-/).filter(Boolean)
      const preferredCity = norm(localityParts.city || localityParts.county)

      const scored = items.map((it: any) => {
        let score = 0
        if (proximity && it.position?.lat && it.position?.lng) {
          const d = haversineKm(proximity, it.position)
          if (d < 5) score += 30
          else if (d < 10) score += 20
          else if (d < 20) score += 10
          else if (d > 40) score -= 10
        }
        const street = norm(it.address?.street)
        const house = norm(it.address?.houseNumber)
        tokens.forEach(t => { if (t && street.includes(t)) score += 5 })
        if (house && tokens.some(t => /\d+/.test(t) && house.includes(t))) score += 25
        const city = norm(it.address?.city)
        const district = norm(it.address?.district)
        if (preferredCity && (city.includes(preferredCity) || preferredCity.includes(city) || district.includes(preferredCity))) score += 20
        return { it, score }
      })
        .sort((a, b) => b.score - a.score)
        .map(({ it }) => it)

      return new Response(
        JSON.stringify({ items: scored.slice(0, 5) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // LocationIQ Autocomplete endpoint (restricted to South Africa)
    const url = new URL('https://api.locationiq.com/v1/autocomplete.php')
    url.searchParams.set('key', locationIqKey)
    url.searchParams.set('q', query)
    url.searchParams.set('limit', '8')
    url.searchParams.set('countrycodes', 'za')
    url.searchParams.set('dedupe', '1')
    url.searchParams.set('accept-language', 'en')

    // If proximity passed, bias results to user's vicinity using a small bounding box
    if (proximity && typeof proximity.lat === 'number' && typeof proximity.lng === 'number') {
      const lat = Number(proximity.lat)
      const lon = Number(proximity.lng)
      const delta = 0.35 // ~35km radius
      const viewbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`
      url.searchParams.set('viewbox', viewbox)
      url.searchParams.set('bounded', '1')
    }

    console.log('Requesting LocationIQ autocomplete:', url.toString().replace(locationIqKey, '[API_KEY]'))
    const response = await fetch(url.toString())

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`LocationIQ error: ${response.status} - ${errorText}`)
      throw new Error(`LocationIQ API error: ${response.status}`)
    }

    const results = await response.json()

    // Normalize to the HERE-like shape expected by the frontend: { items: [...] }
    const items = Array.isArray(results) ? results.map((item: any) => {
      const lat = parseFloat(String(item.lat))
      const lon = parseFloat(String(item.lon))
      const addr = item.address || {}

      const address = {
        houseNumber: addr.house_number,
        street: addr.road || addr.pedestrian || addr.footway || addr.path,
        district: addr.suburb || addr.neighbourhood || addr.city_district,
        city: addr.city || addr.town || addr.village || addr.municipality,
        county: addr.county || addr.state_district,
        state: addr.state || addr.province,
        countryName: addr.country,
        postalCode: addr.postcode,
        label: item.display_name
      }

      return {
        id: String(item.place_id || item.osm_id || `${lat},${lon}`),
        title: item.display_name,
        address,
        position: { lat, lng: lon }
      }
    }) : []

    return new Response(
      JSON.stringify({ items }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )


  } catch (error) {
    console.error('Error in here-autocomplete function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})