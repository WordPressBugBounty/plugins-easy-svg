import { __ } from '@wordpress/i18n'

// A REST answer is in the site language unless it carries _locale=user; & when the root is ?rest_route=.
export function inReaderLanguage(url) {
  return `${url}${url.includes('?') ? '&' : '?'}_locale=user`
}

// Thin REST client for the panel. Nonce rides X-WP-Nonce; credentials stay
// same-origin so the logged-in admin cookie authenticates. Free routes live
// under easy-svg/v1; a ctx from the panel carries { restRoot, nonce }.
export function makeApi({ restRoot, nonce }, namespace = 'easy-svg/v1') {
  const base = `${restRoot}${namespace}`
  // Plain permalinks put the route in `?rest_route=`, so a path's own query joins with `&`.
  const at = (path) => (base.includes('?') ? `${base}${path.replace('?', '&')}` : `${base}${path}`)
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json', 'X-WP-Nonce': nonce }

  // An unreachable site rejects with the browser's own text, in the browser's language.
  async function send(url, init) {
    try {
      return await fetch(url, init)
    } catch (e) {
      if ('AbortError' === e.name) throw e
      throw new Error(__('Could not reach your site. Please reload.', 'easy-svg'))
    }
  }
  async function readError(response, fallback) {
    try {
      const data = await response.json()
      // WordPress's own refusals arrive in its words, not ours; these say what to do.
      if ('rest_cookie_invalid_nonce' === data?.code) {
        return __('Your session has expired. Please reload the page.', 'easy-svg')
      }
      if ('rest_forbidden' === data?.code) {
        return __('You may not do this here. Ask an administrator.', 'easy-svg')
      }
      if ('rest_no_route' === data?.code) {
        return __('This is not available here. Reload the page.', 'easy-svg')
      }
      if ('string' === typeof data?.code && data.code.startsWith('rest_')) {
        return fallback
      }
      return data?.message || fallback
    } catch {
      return fallback
    }
  }
  // The status stays on the error for the support report, never in the sentence.
  async function refusal(response, fallback) {
    const e = new Error(await readError(response, fallback))
    e.status = response.status
    return e
  }
  // Callers abort on unmount, so a late or out-of-order load never lands pre-save values in a gone tab.
  async function get(path, { signal } = {}) {
    const r = await send(inReaderLanguage(at(path)), { headers, credentials: 'same-origin', signal })
    if (!r.ok) {
      throw await refusal(r, __('Could not load. Reload the page.', 'easy-svg'))
    }
    return r.json()
  }
  async function post(path, body, { signal } = {}) {
    const r = await send(inReaderLanguage(at(path)), {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify(body || {}),
      signal,
    })
    if (!r.ok) {
      throw await refusal(r, __('Not saved. Reload the page and try again.', 'easy-svg'))
    }
    return r.json()
  }
  return { get, post, supportReport: (opts) => get('/support/report', opts) }
}
