// Where the footer's stars lead. Pro's window takes the stars as ?rating=; wordpress.org takes none, so it is one link.
export function reviewLinks(reviewUrl, proReviewUrl) {
  const given = (proReviewUrl ?? '').trim()
  let pro = null
  try {
    pro = given ? new URL(given) : null
  } catch {
    pro = null
  }
  if (!pro || !/^https?:$/.test(pro.protocol)) return { kind: 'wporg', url: reviewUrl }
  const stars = [1, 2, 3, 4, 5].map((n) => {
    const u = new URL(pro.href)
    u.searchParams.set('rating', String(n))
    return u.href
  })
  return { kind: 'pro', text: given, stars }
}
