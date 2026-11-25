<?php
// Five empty stars that ask for a review, never a score; the add-on draws its own row with this helper.

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const EASY_SVG_REVIEW_URL = 'https://wordpress.org/support/plugin/easy-svg/reviews/#new-post';

function easy_svg_review_url(): string {
	return (string) apply_filters( 'easy_svg_review_url', EASY_SVG_REVIEW_URL );
}

/**
 * @param string[] $star_urls Empty for one link, else five addresses, star 1 first; fewer than five render fewer stars.
 */
function easy_svg_review_stars_html( string $label, string $text_url, array $star_urls, bool $new_tab, string $aria ): string {
	$tab   = $new_tab ? ' target="_blank" rel="noopener noreferrer"' : '';
	$star  = '<span class="easy-svg-star dashicons dashicons-star-empty" aria-hidden="true"></span>';
	$words = '<span class="easy-svg-stars-text">' . esc_html( $label ) . '</span>';
	if ( array() === $star_urls ) {
		return sprintf( '<span class="easy-svg-stars"><a href="%s"%s aria-label="%s">%s%s</a></span>', esc_url( $text_url ), $tab, esc_attr( $aria ), str_repeat( $star, 5 ), $words );
	}
	$links = '';
	foreach ( array_values( array_slice( $star_urls, 0, 5 ) ) as $i => $url ) {
		/* translators: %d: number of stars, 1 to 5. */
		$name   = sprintf( __( 'Rate %d out of 5 stars', 'easy-svg' ), $i + 1 );
		$links .= sprintf( '<a class="easy-svg-star-link" href="%s"%s aria-label="%s">%s</a>', esc_url( $url ), $tab, esc_attr( $name ), $star );
	}
	return sprintf( '<span class="easy-svg-stars">%s<a href="%s"%s aria-label="%s">%s</a></span>', $links, esc_url( $text_url ), $tab, esc_attr( $aria ), $words );
}

// Untyped on purpose: plugin_row_meta runs for every row, and another plugin's callback may hand us null or a string.
function easy_svg_review_row_meta( $meta, $file ) {
	$meta = (array) $meta;
	if ( plugin_basename( dirname( __DIR__ ) . '/easy-svg.php' ) !== (string) $file ) {
		return $meta;
	}
	$meta[] = easy_svg_review_stars_html( __( 'Rate', 'easy-svg' ), easy_svg_review_url(), array(), true, __( 'Rate Easy SVG on WordPress.org (opens in a new tab)', 'easy-svg' ) );
	return $meta;
}
// After the row's author line (priority 10), so the stars come last.
add_filter( 'plugin_row_meta', 'easy_svg_review_row_meta', 20, 2 );

// Plugins screen only. Core's own star yellow, so it reads as a WordPress rating, not a banner.
function easy_svg_review_stars_css( $hook ) {
	if ( 'plugins.php' !== (string) $hook ) {
		return;
	}
	// Baseline, not centre: centred, the glyph's foot set the row's baseline and lifted it 4px.
	wp_add_inline_style(
		'common',
		'.easy-svg-stars{display:inline-flex;align-items:baseline;gap:0}'
		. '.easy-svg-stars a{display:inline-flex;align-items:baseline;text-decoration:none}'
		. '.easy-svg-star-link{min-width:24px;justify-content:center}'
		. '.easy-svg-star{color:#dba617;font-size:18px;width:18px;height:18px;position:relative;top:.25em}'
		. '.easy-svg-stars:hover .easy-svg-star:before,.easy-svg-stars:focus-within .easy-svg-star:before{content:"\f155"}'
		. '.easy-svg-stars .easy-svg-star:hover~.easy-svg-star:before,.easy-svg-stars .easy-svg-star-link:hover~.easy-svg-star-link .easy-svg-star:before{content:"\f154"}'
		. '.easy-svg-stars .easy-svg-star-link:focus~.easy-svg-star-link .easy-svg-star:before{content:"\f154"}'
		. '.easy-svg-stars-text{margin-inline-start:8px}'
	);
}
add_action( 'admin_enqueue_scripts', 'easy_svg_review_stars_css' );
