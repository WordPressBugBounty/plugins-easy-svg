import { Box, Card, Flex, SimpleGrid, Skeleton, Stack } from '@chakra-ui/react'
import { GRID_COLUMNS } from './helpers.js'

// Tiles as the grid lays them out: the trash while it loads and the next batch of icons wait in this shape.
export function SkeletonTiles({ count = 8 }) {
  return (
    <SimpleGrid data-skeleton-tiles templateColumns={GRID_COLUMNS} gap="3" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} aspectRatio="1" borderRadius="forge" />
      ))}
    </SimpleGrid>
  )
}

// The Library screen while it loads: the same frame as the loaded one, so nothing moves when the icons arrive.
export function SkeletonLibrary() {
  return (
    <Card.Root
      data-skeleton-library
      aria-hidden
      variant="outline"
      bg="transparent"
      borderWidth="0"
      borderRadius="0"
      boxShadow="none"
      mx={{ base: '-4', md: '-6' }}
      my={{ base: '-5', md: '-6' }}
      minH="calc(max(100vh - var(--esw-admin-bar), var(--esw-menu-h, 0px)) - {sizes.ui.header} - {sizes.ui.footer})"
      display="flex"
      flexDirection="column"
    >
      <Flex direction={{ base: 'column', lg: 'row' }} align="stretch" flex="1">
        <Box
          display={{ base: 'none', lg: 'block' }}
          w="ui.rail"
          flexShrink="0"
          px="3"
          pt="8"
          bg="ui.surface"
          borderRightWidth="ui.hair"
          borderColor="ui.border"
        >
          <Stack gap="1">
            {/* Library and Trash, then the sets. */}
            {[0, 1].map((i) => (
              <Skeleton key={i} h="11" borderRadius="forge" />
            ))}
            <Box h="6" />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} h="11" borderRadius="forge" />
            ))}
          </Stack>
        </Box>
        <Box flex="1" minW="0" px={{ base: '4', md: '6' }} py={{ base: '5', md: '6' }}>
          <Flex gap="3" mb="6" justify="space-between" align="center">
            <Skeleton h="11" w="ui.skeletonLabel" borderRadius="forge" />
            <Skeleton h="11" w="ui.rail" maxW="full" borderRadius="forge" />
          </Flex>
          <SkeletonTiles count={12} />
        </Box>
      </Flex>
    </Card.Root>
  )
}
