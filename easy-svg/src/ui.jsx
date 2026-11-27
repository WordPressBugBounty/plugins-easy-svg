import { Children, forwardRef, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button as CButton,
  Input,
  InputGroup,
  VisuallyHidden,
  Box,
  Flex,
  HStack,
  VStack,
  Stack,
  Text,
  Heading,
  Badge,
  IconButton as CIconButton,
  Skeleton,
  SkeletonText,
  Tooltip as CTooltip,
  EmptyState as CEmptyState,
  Field,
  Combobox,
  createListCollection,
  Checkbox as CCheckbox,
  SimpleGrid,
  Switch,
} from '@chakra-ui/react'
import bulb from './brand/bulb.svg?inline'

// UnleashWP buttons as in the account app: navy for actions, yellow only for the Pro badge, weight 500 so it is never faux.
// forwardRef is load-bearing: Chakra's asChild triggers hand their child a ref, and without it they silently do nothing.
export const Button = /* @__PURE__ */ forwardRef(function Button(
  { variant = 'ghost', size = 'md', danger, children, ...rest },
  ref
) {
  const common = {
    size: size === 'sm' ? 'sm' : 'md',
    borderRadius: 'forge',
    fontWeight: 'medium',
    h: 'auto',
    // The 44px control raster every button on the panel has, label at 16px
    // and 500 like the theme's own buttons. minH, not h: a wrapping label may
    // still grow, and the tile actions pass their own minH to stay compact.
    fontSize: 'ui.body',
    lineHeight: 'ui.control',
    fontFamily: 'heading',
    minH: '11',
    py: '2',
    _focusVisible: { outline: '{borderWidths.ui.focus} solid', outlineColor: 'ui.primary', outlineOffset: '{borderWidths.ui.focus}' },
    'data-variant': variant,
  }

  if (variant === 'accent') {
    return (
      <CButton ref={ref} {...common} bg="yellow" color="navy" boxShadow="sm"
        _hover={{ bg: 'ui.accentHover' }} _active={{ transform: 'translateY({spacing.ui.nudge})' }}
        _disabled={{ opacity: 0.55, bg: 'yellow', color: 'navy', cursor: 'default' }} {...rest}>
        {children}
      </CButton>
    )
  }

  if (variant === 'primary') {
    // Hover lightens the navy instead of flipping to yellow: a full colour
    // swap reads as a state change, and yellow is the brand accent, not a
    // confirmation colour.
    return (
      <CButton ref={ref} {...common} bg="navy" color="white" boxShadow="sm"
        _hover={{ bg: 'ui.primaryHover' }} _active={{ transform: 'translateY({spacing.ui.nudge})' }}
        _disabled={{ opacity: 0.55, bg: 'navy', color: 'white', cursor: 'default' }} {...rest}>
        {children}
      </CButton>
    )
  }

  return (
    <CButton ref={ref} {...common} variant="outline" color="ui.primary" borderColor="ui.border"
      _hover={danger ? { color: 'ui.bad', borderColor: 'ui.bad' } : { borderColor: 'ui.primary', bg: 'ui.ghostHover' }}
      _active={{ transform: 'translateY({spacing.ui.nudge})' }} {...rest}>
      {children}
    </CButton>
  )
})

export function Card({ children, ...rest }) {
  return (
    <Box bg="ui.surface" borderWidth="ui.hair" borderColor="ui.border" borderRadius="forge"
      boxShadow="sm" px={{ base: '5', md: '6' }} py={{ base: '5', md: '6' }} {...rest}>
      {children}
    </Box>
  )
}

export const TextInput = /* @__PURE__ */ forwardRef(function TextInput({ type = 'text', ...rest }, ref) {
  return (
    <Input ref={ref} type={type} bg="ui.sunk" borderWidth="ui.hair" borderColor="ui.border" borderRadius="forge"
      color="ui.text"
      _focus={{ bg: 'ui.surface', borderColor: 'ui.primary', boxShadow: '0 0 0 {borderWidths.ui.heavy} var(--chakra-colors-ui\\.ring)' }}
      {...rest} />
  )
})

// Shared verbatim with easy-svg-pro's src/ui.jsx: props only, no literal user-facing strings, so each plugin localises its own copy.

// One setting per row; label is a real <label> for the control's id, and every row draws its own divider.
// Field.Root wires the description to the control as aria-describedby; without it a screen reader skipped the explanation.
export function FieldRow({ label, description, control, layout = 'inline', htmlFor }) {
  const head = (
    <VStack align="start" gap="1">
      <Field.Label
        htmlFor={htmlFor}
        fontSize="ui.body"
        fontWeight="medium"
        color="ui.heading"
        cursor={htmlFor ? 'pointer' : undefined}
      >
        {label}
      </Field.Label>
      {description ? (
        <Field.HelperText fontSize="ui.body" fontWeight="normal" lineHeight="ui.body" color="ui.muted" maxW="52ch" mt="0">
          {description}
        </Field.HelperText>
      ) : null}
    </VStack>
  )

  if (layout === 'stack') {
    return (
      <Field.Root py="4" borderBottomWidth="ui.hair" borderColor="ui.border" gap="0" _last={{ borderBottomWidth: '0', pb: '0' }}>
        <Box mb="3">{head}</Box>
        {/* Full width: Field.Root does not stretch its children, so a bare Box would shrink to the control. */}
        <Box w="full">{control}</Box>
      </Field.Root>
    )
  }

  // Flex props, not orientation=horizontal: that moved the description out from under its own label.
  return (
    <Field.Root
      display="flex"
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      gap="6"
      py="5"
      borderBottomWidth="ui.hair"
      borderColor="ui.border"
      // The card's edge closes the list; a line above it doubled it.
      _last={{ borderBottomWidth: '0', pb: '0' }}
    >
      {head}
      <Box flexShrink="0">{control}</Box>
    </Field.Root>
  )
}

