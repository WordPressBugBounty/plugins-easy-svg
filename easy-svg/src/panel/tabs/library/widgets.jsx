import { useId, useRef } from 'react'
import {
  Badge,
  Box,
  Card,
  DataList,
  Float,
  Portal,
  Tooltip,
  Text,
} from '@chakra-ui/react'
import { SearchSelect } from '../../../ui.jsx'
import { sanitizeSvg, scopeSvgIds, nameOf, PANEL_ROOT } from './helpers.js'

// The checkbox is never removed from the tab order and always shows where there is no hover.
// A label beside its value, as the media library's attachment details lay
// them out; stacked on a phone.
export function DetailRow({ label, htmlFor, help, children, ...rest }) {
  return (
    <DataList.Item
      flexDirection={{ base: 'column', sm: 'row' }}
      // Label and field share one axis; a help line under the field keeps the label at its top.
      alignItems={{ base: 'stretch', sm: help ? 'flex-start' : 'center' }}
      gap={{ base: '1', sm: '4' }}
      w="full"
      {...rest}
    >
      <DataList.ItemLabel minW="28" pt={{ sm: help ? '2.5' : '0' }} fontSize="ui.body" fontWeight="medium" color="ui.heading" asChild={!!htmlFor}>
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : label}
      </DataList.ItemLabel>
      <DataList.ItemValue mb="0" flexDirection="column" alignItems="stretch" gap="1" minW="0" flex="1" w="full">
        {children}
        {help ? <Text fontSize="ui.md" color="ui.muted">{help}</Text> : null}
      </DataList.ItemValue>
    </DataList.Item>
  )
}

// The tile in the hand: the same square, in the brand's dark blue.
export function DragPicture({ ic, count, size }) {
  const scope = useId()
  const side = size ? `${size}px` : 'ui.tile'
  return (
    <Card.Root
      data-drag-picture
      variant="elevated"
      w={side}
      aspectRatio="1"
      bg="colorPalette.solid"
      color="colorPalette.contrast"
      borderWidth="0"
      boxShadow="xl"
      cursor="grabbing"
      position="relative"
      transform="rotate(-2deg)"
    >
      <Card.Body alignItems="center" justifyContent="center" gap="2" p="3">
        <Box boxSize="6" aria-hidden="true" overflow="hidden" css={{ '& svg': { width: '100%', height: '100%' } }} dangerouslySetInnerHTML={{ __html: scopeSvgIds(sanitizeSvg(ic.content), scope) }} />
        <Text as="span" fontSize="ui.body" textAlign="center" truncate w="full">
          {nameOf(ic)}
        </Text>
      </Card.Body>
      {count > 1 ? (
        <Float placement="top-end">
          <Badge variant="solid" colorPalette="yellow">{count}</Badge>
        </Float>
      ) : null}
    </Card.Root>
  )
}

// A dialog's last content, kept while it fades out: the state behind it is
// cleared on close, and the emptied box shrank mid-fade, which read as a twitch.
export function Hold({ open, children }) {
  const last = useRef(children)
  if (open) {
    last.current = children
  }
  return last.current
}

// An icon-only button's name, shown on hover and focus (Chakra's Tooltip);
// the button carries the same name for screen readers.
export function Tip({ label, children }) {
  return (
    <Tooltip.Root openDelay={200} closeDelay={0} positioning={{ placement: 'top' }}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Portal container={PANEL_ROOT}>
        <Tooltip.Positioner>
          <Tooltip.Content>{label}</Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  )
}

// One value out of a list, with a search at the top of the open list.
// Its rows exist only while it is open: with a thousand sets, every detail view would draw them all, unseen.
export function PickOne({ label, value, items, onChange, disabled }) {
  return <SearchSelect label={label} value={value} items={items} onChange={onChange} disabled={disabled} lazyMount unmountOnExit />
}
