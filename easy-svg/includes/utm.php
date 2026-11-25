<?php
// Names the place in the plugin a visitor clicked, for the analytics; the same rule as utmUrl() in src/panel/utm.js.

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// The account has no analytics and its links feed sign-in; a shop moved by a filter is not ours to tag.
const EASY_SVG_UTM_HOSTS = array( 'www.unleash-wp.com', 'support.unleash-wp.com' );

function easy_svg_utm_url( string $url, string $campaign, string $content ): string {
	$parts = wp_parse_url( $url );
	if ( ! is_array( $parts ) || 'https' !== strtolower( (string) ( $parts['scheme'] ?? '' ) ) || ! in_array( strtolower( (string) ( $parts['host'] ?? '' ) ), EASY_SVG_UTM_HOSTS, true ) || isset( $parts['user'] ) || isset( $parts['port'] ) ) {
		return $url;
	}

	$query = array();
	if ( isset( $parts['query'] ) ) {
		parse_str( (string) $parts['query'], $query );
	}
	foreach ( array_keys( $query ) as $key ) {
		if ( str_starts_with( (string) $key, 'utm_' ) ) {
			unset( $query[ $key ] );
		}
	}
	$query['utm_source']   = 'easy-svg';
	$query['utm_medium']   = 'plugin';
	$query['utm_campaign'] = $campaign;
	$query['utm_content']  = $content;

	return 'https://' . strtolower( (string) $parts['host'] ) . ( $parts['path'] ?? '/' )
		. '?' . http_build_query( $query, '', '&', PHP_QUERY_RFC3986 )
		. ( isset( $parts['fragment'] ) ? '#' . $parts['fragment'] : '' );
}