// One on/off setting as a tile, so every switch on every screen looks alike; icon or logo sit in a small square before the label.

// The off track carries a border so it reads as a switch on white; the target is finger high.
// No "On"/"Off" beside it: the label names the switch and the switch says its own state.
function TileSwitch({ id, checked, disabled, onChange, size, describedBy }) {
  return (
    <HStack gap="2.5" flexShrink="0" minH="11">
      <Switch.Root ids={{ hiddenInput: id }} checked={checked} disabled={disabled} onCheckedChange={(e) => onChange(e.checked)} size={size}>
        <Switch.HiddenInput aria-describedby={describedBy} />
        {/* Drawn inside, not as a border: a border pushes the thumb off centre. */}
        <Switch.Control boxShadow="inset 0 0 0 {borderWidths.ui.hair} {colors.ui.wpBorder}" _checked={{ boxShadow: 'none' }}>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Root>
    </HStack>
  )
}

// The one switch the rest depends on: wider, taller and louder than a tile,
// so it reads as the start of the page. A click anywhere on it flips it.
export function MainSwitch({ id, checked, onChange, label, description, icon, disabled = false }) {
  return (
    <Field.Root
      data-main-switch={id}
      // Every switch on every screen is on in the brand's navy, never a second colour.
      colorPalette="brand"
      bg="ui.surface"
      borderRadius="lg"
      boxShadow="ui.card"
      borderWidth="ui.hair"
      // The switch says on or off; the frame only shows focus.
      borderColor="ui.border"
      _focusWithin={{ borderColor: 'ui.primary' }}
      px={{ base: '4', md: '6' }}
      py={{ base: '4', md: '6' }}
      cursor={disabled ? 'not-allowed' : 'pointer'}
      transition="border-color 0.15s ease, box-shadow 0.15s ease"
      _hover={{ boxShadow: 'ui.cardHover' }}
      onClick={(e) => {
        if (disabled || e.target.closest('label, input, a, button')) {
          return
        }
        onChange(!checked)
      }}
    >
      <HStack gap="5" align="flex-start" w="full">
        {icon ? (
          // A phone gives the title the room instead.
          <Flex
            display={{ base: 'none', sm: 'flex' }}
            align="center"
            justify="center"
            w="14"
            h="14"
            flexShrink="0"
            borderRadius="xl"
            bg={checked ? 'colorPalette.subtle' : 'ui.bg'}
            color={checked ? 'colorPalette.fg' : 'ui.primary'}
            css={{ '& svg': { width: '7', height: '7' } }}
            aria-hidden="true"
          >
            {icon}
          </Flex>
        ) : null}
        <Stack gap="2" minW="0" flex="1">
          <Field.Label htmlFor={id} m="0" fontSize="ui.2xl" fontWeight="bold" color="ui.heading" cursor={disabled ? undefined : 'pointer'}>
            {label}
          </Field.Label>
          {description ? (
            <Field.HelperText id={`${id}-desc`} as="span" m="0" fontSize="ui.lg" color="ui.muted">
              {description}
            </Field.HelperText>
          ) : null}
        </Stack>
        <TileSwitch id={id} checked={checked} disabled={disabled} onChange={onChange} size="lg" describedBy={description ? `${id}-desc` : undefined} />
      </HStack>
    </Field.Root>
  )
}

