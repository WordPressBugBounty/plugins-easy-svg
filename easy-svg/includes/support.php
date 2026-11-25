<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** @return array<string,string> */
function easy_svg_support_lines(): array {
	// As the plugin acts on them: the raw row says off for a site that never saved, or kept a false from 4.x.
	$settings = easy_svg_settings();
	$theme    = wp_get_theme();
	// The plugin header is the one version source; there is no constant.
	$header  = get_file_data( dirname( __DIR__ ) . '/easy-svg.php', array( 'Version' => 'Version' ) );
	$lines   = array(
		'Site'         => (string) home_url(),
		'WordPress'    => (string) get_bloginfo( 'version' ),
		'PHP'          => PHP_VERSION,
		'Easy SVG'     => (string) ( $header['Version'] ?? '' ),
		'Theme'        => trim( $theme->get( 'Name' ) . ' ' . $theme->get( 'Version' ) ),
		'SVG uploads'  => easy_svg_support_uploads( $settings ),
		'Icon manager' => empty( $settings['icons'] ) ? 'off' : 'on',
	);
	return easy_svg_support_scrub( (array) apply_filters( 'easy_svg_support_report', $lines ) );
}

/** @param array<string,mixed> $settings */
function easy_svg_support_uploads( array $settings ): string {
	if ( empty( $settings['svg_upload'] ) ) {
		return 'off';
	}
	// The network's file types win over the setting, so the report says what an upload meets.
	if ( function_exists( 'easy_svg_network_allows_svg' ) && ! easy_svg_network_allows_svg() ) {
		return 'off (network upload file types)';
	}
	return 'on';
}

// Add-ons write into the report, so every line is scrubbed, never trusted.
/**
 * @param array<string,mixed> $lines
 * @return array<string,string>
 */
function easy_svg_support_scrub( array $lines ): array {
	$out = array();
	foreach ( $lines as $label => $value ) {
		if ( ! is_scalar( $value ) ) {
			continue;
		}
		$label = (string) $label;
		$value = (string) $value;
		// Only secret-ish words: a bare "key" or "license key", not "Feature keys". German labels too.
		if ( preg_match( '/licen[cs]e.?key|api.?key|\bkey\b|token|secret|password|e-?mail|contact|passwort|kennwort|lizenz.?schl(?:ü|ue)ssel|\bschl(?:ü|ue)ssel\b/iu', $label ) ) {
			continue;
		}
		if ( easy_svg_support_looks_secret( $label ) || easy_svg_support_looks_secret( $value ) ) {
			continue;
		}
		$out[ easy_svg_support_hide_paths( $label ) ] = easy_svg_support_hide_paths( $value );
	}
	return $out;
}

function easy_svg_support_looks_secret( string $text ): bool {
	return 1 === preg_match( '/[^\s@]+@[^\s@]+\.[a-z]{2,}/i', $text )
		|| 1 === preg_match( '/eyJ[A-Za-z0-9_-]+\./', $text )
		|| 1 === preg_match( '/\bBearer\s+\S/i', $text )
		|| 1 === preg_match( '/[A-Z0-9]{3,}-[A-Z0-9]{4}-[A-Z0-9]{4}/', $text )
		|| 1 === preg_match( '/[a-z0-9]{4}(?:-[a-z0-9]{4}){3}/i', $text )
		|| 1 === preg_match( '/[A-Za-z0-9_-]{32,}/', $text );
}

// Longest path first, so the shorter one cannot eat the longer.
function easy_svg_support_hide_paths( string $text ): string {
	$map = array();
	foreach ( array( '[content]' => 'WP_CONTENT_DIR', '[site]' => 'ABSPATH' ) as $tag => $const ) {
		if ( ! defined( $const ) ) {
			continue;
		}
		$dir = rtrim( (string) constant( $const ), '/' );
		foreach ( array_unique( array_filter( array( $dir, (string) realpath( $dir ) ) ) ) as $path ) {
			$map[ $path ] = $tag;
		}
	}
	uksort( $map, static fn( $a, $b ) => strlen( $b ) <=> strlen( $a ) );
	return strtr( $text, $map );
}

/** @param array<string,string> $lines */
function easy_svg_support_text( array $lines ): string {
	$rows = array();
	foreach ( $lines as $label => $value ) {
		$rows[] = $label . ': ' . $value;
	}
	return implode( "\n", $rows );
}
