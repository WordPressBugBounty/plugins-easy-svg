import {
  Box,
  CloseButton,
  Dialog,
  Drawer,
  Flex,
  HStack,
  IconButton,
  Portal,
} from '@chakra-ui/react'
import { OVERLAY_TOP } from '../../overlay-top.js'
import { __ } from '@wordpress/i18n'
import { FRAME_ROOT, RAIL_FADE } from './helpers.js'
import { Hold, Tip } from './widgets.jsx'

export function templatesDialogView({
  ctx, reloadCollections, setTemplatesOpen, templater, templatesContent, templatesOpen,
}) {
  return templater ? (
    <Dialog.Root
      open={templatesOpen}
      onOpenChange={(e) => {
        setTemplatesOpen(e.open)
        // A set installed there shows in the rail at once.
        if (!e.open) {
          reloadCollections.current?.()
        }
      }}
      placement="center"
      size="xl"
      scrollBehavior="inside"
      lazyMount
      unmountOnExit
      modal
      // Not the X: opened by mouse it would wear a focus ring. The search takes the focus from here.
      initialFocusEl={() => templatesContent.current}
    >
      <Dialog.Backdrop />
      <Dialog.Positioner pt="4" pb="4">
        <Dialog.Content
          ref={templatesContent}
          data-templates-dialog
          borderRadius="forge"
          bg="ui.bg"
          w="full"
          mb="0"
          maxW="min(64rem, calc(100vw - 2rem))"
          h="calc(100dvh - 2rem)"
          maxH="calc(100dvh - 2rem)"
          _focusVisible={{ outline: 'none' }}
        >
          <Dialog.Header display="flex" alignItems="center" gap="4" py="4" pe="20" bg="ui.surface" borderBottomWidth="ui.hair" borderColor="ui.border">
            <Dialog.Title flexShrink="0" fontSize="ui.xl" fontWeight="bold" color="ui.heading">{__('Templates', 'easy-svg')}</Dialog.Title>
            <Flex data-templates-tools flex="1" minW="0" justify="flex-end" />
          </Dialog.Header>
          {/* As high as the search, on the same axis: the header's padding is its distance from the edge. */}
          <Dialog.CloseTrigger asChild top="4" insetEnd="4">
            <CloseButton w="11" h="11" minW="11" css={{ '& svg': { width: '5', height: '5' } }} aria-label={__('Close', 'easy-svg')} />
          </Dialog.CloseTrigger>
          <Dialog.Body py="0">
            <Box {...RAIL_FADE} animationName="eswFadeIn" top="0" mb="-6" bgImage="linear-gradient(to bottom, {colors.ui.bg}, transparent)" />
            <Box py="6">{templatesOpen ? templater.templates(ctx) : null}</Box>
            <Box {...RAIL_FADE} animationName="eswFadeOut" bottom="0" mt="-6" bgImage="linear-gradient(to top, {colors.ui.bg}, transparent)" />
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  ) : null
}

// The page's other screens, each a button by the search that opens it in a
// side panel over the icons. The address names the open one, so the
// browser's back button and a copied link both land on it.
export function toolsView({ ctx, toolList }) {
  return toolList.length ? (
    <HStack gap="2">
      {toolList.map((t) => (
        <Tip key={t.id} label={t.label}>
          <IconButton
            data-tool={t.id}
            aria-label={t.label}
            size="md"
            variant="outline"
            bg="ui.surface"
            _hover={{ bg: 'ui.menuHover' }}
            css={{ '& svg': { width: '5', height: '5' } }}
            onClick={() => ctx.goTo(t.id)}
          >
            {t.icon}
          </IconButton>
        </Tip>
      ))}
    </HStack>
  ) : null
}

export function toolDrawerView({ ctx, openTool, toolCover, toolList }) {
  return toolList.length ? (
    <Drawer.Root
      open={!!openTool}
      onOpenChange={(e) => (e.open ? null : ctx.goTo('library'))}
      placement="end"
      size="xl"
      lazyMount
      unmountOnExit
    >
      <Portal container={FRAME_ROOT}>
        <Drawer.Backdrop />
        {/* Below wp-admin's bar, which sits over everything else, or what is left of it. */}
        <Drawer.Positioner top={OVERLAY_TOP} bottom="0" h="auto" style={toolCover}>
          <Drawer.Content bg="ui.bg" data-tool-drawer>
            <Hold open={!!openTool}>
            <Drawer.Header
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              h="ui.header"
              px="6"
              py="0"
              borderBottomWidth="ui.hair"
              borderColor="ui.border"
              bg="ui.surface"
            >
              <HStack gap="3" css={{ '& svg': { width: '5', height: '5' } }}>
                {openTool?.icon}
                <Drawer.Title fontSize="ui.xl" fontWeight="bold" color="ui.heading">{openTool?.label}</Drawer.Title>
              </HStack>
              <Drawer.CloseTrigger asChild position="static">
                <CloseButton size="sm" css={{ '& svg': { width: '5', height: '5' } }} aria-label={__('Close', 'easy-svg')} />
              </Drawer.CloseTrigger>
            </Drawer.Header>
            <Drawer.Body px="6" py="6">{openTool ? openTool.render(ctx) : null}</Drawer.Body>
            </Hold>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  ) : null
}