export function SwitchTile({ id, checked, onChange, label, description, disabled = false, note = null, icon = null, logo = null, badge = null, children = null }) {
  return (
    <Field.Root
      data-switch-tile={id}
      h="full"
      gap="1"
      px="5"
      py="5"
      // The whole tile is the switch: a click anywhere but on the switch or
      // its label (which toggle on their own) flips it.
      onClick={(e) => {
        if (disabled || e.target.closest('label, input, a, button')) {
          return
        }
        onChange(!checked)
      }}
      cursor={disabled ? 'not-allowed' : 'pointer'}
      // A white tile like the icon library's: whether it is on is the
      // switch's to say, not a frame around the whole tile.
      bg="ui.surface"
      borderRadius="md"
      boxShadow="ui.raised"
      transition="box-shadow 0.15s ease, transform 0.15s ease"
      _hover={{ boxShadow: 'ui.raisedHover', transform: 'translateY(calc(-1 * {spacing.ui.nudge}))' }}
      colorPalette="brand"
      alignItems="stretch"
    >
      <HStack justify="space-between" align="flex-start" gap="4">
        <HStack gap="3.5" align="flex-start" minW="0" flex="1">
          {logo ? (
            <Flex
              align="center"
              justify="center"
              w="12"
              h="12"
              flexShrink="0"
              borderRadius="lg"
              bg="white"
              borderWidth="ui.hair"
              borderColor="ui.border"
              overflow="hidden"
              css={{ '& svg': { width: '6', height: '6' } }}
              aria-hidden="true"
            >
              {'string' === typeof logo ? <Box as="img" src={logo} alt="" w="7" h="7" objectFit="contain" /> : logo}
            </Flex>
          ) : icon ? (
            <Flex
              align="center"
              justify="center"
              w="12"
              h="12"
              flexShrink="0"
              borderRadius="lg"
              bg="ui.bg"
              color="ui.primary"
              css={{ '& svg': { width: 'ui.glyphMd', height: 'ui.glyphMd' } }}
              aria-hidden="true"
            >
              {icon}
            </Flex>
          ) : null}
          <Stack gap="1.5" minW="0" flex="1">
            {badge ? (
              // A phone puts the badge under the title, where it has room.
              <Stack direction={{ base: 'column', md: 'row' }} gap={{ base: '1', md: '2' }} align={{ base: 'flex-start', md: 'center' }} minW="0">
                <Field.Label htmlFor={id} m="0" fontSize="ui.body" fontWeight="medium" color="ui.heading" cursor={disabled ? undefined : 'pointer'}>
                  {label}
                </Field.Label>
                {/* A quiet hint beside the title, e.g. the host is not installed. */}
                <ProBadge id={`${id}-badge`} variant="subtle" colorPalette="gray" flexShrink="0">{badge}</ProBadge>
              </Stack>
            ) : (
              <Field.Label htmlFor={id} m="0" fontSize="ui.body" fontWeight="medium" color="ui.heading" cursor={disabled ? undefined : 'pointer'}>
                {label}
              </Field.Label>
            )}
            {/* Wrapped, never cut: a German description is longer and still says how to use it. The grid keeps a row even. */}
            {description ? (
              <Text as="span" fontSize="ui.md" lineHeight="ui.snug" color="ui.muted" whiteSpace="normal" overflowWrap="break-word">
                {description}
              </Text>
            ) : null}
            {/* A sub-switch in here must not flip the tile when its own padding is clicked. */}
            {Children.count(children) > 0 ? (
              <Box onClick={(e) => e.stopPropagation()} cursor="default" pt="1">
                {children}
              </Box>
            ) : null}
          </Stack>
        </HStack>
        {/* The badge is the reason a switch is locked; a screen reader hears it too. */}
        <TileSwitch id={id} checked={checked} disabled={disabled} onChange={onChange} describedBy={badge ? `${id}-badge` : undefined} />
      </HStack>
      {note ? (
        <Field.HelperText fontSize="ui.sm" lineHeight="ui.body" color="ui.muted" mt="0" ps={icon || logo ? '16' : '0'}>
          {note}
        </Field.HelperText>
      ) : null}
    </Field.Root>
  )
}

// Tiles side by side: two on a laptop, three on a wide screen.
// A sticky toolbar whose grey fades in over the first stretch of scrolling, so what passes under it goes softly.
const STUCK_RANGE = 48
export function StickyBar({ children }) {
  const ref = useRef(null)
  useEffect(() => {
    let frame = 0
    const paint = () => {
      frame = 0
      if (ref.current) {
        ref.current.style.setProperty('--esw-stuck', String(Math.min(1, Math.max(0, window.scrollY / STUCK_RANGE))))
      }
    }
    const onScroll = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(paint)
      }
    }
    paint()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) {
        window.cancelAnimationFrame(frame)
      }
    }
  }, [])
  return (
    <Box
      ref={ref}
      data-sticky-bar
      position="sticky"
      top="calc(var(--esw-admin-bar, 0px) + {sizes.ui.header})"
      zIndex="2"
      mx={{ base: '-4', md: '-6' }}
      px={{ base: '4', md: '6' }}
      pt="3"
      pb="10"
      mt="-3"
      mb="-7"
      pointerEvents="none"
      css={{
        '--esw-stuck': '0',
        '& > *': { pointerEvents: 'auto', position: 'relative' },
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: '0',
          pointerEvents: 'none',
          bgImage: 'linear-gradient(to bottom, {colors.ui.bg} 0%, {colors.ui.bg} 62%, transparent 100%)',
          opacity: 'var(--esw-stuck)',
        },
        '& :is(.chakra-button, input)': {
          boxShadow: '0 calc({spacing.1} * var(--esw-stuck)) calc({spacing.3.5} * var(--esw-stuck)) color-mix(in srgb, {colors.ui.shadowInk} calc(9% * var(--esw-stuck)), transparent)',
        },
      }}
    >
      {children}
    </Box>
  )
}

export function TileGrid({ children }) {
  return (
    // Every row as tall as the tallest from md, so a tile with a note does not leave its neighbours short.
    <SimpleGrid columns={{ base: 1, md: 2, '2xl': 3 }} gridAutoRows={{ md: '1fr' }} gap="3">
      {children}
    </SimpleGrid>
  )
}

// A group's name over its tiles, on the page itself rather than in a card.
export function GroupTitle({ children, ...rest }) {
  return (
    <Heading as="h2" fontSize="ui.xl" fontWeight="bold" color="ui.heading" {...rest}>
      {children}
    </Heading>
  )
}

// A titled group of settings in ONE Card, replacing a stack of
// identical cards. Put FieldRows (or anything) as children; their dividers do
// the visual separation.
export function Section({ title, description, children }) {
  return (
    <Card>
      <Box mb="4">
        <Heading as="h2" fontSize="ui.xl" fontWeight="bold" color="ui.heading">
          {title}
        </Heading>
        {description ? (
          <Text fontSize="ui.body" fontWeight="normal" lineHeight="ui.body" color="ui.muted" mt="1">
            {description}
          </Text>
        ) : null}
      </Box>
      {children}
    </Card>
  )
}

