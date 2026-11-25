<?php
// The details window lays the name over the banner's lower left, where ours has words; hidden for the eye only.

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function easy_svg_details_banner_css( $hook ) {
	if ( 'plugin-install.php' !== (string) $hook || ! isset( $_GET['tab'], $_GET['plugin'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return;
	}
	if ( 'plugin-information' !== sanitize_key( wp_unslash( $_GET['tab'] ) ) || 'easy-svg' !== sanitize_key( wp_unslash( $_GET['plugin'] ) ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return;
	}
	wp_add_inline_style(
		'common',
		'#plugin-information-title.with-banner h2{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}'
	);
}
add_action( 'admin_enqueue_scripts', 'easy_svg_details_banner_css' );
