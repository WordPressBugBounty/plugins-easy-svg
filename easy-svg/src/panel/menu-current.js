// WordPress marks the current submenu entry once, on load; the panel switches pages without a load.
export function markMenuPage(doc, page, pageOfTab) {
  let slug = ''
  try {
    slug = new URL(doc.location.href).searchParams.get('page') || ''
  } catch {
    return
  }
  const menu = slug ? doc.getElementById(`toplevel_page_${slug}`)?.querySelector('.wp-submenu') : null
  if (!menu) {
    return
  }
  menu.querySelectorAll('li > a[href]').forEach((a) => {
    let params
    try {
      params = new URL(a.getAttribute('href'), doc.baseURI).searchParams
    } catch {
      return
    }
    if (slug !== params.get('page')) {
      return
    }
    const tab = params.get('tab')
    const on = (tab ? pageOfTab(tab) : 'icons') === page
    a.classList.toggle('current', on)
    a.parentElement?.classList.toggle('current', on)
    if (on) {
      a.setAttribute('aria-current', 'page')
    } else {
      a.removeAttribute('aria-current')
    }
  })
}
