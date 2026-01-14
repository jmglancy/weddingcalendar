// api/get-blocked-dates.js
// This endpoint fetches your VRBO and Airbnb calendars and returns blocked dates

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Your iCal feed URLs
  const feeds = [
    'https://www.vrbo.com/icalendar/29d83731920940b8978e5fc9adba0429.ics?nonTentative',
    'https://www.airbnb.com/calendar/ical/1240887315214502365.ics?t=6c360d13f1654e938af04bf13da1181b'
  ];

  const blockedDates = new Set();
  const errors = [];

  for (const feedUrl of feeds) {
    try {
      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CalendarSync/1.0)'
        }
      });

      if (!response.ok) {
        errors.push(`Failed to fetch ${feedUrl.includes('vrbo') ? 'VRBO' : 'Airbnb'}: ${response.status}`);
        continue;
      }

      const text = await response.text();

      // Parse iCal format and extract events
      const events = text.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];

      events.forEach(event => {
        const startMatch = event.match(/DTSTART[^:]*:(\d{8})/);
        const endMatch = event.match(/DTEND[^:]*:(\d{8})/);

        if (startMatch && endMatch) {
          let current = parseICalDate(startMatch[1]);
          const end = parseICalDate(endMatch[1]);

          // Add each day in the range (end date is exclusive in iCal)
          while (current < end) {
            blockedDates.add(formatDate(current));
            current.setDate(current.getDate() + 1);
          }
        }
      });

    } catch (error) {
      errors.push(`Error fetching ${feedUrl.includes('vrbo') ? 'VRBO' : 'Airbnb'}: ${error.message}`);
    }
  }

  // Return the blocked dates
  res.status(200).json({
    blockedDates: Array.from(blockedDates).sort(),
    lastUpdated: new Date().toISOString(),
    errors: errors.length > 0 ? errors : undefined
  });
}

function parseICalDate(str) {
  return new Date(
    parseInt(str.substr(0, 4)),
    parseInt(str.substr(4, 2)) - 1,
    parseInt(str.substr(6, 2))
  );
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
