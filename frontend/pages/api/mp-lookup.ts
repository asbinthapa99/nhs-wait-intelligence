import type { NextApiRequest, NextApiResponse } from 'next'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { postcode } = req.query
  if (!postcode || typeof postcode !== 'string') {
    return res.status(400).json({ error: 'postcode query parameter is required' })
  }

  const pc = postcode.replace(/\s+/g, '').toUpperCase()

  try {
    // Parliament Members API — search by postcode
    const parlRes = await fetch(
      `https://members-api.parliament.uk/api/Members/Search?PostCode=${encodeURIComponent(pc)}&take=1`,
      { headers: { Accept: 'application/json' } }
    )
    if (!parlRes.ok) {
      return res.status(404).json({ error: 'No MP found for that postcode. Check it is a valid UK postcode.' })
    }
    const parlJson = await parlRes.json() as {
      items?: Array<{
        value: {
          id: number
          nameDisplayAs: string
          latestParty: { name: string }
          latestHouseMembership: { membershipFrom: string }
          thumbnailUrl: string
        }
      }>
      totalResults?: number
    }

    if (!parlJson.items?.length) {
      return res.status(404).json({ error: 'No MP found for that postcode.' })
    }

    const member = parlJson.items[0].value
    const constituency = member.latestHouseMembership?.membershipFrom ?? 'Unknown constituency'

    // Map constituency → NHS region using NHS England geography
    const nhsRegion = mapConstituencyToRegion(constituency, pc)

    // Fetch NHS regional data from our backend
    let nhsData = null
    try {
      const nhsRes = await fetch(`${API_BASE}/api/regions`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      })
      if (nhsRes.ok) {
        const regions = await nhsRes.json() as Array<{
          id: number
          name: string
          region_code: string
          total_waiting: number
          pct_over_18_weeks: number
          inequality_score: number
          trend: string
          backlog_rate_per_100k: number
        }>
        const matched = regions.find(r =>
          nhsRegion && r.name.toLowerCase().includes(nhsRegion.toLowerCase())
        ) ?? regions[0]
        if (matched) {
          nhsData = {
            region: matched.name,
            total_waiting: matched.total_waiting,
            pct_over_18_weeks: matched.pct_over_18_weeks,
            inequality_score: matched.inequality_score,
            trend: matched.trend,
            backlog_rate_per_100k: matched.backlog_rate_per_100k,
          }
        }
      }
    } catch {
      // NHS data optional — proceed without it
    }

    return res.status(200).json({
      mp: {
        id: member.id,
        name: member.nameDisplayAs,
        party: member.latestParty?.name ?? 'Unknown',
        constituency,
        email: null,
        thumbnail: member.thumbnailUrl ?? null,
        url: `https://members.parliament.uk/member/${member.id}/contact`,
      },
      nhs: nhsData,
    })
  } catch {
    return res.status(500).json({ error: 'Failed to contact the Parliament API. Try again shortly.' })
  }
}

function mapConstituencyToRegion(constituency: string, postcode: string): string {
  const c = constituency.toLowerCase()
  const pc = postcode.slice(0, 2).toUpperCase()

  // London postcodes
  const londonPrefixes = ['E', 'EC', 'N', 'NW', 'SE', 'SW', 'W', 'WC', 'BR', 'CR', 'DA', 'EN', 'HA', 'IG', 'KT', 'RM', 'SM', 'TW', 'UB', 'WD']
  if (londonPrefixes.some(p => postcode.startsWith(p))) return 'London'

  // North East
  if (['NE', 'DH', 'SR', 'TS', 'DL'].some(p => pc.startsWith(p))) return 'North East'

  // North West
  if (['M', 'OL', 'BL', 'WN', 'SK', 'CH', 'WA', 'PR', 'FY', 'BB', 'LA'].some(p => pc.startsWith(p) || postcode.startsWith(p))) return 'North West'

  // Yorkshire
  if (['LS', 'BD', 'HX', 'HD', 'WF', 'HG', 'YO', 'DN', 'HU', 'S'].some(p => pc.startsWith(p))) return 'Yorkshire and the Humber'

  // Midlands
  if (['B', 'CV', 'DY', 'WS', 'WV', 'ST', 'TF', 'SY', 'HR', 'WR', 'LE', 'NN', 'MK', 'LU', 'SG', 'AL', 'HP', 'OX', 'RG', 'GL', 'WR'].some(p => pc.startsWith(p))) return 'Midlands'

  // East of England
  if (['CB', 'IP', 'NR', 'CO', 'CM', 'SS', 'PE'].some(p => pc.startsWith(p))) return 'East of England'

  // South West
  if (['BS', 'BA', 'TA', 'EX', 'PL', 'TQ', 'TR', 'DT', 'SP', 'SN', 'GL'].some(p => pc.startsWith(p))) return 'South West'

  // South East
  if (['SO', 'PO', 'GU', 'RH', 'BN', 'TN', 'ME', 'CT', 'DA', 'BR', 'KT'].some(p => pc.startsWith(p))) return 'South East'

  // Constituency name fallback
  if (c.includes('london') || c.includes('hackney') || c.includes('islington') || c.includes('southwark') || c.includes('lambeth')) return 'London'
  if (c.includes('manchester') || c.includes('liverpool') || c.includes('lancashire') || c.includes('cumbria')) return 'North West'
  if (c.includes('yorkshire') || c.includes('leeds') || c.includes('sheffield') || c.includes('bradford') || c.includes('hull')) return 'Yorkshire and the Humber'
  if (c.includes('newcastle') || c.includes('sunderland') || c.includes('durham') || c.includes('middlesbrough')) return 'North East'
  if (c.includes('birmingham') || c.includes('coventry') || c.includes('wolverhampton') || c.includes('nottingham') || c.includes('derby')) return 'Midlands'
  if (c.includes('norfolk') || c.includes('suffolk') || c.includes('cambridge') || c.includes('essex') || c.includes('hertford')) return 'East of England'
  if (c.includes('bristol') || c.includes('cornwall') || c.includes('devon') || c.includes('somerset') || c.includes('dorset')) return 'South West'
  if (c.includes('kent') || c.includes('sussex') || c.includes('surrey') || c.includes('hampshire') || c.includes('oxfordshire')) return 'South East'

  return 'England'
}
