// An answer can lie by arriving late or by failing quietly, so a missing part looks like a smaller whole.

// Each call to `ask()` starts a request and hands back `isLatest()`; only the
// newest request's answer may land, whatever order the answers come back in.
export function latestOnly() {
  let last = 0
  return function ask() {
    const mine = ++last
    return () => mine === last
  }
}

// Every provider asked at once. One that throws is counted, not turned into
// an empty list, so the library can say part of it did not load.
// can_edit false makes a collection read only for every action; true never unlocks one.
export function settleCollections(providers, ask) {
  return Promise.all(
    providers.map((p) =>
      Promise.resolve()
        .then(() => ask(p))
        .then(
          (list) => ({ list: Array.isArray(list) ? list.map((c) => ({ ...c, ...(c && false === c.can_edit ? { readonly: true } : {}), provider: p })) : [], failed: false }),
          () => ({ list: [], failed: true })
        )
    )
  ).then((answers) => ({
    collections: answers.flatMap((a) => a.list).filter((c) => c && c.id && Array.isArray(c.icons)),
    failed: answers.filter((a) => a.failed).length,
  }))
}

// Each source of a change run on its own, in turn: one that fails is
// counted and does not stop or hide the others, so Undo can take back only what
// was done.
export async function settleEach(jobs) {
  const done = []
  const failed = []
  for (const job of jobs) {
    try {
      await job.run()
      done.push(job)
    } catch (error) {
      failed.push({ job, error })
    }
  }
  return { done, failed }
}

// A provider's cheap index() first, its full load() when index() fails; also
// when index() throws before it hands back a promise.
export function indexOrLoad(p, signal) {
  if ('function' !== typeof p.index) {
    return p.load({ signal })
  }
  return Promise.resolve()
    .then(() => p.index({ signal }))
    .catch(() => p.load({ signal }))
}