// Autosave owns one write at a time, the server's answer as truth, and rollback on failure, because every caller got one of them wrong.
export function useAutosave(save, { delay = 600 } = {}) {
  const [value, setValue] = useState(null)
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  // Undo only for changes that take something away; a toast on every change is clicked away before it is read.
  const [undo, setUndo] = useState(null)

  // Refs, not state: the timer and the queue must not redraw anything, and the
  // callbacks below must see the latest of each without being rebuilt.
  const confirmed = useRef(null)
  const pending = useRef(null)
  const timer = useRef(null)
  const inFlight = useRef(false)
  const saveRef = useRef(save)
  saveRef.current = save

  useEffect(() => () => clearTimeout(timer.current), [])

  const undoTimer = useRef(null)
  useEffect(() => () => clearTimeout(undoTimer.current), [])

  const run = useCallback(async () => {
    if (inFlight.current || !pending.current) {
      return
    }
    const patch = pending.current
    pending.current = null
    // Read BEFORE the write: afterwards `confirmed` is the new value and there
    // is nothing left to go back to.
    const before = undoOf.current
    undoOf.current = null
    inFlight.current = true
    setState('saving')
    try {
      const resp = await saveRef.current(patch)
      // Undefined means "the caller has nothing to correct": keep what is on
      // screen rather than blanking the pane.
      if (undefined !== resp && null !== resp) {
        confirmed.current = resp
        setValue(resp)
      }
      setError('')
      setState('saved')
      if (before) {
        setUndo({ patch: before })
        clearTimeout(undoTimer.current)
        // Long enough to notice and reach, short enough not to become furniture.
        undoTimer.current = setTimeout(() => setUndo(null), 8000)
      }
    } catch (e) {
      // Back to the last value the server confirmed, and say so.
      if (null !== confirmed.current) {
        setValue(confirmed.current)
      }
      setError(e?.message || String(e))
      setState('error')
    } finally {
      inFlight.current = false
      // Anything that arrived while this was in flight goes now, in order.
      if (pending.current) {
        run()
      }
    }
  }, [])

  // The keys this write is about to overwrite, as the server last confirmed
  // them: collected at set() time, because by run() the queue may have
  // merged another patch on top.
  const undoOf = useRef(null)

  const set = useCallback(
    (patch, { typed = false, undoable = false } = {}) => {
      if (undoable && confirmed.current) {
        const was = {}
        let any = false
        Object.keys(patch).forEach((k) => {
          if (!Object.is(confirmed.current[k], patch[k])) {
            was[k] = confirmed.current[k]
            any = true
          }
        })
        // Nothing actually moved: no write worth undoing.
        if (any) {
          undoOf.current = { ...(undoOf.current || {}), ...was }
        }
      }
      setValue((v) => ({ ...(v || {}), ...patch }))
      pending.current = { ...(pending.current || {}), ...patch }
      clearTimeout(timer.current)
      if (typed) {
        timer.current = setTimeout(run, delay)
        return
      }
      run()
    },
    [run, delay]
  )

  // For onBlur, and for anything that must not wait out the pause.
  const flush = useCallback(() => {
    clearTimeout(timer.current)
    run()
  }, [run])

  // What a load hands over: the server's answer is the baseline from the start.
  const prime = useCallback((v) => {
    confirmed.current = v
    setValue(v)
    setState('idle')
    setError('')
  }, [])

  const prime_ = prime
  // Undo is an undoable write itself, so taking a removal back can be taken back again.
  const runUndo = useCallback(() => {
    if (!undo) {
      return
    }
    const patch = undo.patch
    setUndo(null)
    clearTimeout(undoTimer.current)
    set(patch, { undoable: true })
  }, [undo, set])

  return { value, state, error, set, flush, prime: prime_, confirmed, undo: undo ? runUndo : null }
}

// Every toast sits in the same corner, so each one is lifted over the ones shown before it; two never cover each other.
const shownToasts = []
function liftToasts() {
  let heights = 0
  shownToasts.forEach((el, i) => {
    el.style.setProperty('--esw-toast-lift', `calc(${heights}px + ${i} * var(--chakra-spacing-2))`)
    heights += el.offsetHeight
  })
}
export function useToastLift(ref) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) {
      return undefined
    }
    shownToasts.push(el)
    liftToasts()
    // A message that wraps to a second line makes the toasts above it move up with it.
    const watch = 'function' === typeof window.ResizeObserver ? new window.ResizeObserver(liftToasts) : null
    watch?.observe(el)
    return () => {
      watch?.disconnect()
      shownToasts.splice(shownToasts.indexOf(el), 1)
      liftToasts()
    }
  }, [ref])
}

