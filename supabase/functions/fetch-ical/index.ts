const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { calendarId, typeHint } = await req.json()
    if (!calendarId) {
      return new Response(JSON.stringify({ error: 'calendarId requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('GOOGLE_CALENDAR_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Clé API manquante' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const timeMin = new Date().toISOString()
    const encoded = encodeURIComponent(calendarId)
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encoded}/events?key=${apiKey}&singleEvents=true&orderBy=startTime&timeMin=${timeMin}&maxResults=50`

    const response = await fetch(url)
    if (!response.ok) {
      const err = await response.text()
      return new Response(JSON.stringify({ error: `Google API: ${response.status}`, detail: err }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    const events = (data.items ?? []).map((item: Record<string, unknown>) => {
      const start = (item.start as Record<string, string>) ?? {}
      const dateTime = start.dateTime ?? start.date ?? ''
      const summary = (item.summary as string) ?? 'Événement'

      let type = typeHint ?? 'evenement'
      if (!typeHint) {
        const lower = summary.toLowerCase()
        if (lower.includes('messe') || lower.includes('eucharistie') || lower.includes('office')) {
          type = 'messe'
        } else if (lower.includes('confession') || lower.includes('réconciliation')) {
          type = 'confession'
        }
      }

      return {
        id: item.id,
        type,
        titre: summary,
        dateHeure: dateTime,
        description: item.description ?? null,
        source: 'google_calendar',
      }
    })

    return new Response(JSON.stringify({ events }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
