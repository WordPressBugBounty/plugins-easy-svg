import { useState } from 'react'
import { Box, HStack, Text } from '@chakra-ui/react'
import { __, _n, sprintf } from '@wordpress/i18n'
import { LuStar } from 'react-icons/lu'
import { reviewLinks } from './review-links.js'

// As the website's footer: empty stars that fill only under the pointer, so they never read as a score.
const LINK = {
  color: 'ui.footer',
  textDecoration: 'none',
  minH: '11',
  display: 'inline-flex',
  alignItems: 'center',
  _hover: { color: 'ui.heading' },
}

function Star({ filled, size = 'ui.glyphSm' }) {
  return (
    <Box
      as="span"
      aria-hidden="true"
      data-filled={filled ? '' : undefined}
      color={filled ? 'yellow' : 'ui.footer'}
      display="inline-flex"
      css={{
        '& svg': { width: size, height: size, fill: filled ? 'currentColor' : 'none' },
        '@media (prefers-reduced-motion: no-preference)': { transition: 'color 0.15s ease' },
      }}
    >
      <LuStar />
    </Box>
  )
}

export default function ReviewStars({ reviewUrl, proReviewUrl }) {
  const [lit, setLit] = useState(0)
  const links = reviewLinks(reviewUrl, proReviewUrl)
  const leave = () => setLit(0)

  if (links.kind === 'wporg') {
    return (
      <HStack data-review-stars gap="1.5" onMouseLeave={leave}>
        <Box
          as="a"
          href={links.url}
          target="_blank"
          rel="noopener noreferrer"
          // The visible words open the name, so a voice command that says them reaches the link in every language (WCAG 2.5.3).
          aria-label={sprintf(
            // translators: %s: the link's visible words, "Rate Easy SVG". Keep it at the start.
            __('%s on WordPress.org (opens in a new tab)', 'easy-svg'),
            __('Rate Easy SVG', 'easy-svg')
          )}
          gap="1.5"
          onFocus={() => setLit(5)}
          onBlur={leave}
          {...LINK}
        >
          <HStack as="span" gap="0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Box as="span" key={n} data-review-star={n} onMouseEnter={() => setLit(n)}>
                <Star filled={n <= lit} />
              </Box>
            ))}
          </HStack>
          <Text as="span" data-review-text>
            {__('Rate Easy SVG', 'easy-svg')}
          </Text>
        </Box>
      </HStack>
    )
  }

  return (
    <HStack data-review-stars gap="0" onMouseLeave={leave}>
      {links.stars.map((href, i) => (
        <Box
          as="a"
          key={href}
          href={href}
          data-review-star={i + 1}
          // translators: %d: number of stars, 1 to 5.
          aria-label={sprintf(_n('Rate Easy SVG Pro with %d star', 'Rate Easy SVG Pro with %d stars', i + 1, 'easy-svg'), i + 1)}
          minW="6"
          justifyContent="center"
          onMouseEnter={() => setLit(i + 1)}
          onFocus={() => setLit(i + 1)}
          onBlur={leave}
          {...LINK}
        >
          <Star filled={i + 1 <= lit} size="ui.glyphStar" />
        </Box>
      ))}
      <Box as="a" href={links.text} data-review-text ms="2" {...LINK}>
        {__('Rate Easy SVG Pro', 'easy-svg')}
      </Box>
    </HStack>
  )
}