// Over the page, not in it, so tiles do not jump; held while pointer or focus is on it so Undo is not snatched away.
// `status` keeps the colour the action had as an inline notice.
export function Toast({ children, onDismiss, dismissLabel, undo, undoLabel, busy, status = 'success', ms = 10000, ...rest }) {
  const [held, setHeld] = useState(false)
  const dismiss = useRef(onDismiss)
  dismiss.current = onDismiss
  // Restarted by a new message only: JSX children are a new object on every
  // render, and the toast would never go.
  const message = 'string' === typeof children ? children : null
  useEffect(() => {
    if (held) {
      return undefined
    }
    const t = setTimeout(() => dismiss.current?.(), ms)
    return () => clearTimeout(t)
  }, [message, held, ms])
  const box = useRef(null)
  useToastLift(box)
  const bad = 'error' === status
  return (
    <Alert.Root
      ref={box}
      data-toast
      data-status={status}
      status={bad ? 'error' : 'warning' === status ? 'warning' : 'success'}
      variant="surface"
      role={bad ? 'alert' : 'status'}
      aria-live={bad ? 'assertive' : 'polite'}
      position="fixed"
      bottom={{ base: 'calc({spacing.3} + var(--esw-toast-lift, 0px))', md: 'calc({sizes.ui.footer} + {spacing.4} + var(--esw-toast-lift, 0px))' }}
      insetEnd={{ base: '3', md: '6' }}
      zIndex="toast"
      w="auto"
      maxW="ui.actionBar"
      alignItems="center"
      boxShadow="lg"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      {...rest}
    >
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description fontSize="ui.body">{children}</Alert.Description>
      </Alert.Content>
      {undo ? (
        <Button size="sm" variant="outline" bg="ui.surface" onClick={undo} disabled={busy}>
          {undoLabel}
        </Button>
      ) : null}
      {dismissLabel ? (
        <CIconButton aria-label={dismissLabel} title={dismissLabel} variant="ghost" size="sm" onClick={() => dismiss.current?.()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </CIconButton>
      ) : null}
    </Alert.Root>
  )
}

/** The way back from a change that took something away, for eight seconds. */
export function UndoToast({ onUndo, label, undoLabel }) {
  if (!onUndo) {
    return null
  }
  // The same toast as every other; it goes when the undo runs out.
  return (
    <Toast undo={onUndo} undoLabel={undoLabel} ms={8000}>
      {label}
    </Toast>
  )
}

// Long enough to be seen after a click, short enough not to stay as a line under the tiles.
const SAVED_VISIBLE_MS = 2000

// Polite while saving so it does not interrupt; a failure is an alert because it needs reading.
export function SaveState({ state, error, savingLabel, savedLabel }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if ('saved' !== state) {
      setShown(false)
      return undefined
    }
    setShown(true)
    const t = setTimeout(() => setShown(false), SAVED_VISIBLE_MS)
    return () => clearTimeout(t)
  }, [state])
  if ('error' === state) {
    return (
      <Text as="span" role="alert" fontSize="ui.body" color="ui.bad">
        {error}
      </Text>
    )
  }
  // One node for both, so the live region is not rebuilt when "Saved" fades back to screen readers only.
  return (
    <Text as="span" data-save-state role="status" aria-live="polite" srOnly={!shown} fontSize="ui.body" color="ui.muted">
      {'saving' === state ? savingLabel : 'saved' === state ? savedLabel : ''}
    </Text>
  )
}

// Reference/Object.is equality one level deep. Note: 2 !== '2', so normalise
// value types (number vs string from inputs) before trusting the result.
export function shallowEqual(a, b) {
  if (Object.is(a, b)) {
    return true
  }
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false
  }
  const ak = Object.keys(a)
  const bk = Object.keys(b)
  if (ak.length !== bk.length) {
    return false
  }
  for (const k of ak) {
    if (!Object.prototype.hasOwnProperty.call(b, k) || !Object.is(a[k], b[k])) {
      return false
    }
  }
  return true
}

// The caller owns the look, this owns the behaviour; dragleave fires on every child, so the related target decides if the pointer left.
// The drop prevents the default, so useDropGuard leaves it alone.
export function useDropZone({ onFiles, disabled }) {
  const [isOver, setOver] = useState(false)
  // A file let go elsewhere, or dragged out of the window, never sends this zone a leave: the mark would stay.
  useEffect(() => {
    if (!isOver) {
      return undefined
    }
    const clear = () => setOver(false)
    const left = (e) => {
      if (!e.relatedTarget) {
        setOver(false)
      }
    }
    window.addEventListener('drop', clear, true)
    window.addEventListener('dragend', clear, true)
    window.addEventListener('dragleave', left, true)
    return () => {
      window.removeEventListener('drop', clear, true)
      window.removeEventListener('dragend', clear, true)
      window.removeEventListener('dragleave', left, true)
    }
  }, [isOver])
  if (disabled) {
    return { isOver: false, props: {} }
  }
  // Files only: a tile dragged across the grid is a move, not an upload.
  const carriesFiles = (e) => Array.from((e.dataTransfer && e.dataTransfer.types) || []).includes('Files')
  return {
    isOver,
    props: {
      onDragEnter: (e) => {
        if (!carriesFiles(e)) return
        e.preventDefault()
        setOver(true)
      },
      onDragOver: (e) => {
        if (!carriesFiles(e)) return
        e.preventDefault()
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'copy'
        }
        setOver(true)
      },
      onDragLeave: (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setOver(false)
        }
      },
      onDrop: (e) => {
        if (!carriesFiles(e)) return
        e.preventDefault()
        setOver(false)
        onFiles(e.dataTransfer && e.dataTransfer.files)
      },
    },
  }
}

