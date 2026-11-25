<?php
// One option that everything reads, so the gate cannot drift from the panel's Settings tab.

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const EASY_SVG_SETTINGS_OPTION = 'easy_svg_settings';

// SVG uploads are always on and have no switch, so a stored false from before is ignored; icons are the one opt-in.
function easy_svg_settings_defaults(): array {
	return array(
		'svg_upload' => true,
		'icons'      => false,
	);
}

// Never memoise: get_option() is cached already, and a static would miss a change mid-request.
function easy_svg_settings(): array {
	$stored = get_option( EASY_SVG_SETTINGS_OPTION, array() );
	return easy_svg_sanitize_settings( is_array( $stored ) ? $stored : array() );
}

function easy_svg_feature_enabled( string $key ): bool {
	$settings = easy_svg_settings();
	return ! empty( $settings[ $key ] );
}

// Edited only through the panel's REST route, so there is no register_setting() here.

// A missing key keeps its default; unknown keys, a legacy max_mb among them, are dropped.
/** @param mixed $input */
function easy_svg_sanitize_settings( $input ): array {
	$input    = is_array( $input ) ? $input : array();
	$defaults = easy_svg_settings_defaults();

	return array(
		'svg_upload' => true,
		// Read as a flag, not cast: the REST body is passed in raw, and (bool) "false" is true.
		'icons'      => array_key_exists( 'icons', $input ) ? filter_var( $input['icons'], FILTER_VALIDATE_BOOLEAN ) : $defaults['icons'],
	);
}

// Uploads are always on, so a 4.x site needs no seed: a missing option already reads as uploads on, icons off.
const EASY_SVG_SCHEMA_OPTION  = 'easy_svg_schema';
const EASY_SVG_SCHEMA_VERSION = '5.0';

function easy_svg_run_migration(): void {
	if ( EASY_SVG_SCHEMA_VERSION === get_option( EASY_SVG_SCHEMA_OPTION ) ) {
		return;
	}
	update_option( EASY_SVG_SCHEMA_OPTION, EASY_SVG_SCHEMA_VERSION );
}

add_action( 'admin_init', 'easy_svg_run_migration' );
