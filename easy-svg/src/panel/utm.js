// Names the place in the plugin a visitor clicked, for the analytics. Only www and support: the account has no
// analytics and its links feed sign-in, and a shop moved elsewhere by the easy_svg_pro_url filter is not ours to tag.
// Same rule as easy_svg_utm_url() in includes/utm.php.
const HOSTS = ['www.unleash-wp.com', 'support.unleash-wp.com']

export function utmUrl(address, campaign, content) {
  const raw = 'string' === typeof address ? address : ''
  let url
  try {
    url = new URL(raw)
  } catch {
    return raw
  }
  if ('https:' !== url.protocol || !HOSTS.includes(url.hostname) || url.port || url.username) return raw
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith('utm_')) url.searchParams.delete(key)
  }
  url.searchParams.set('utm_source', 'easy-svg')
  url.searchParams.set('utm_medium', 'plugin')
  url.searchParams.set('utm_campaign', campaign)
  url.searchParams.set('utm_content', content)
  return url.toString()
}