// Without this a file dropped beside a zone opened in the browser and discarded the admin page.
// Drops another handler already took, like the media frame's, are left alone.
export function useDropGuard(onMiss) {
  const miss = useRef(onMiss)
  miss.current = onMiss
  useEffect(() => {
    const over = (e) => {
      if (!e.defaultPrevented) {
        e.preventDefault()
      }
    }
    const drop = (e) => {
      if (e.defaultPrevented) {
        return
      }
      e.preventDefault()
      if (miss.current) {
        miss.current()
      }
    }
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [])
}

// Centred empty state: the bulb, a bold line, a short
// muted one, an optional action (pass a <Button>). All copy comes in as props;
// `icon` replaces the bulb where a symbol says more.
export function EmptyState({ icon, title, description, action, contentProps, ...rest }) {
  return (
    <CEmptyState.Root py="12" {...rest}>
      {/* wp-admin's unlayered margins on p and h3 doubled every gap here. */}
      <CEmptyState.Content gap="3" css={{ '& :is(p, h3)': { margin: 0 } }} {...contentProps}>
        {icon ? (
          <CEmptyState.Indicator>{icon}</CEmptyState.Indicator>
        ) : (
          <Box as="img" src={bulb} alt="" w="3.5rem" h="3.5rem" />
        )}
        <VStack textAlign="center" gap="1">
          <CEmptyState.Title fontSize="ui.xl" fontWeight="bold" color="ui.heading">
            {title}
          </CEmptyState.Title>
          {description ? (
            <CEmptyState.Description fontSize="ui.body" lineHeight="ui.relaxed" color="ui.muted" maxW="48ch">{description}</CEmptyState.Description>
          ) : null}
        </VStack>
        {action ? <Box pt="1">{action}</Box> : null}
      </CEmptyState.Content>
    </CEmptyState.Root>
  )
}

// Loading placeholder shaped like a column of FieldRows, so a pane keeps its
// height and nothing jumps when the data arrives.
export function SkeletonRows({ rows = 4 }) {
  return (
    <Box>
      {Array.from({ length: rows }).map((_, i) => (
        <Flex
          key={i}
          align="center"
          justify="space-between"
          gap="6"
          py="4"
          borderBottomWidth="ui.hair"
          borderColor="ui.border"
        >
          <Box flex="1">
            <Skeleton height="3.5" width="38%" mb="2" />
            <SkeletonText noOfLines={1} width="68%" />
          </Box>
          <Skeleton height="8" width="ui.skeletonLabel" borderRadius="forge" flexShrink="0" />
        </Flex>
      ))}
    </Box>
  )
}

// The label is passed in so tabs localise it; fontWeight is explicit because Ubuntu ships no 500 and the recipe default renders faux.
export function ProBadge({ children, ...rest }) {
  return (
    <Badge colorPalette="brand" variant="solid" size="sm" fontWeight="bold" {...rest}>
      {children}
    </Badge>
  )
}

// aria-live repeats the role because a notice inserted after first paint is only announced when the region says how.
// `retry` is passed in so each plugin keeps its own text domain; without onRetry the page reloads.
export function Notice({ bad, role, status, title, retry, onRetry, children, ...rest }) {
  const live = role === 'alert' ? 'assertive' : role === 'status' ? 'polite' : undefined
  const resolved = status || (bad ? 'error' : 'info')
  return (
    <Alert.Root
      role={role}
      aria-live={live}
      status={resolved}
      // Named on the element, so a test reads the status the reader sees.
      data-status={resolved}
      variant="subtle"
      // Brand navy for a plain notice: Chakra's info palette is its own blue,
      // and this panel has exactly one blue.
      colorPalette={'info' === resolved ? 'brand' : undefined}
      borderWidth="ui.hair"
      borderStartWidth="ui.heavy"
      borderStartColor="colorPalette.solid"
      borderColor="ui.border"
      borderRadius="forge"
      alignItems={title ? 'flex-start' : 'center'}
      fontSize="ui.body"
      {...rest}
    >
      <Alert.Indicator />
      {title ? (
        <Alert.Content>
          <Alert.Title>{title}</Alert.Title>
          <Alert.Description>{children}</Alert.Description>
        </Alert.Content>
      ) : (
        <Alert.Title flex="1" fontWeight="normal">{children}</Alert.Title>
      )}
      {retry ? (
        // A caller that can ask again in place says how; otherwise the page is loaded again.
        <Button size="sm" onClick={onRetry || (() => window.location.reload())}>
          {retry}
        </Button>
      ) : null}
    </Alert.Root>
  )
}

// One label serves as the accessible name and the tooltip, so the two cannot
// drift apart. Not portalled: the panel's styles are scoped to its subtree, and
// a tooltip in document.body would render in wp-admin's face.
export function IconAction({ label, danger, children, ...rest }) {
  return (
    <CTooltip.Root openDelay={250} closeDelay={80} positioning={{ placement: 'top' }}>
      <CTooltip.Trigger asChild>
        <CIconButton
          aria-label={label}
          variant="ghost"
          size="sm"
          borderRadius="forge"
          color="ui.muted"
          _hover={danger ? { color: 'ui.bad', bg: 'ui.badBg' } : { color: 'ui.primary', bg: 'ui.ghostHover' }}
          _focusVisible={{ outline: '{borderWidths.ui.focus} solid', outlineColor: 'ui.primary', outlineOffset: '{borderWidths.ui.focus}' }}
          {...rest}
        >
          {children}
        </CIconButton>
      </CTooltip.Trigger>
      <CTooltip.Positioner>
        <CTooltip.Content
          bg="ui.heading"
          color="ui.surface"
          fontSize="ui.sm"
          fontWeight="normal"
          px="2"
          py="1"
          borderRadius="forge"
        >
          <CTooltip.Arrow>
            {/* Zag paints the tip itself; only a value of its own beats that. */}
            <CTooltip.ArrowTip css={{ background: '{colors.ui.heading} !important', borderColor: 'transparent' }} />
          </CTooltip.Arrow>
          {label}
        </CTooltip.Content>
      </CTooltip.Positioner>
    </CTooltip.Root>
  )
}

// A real label, visually hidden: a visible one would repeat the placeholder.
// `w` fixes the width, else the field fills its row up to `maxW`; `size="sm"` in a
// compact toolbar. Without an `id` one is made, so the label is still tied to the field.
export function SearchField({
  id, label, ariaLabel, placeholder, value, onChange, onKeyDown, autoFocus, w, maxW = 'ui.searchMax', size = 'md',
}) {
  const made = useId()
  const fieldId = id || made
  const box = w ? { w, minW: '0', flexShrink: '1' } : { flex: '1', maxW, minW: '40' }
  return (
    <Box {...box}>
      <VisuallyHidden as="label" htmlFor={fieldId}>{label}</VisuallyHidden>
      {/* Decorative: the label above names the field. */}
      <InputGroup
        startElement={
          <Box as="svg" aria-hidden="true" viewBox="0 0 24 24" boxSize="4" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" color="ui.muted">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </Box>
        }
      >
        {/* Aimed at the attribute so the panel's padding beats wp-admin's forms.css and the magnifier clears the placeholder. */}
        <TextInput
          id={fieldId}
          type="search"
          size={size}
          ps="9"
          data-esw-search="true"
          aria-label={ariaLabel}
          autoFocus={autoFocus}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
      </InputGroup>
    </Box>
  )
}

// The words a list's search field and its no-match line say. Each plugin
// sets them once, translated, before it draws (this file holds no copy).
const selectCopy = { search: 'Search', empty: 'Nothing found', add: 'Add “%s”' }
export function setSelectCopy(copy) {
  Object.assign(selectCopy, copy)
}
const CREATE_PREFIX = '\uE000'

// Search at the top of the open list, so a long list of sets or icons is found by typing.
// `trigger` swaps the field for the caller's own button; `creatable` offers the typed text when no item matches.
export const SearchSelect = /* @__PURE__ */ forwardRef(function SearchSelect(
  { value, onChange, items, label, id, disabled, placeholder, trigger, creatable, ...rest },
  ref
) {
  const [query, setQuery] = useState('')
  // The search field lives in the list, so closing it hides focus; the trigger takes it back unless the user moved on.
  const triggerEl = useRef(null)
  const contentEl = useRef(null)
  const setTrigger = useCallback(
    (node) => {
      triggerEl.current = node
      if ('function' === typeof ref) {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    },
    [ref]
  )
  const giveFocusBack = useCallback(() => {
    window.requestAnimationFrame(() => {
      const at = document.activeElement
      if (!at || at === document.body || contentEl.current?.contains(at)) {
        triggerEl.current?.focus()
      }
    })
  }, [])
  const [open, setOpen] = useState(false)
  // Inside the other plugin's drawer another Chakra copy does not see this list on top, so Escape is taken here first.
  useEffect(() => {
    if (!open) {
      return undefined
    }
    const onKey = (e) => {
      if ('Escape' !== e.key || e.isComposing) {
        return
      }
      e.stopPropagation()
      e.preventDefault()
      setOpen(false)
      setQuery('')
      giveFocusBack()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, giveFocusBack])
  const shown = useMemo(() => {
    const t = query.trim().toLowerCase()
    const found = t ? items.filter((it) => String(it.label).toLowerCase().includes(t)) : items
    if (!creatable || !t || items.some((it) => t === String(it.value).toLowerCase() || t === String(it.label).toLowerCase())) {
      return found
    }
    // A private-use prefix no real value carries (NUL breaks CSS.escape lookups).
    // A function replacer keeps $& or $1 in the typed text literal.
    return [...found, { value: CREATE_PREFIX + query.trim(), label: selectCopy.add.replace('%s', () => query.trim()) }]
  }, [items, query, creatable])
  const collection = useMemo(
    () =>
      createListCollection({
        items: shown,
        itemToValue: (it) => String(it.value),
        itemToString: (it) => String(it.label),
        isItemDisabled: (it) => !!it.disabled,
      }),
    [shown]
  )
  const current = items.find((it) => String(it.value) === String(value))
  return (
    <Combobox.Root
      collection={collection}
      value={undefined === value || null === value ? [] : [String(value)]}
      onValueChange={(e) => {
        if (e.value.length) {
          if (e.value[0].startsWith(CREATE_PREFIX)) {
            onChange(e.value[0].slice(CREATE_PREFIX.length))
            return
          }
          const picked = items.find((it) => String(it.value) === e.value[0])
          onChange(picked ? picked.value : e.value[0])
        }
      }}
      inputValue={query}
      onInputValueChange={(e) => setQuery(e.inputValue)}
      open={open}
      onOpenChange={(e) => {
        setOpen(e.open)
        if (!e.open) {
          setQuery('')
          giveFocusBack()
        }
      }}
      selectionBehavior="clear"
      inputBehavior="autohighlight"
      // zag merges positioning over sameWidth: true, so the "+" case must turn it
      // off or the list is as narrow as the button.
      positioning={trigger ? { placement: 'bottom-end', sameWidth: false, strategy: 'fixed' } : { sameWidth: true, strategy: 'fixed' }}
      disabled={disabled}
      w={trigger ? 'auto' : 'full'}
      {...rest}
    >
      {/* The input and list point at this label, so it must exist even unseen. */}
      <Combobox.Label srOnly>{label}</Combobox.Label>
      <Combobox.Control>
        {trigger ? (
          <Combobox.Trigger ref={setTrigger} id={id} focusable asChild>
            {trigger}
          </Combobox.Trigger>
        ) : (
          <Combobox.Trigger focusable asChild>
            <CButton
              ref={setTrigger}
              id={id}
              aria-label={label}
              variant="outline"
              w="full"
              h="11"
              px="3"
              justifyContent="space-between"
              gap="2"
              bg="ui.surface"
              borderColor="ui.border"
              borderRadius="forge"
              color="ui.text"
              fontSize="ui.body"
              fontWeight="normal"
              _hover={{ bg: 'ui.surface', borderColor: 'ui.muted' }}
              _expanded={{ borderColor: 'ui.primary' }}
            >
              <Box as="span" truncate textAlign="start" flex="1" minW="0">
                {current ? current.label : placeholder || ''}
              </Box>
              <Box as="svg" viewBox="0 0 24 24" w="4" h="4" flexShrink="0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </Box>
            </CButton>
          </Combobox.Trigger>
        )}
      </Combobox.Control>
      <Combobox.Positioner>
        <Combobox.Content ref={contentEl} px="0" py="0" minW={trigger ? 'xs' : undefined} bg="ui.menu" borderWidth="ui.hair" borderColor="ui.border" boxShadow="lg" maxH="none" overflow="hidden">
          <Box position="relative" borderBottomWidth="ui.hair" borderColor="ui.border">
            <Box as="svg" viewBox="0 0 24 24" position="absolute" insetStart="3" top="50%" transform="translateY(-50%)" w="4" h="4" color="ui.muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </Box>
            <Combobox.Input
              placeholder={selectCopy.search}
              aria-label={trigger ? label : selectCopy.search}
              h="11"
              fontSize="ui.body"
              border="none"
              outline="none"
              bg="transparent"
              // wp-admin's field rules are unlayered and beat Chakra's.
              style={{ paddingInlineStart: '2.25rem', border: 'none', boxShadow: 'none', background: 'transparent', minHeight: 0 }}
            />
          </Box>
          {/* Only the list scrolls, and only up and down. */}
          <Box overflowY="auto" overflowX="hidden" p="1" maxH="ui.menuMax" css={{ scrollbarWidth: 'thin', scrollbarColor: '{colors.ui.scrollbar} transparent' }}>
            <Combobox.Empty px="3" py="2" fontSize="ui.body" color="ui.muted">{selectCopy.empty}</Combobox.Empty>
            {collection.items.map((it) => (
              <Combobox.Item
                item={it}
                key={String(it.value)}
                fontSize="ui.body"
                py="2"
                cursor="pointer"
                borderRadius="forge"
                _highlighted={{ bg: 'ui.primary', color: 'white' }}
              >
                <Combobox.ItemText flex="1" minW="0" truncate>{it.label}</Combobox.ItemText>
                {it.hint ? (
                  <Box as="span" flexShrink="0" fontSize="ui.sm" opacity="0.7" fontFamily="mono">{it.hint}</Box>
                ) : null}
                <Combobox.ItemIndicator />
              </Combobox.Item>
            ))}
          </Box>
        </Combobox.Content>
      </Combobox.Positioner>
    </Combobox.Root>
  )
})

// The same, written with <option> children as a native <select> is: the
// options become the list's items, so the callers stay as they were.
// `onChange` receives the value, not the event. Layout props go to the root.
export const Select = /* @__PURE__ */ forwardRef(function Select({ value, onChange, label, id, disabled, children, ...rest }, ref) {
  const items = []
  Children.toArray(children).forEach((child) => {
    if (isValidElement(child) && 'option' === child.type) {
      items.push({ value: child.props.value ?? '', label: Children.toArray(child.props.children).join(''), disabled: !!child.props.disabled })
    }
  })
  return (
    <Box minW="ui.menuMin" {...rest}>
      <SearchSelect ref={ref} id={id} label={label} value={value} onChange={onChange} items={items} disabled={disabled} />
    </Box>
  )
})

// A checkbox with a real <input> underneath, so forms, tests and screen readers
// see a checkbox. Without visible children the label is the accessible name.
// `onChange` receives the boolean.
export function Checkbox({ checked, onChange, label, children, ...rest }) {
  return (
    <CCheckbox.Root
      checked={!!checked}
      onCheckedChange={(d) => onChange(true === d.checked)}
      colorPalette="brand"
      // lg is the 20px box: the 16px one is hard to hit (WCAG 2.5.8).
      size="lg"
      {...rest}
    >
      <CCheckbox.HiddenInput aria-label={children ? undefined : label} />
      <CCheckbox.Control borderColor="ui.border" />
      {children ? <CCheckbox.Label fontSize="ui.body" color="ui.text">{children}</CCheckbox.Label> : null}
    </CCheckbox.Root>
  )
}

// A label over its control, with an optional helper line wired to it as
// aria-describedby. Pass the control's id as `htmlFor`.
export function FormField({ label, htmlFor, help, children, ...rest }) {
  return (
    <Field.Root gap="1.5" {...rest}>
      <Field.Label htmlFor={htmlFor} fontSize="ui.body" fontWeight="bold" color="ui.heading" cursor="pointer">
        {label}
      </Field.Label>
      {children}
      {help ? (
        <Field.HelperText fontSize="ui.body" lineHeight="ui.body" color="ui.muted" mt="0">
          {help}
        </Field.HelperText>
      ) : null}
    </Field.Root>
  )
}
