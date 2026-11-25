<?php
// Plugins screen only, our panel has its own switch. No sales text in the notice: wordpress.org rules.

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const EASY_SVG_ICONS_HINT_META = 'easy_svg_icons_hint_dismissed';

// One X is for good: a notice that comes back counts as nagging on wordpress.org.
function easy_svg_icons_hint_stage( string $dismissed ): string {
	return '' === $dismissed ? 'first' : 'hidden';
}

// Pure, so every condition is tested without WordPress.
function easy_svg_icons_hint_visible( string $screen_id, bool $can, bool $icons_on, bool $dismissed ): bool {
	if ( ! $can || $icons_on || $dismissed ) {
		return false;
	}
	return 'plugins' === $screen_id;
}

function easy_svg_icons_hint_enable( bool $nonce_ok, bool $can ): bool {
	if ( ! $nonce_ok || ! $can ) {
		return false;
	}
	update_option( EASY_SVG_SETTINGS_OPTION, easy_svg_sanitize_settings( array( 'icons' => true ) + easy_svg_settings() ) );
	return true;
}

// Per user, so it stays gone on every device and other admins still see it.
function easy_svg_icons_hint_dismiss( bool $nonce_ok, bool $can, int $user_id, int $now ): bool {
	if ( ! $nonce_ok || ! $can || $user_id < 1 ) {
		return false;
	}
	update_user_meta( $user_id, EASY_SVG_ICONS_HINT_META, (string) $now );
	return true;
}

function easy_svg_icons_hint_user_stage(): string {
	return easy_svg_icons_hint_stage( (string) get_user_meta( get_current_user_id(), EASY_SVG_ICONS_HINT_META, true ) );
}

function easy_svg_icons_hint_shows(): bool {
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	$id     = is_object( $screen ) ? (string) $screen->id : '';
	// It points at the Icon block, which WordPress before 7.1 does not have.
	return easy_svg_icons_supported() && easy_svg_icons_hint_visible( $id, current_user_can( 'manage_options' ), easy_svg_feature_enabled( 'icons' ), 'hidden' === easy_svg_icons_hint_user_stage() );
}

function easy_svg_icons_hint_copy(): array {
	return array(
		__( 'Easy SVG has an icon library now.', 'easy-svg' ),
		__( 'Upload an icon once and pick it in the Icon block. The library stays off until you switch it on.', 'easy-svg' ),
	);
}

// wp-admin styles text and buttons unlayered, so the Chakra card restates the brand face, as panel.php does.
function easy_svg_icons_hint_assets(): void {
	$main  = dirname( __DIR__ ) . '/easy-svg.php';
	$build = dirname( __DIR__ ) . '/build/hint.js';
	if ( ! easy_svg_icons_hint_shows() || ! is_readable( $build ) ) {
		return;
	}
	// Deferred: the server notice stands until the card replaces it. Not on the kit: the card carries the few Chakra parts it draws with.
	wp_enqueue_script(
		'easy-svg-hint',
		plugins_url( 'build/hint.js', $main ),
		array( 'react', 'react-dom', 'react-jsx-runtime', 'wp-i18n' ),
		(string) filemtime( $build ),
		array(
			'in_footer' => true,
			'strategy'  => 'defer',
		)
	);
	wp_set_script_translations( 'easy-svg-hint', 'easy-svg', dirname( __DIR__ ) . '/languages' );
	wp_localize_script(
		'easy-svg-hint',
		'EasySvgIconsHint',
		array(
			'ajax'         => admin_url( 'admin-ajax.php' ),
			'post'         => admin_url( 'admin-post.php' ),
			'dismissNonce' => wp_create_nonce( 'easy_svg_dismiss_icons_hint' ),
			'enableNonce'  => wp_create_nonce( 'easy_svg_enable_icons' ),
			'copy'         => easy_svg_icons_hint_copy(),
		)
	);
	wp_add_inline_style(
		'common',
		easy_svg_font_faces( $main )
		. '#easy-svg-hint[data-chakra]{border:0;padding:0;background:none;box-shadow:none}'
		. '#easy-svg-hint[data-chakra],#easy-svg-hint[data-chakra] :is(div,p,span,a,strong)'
		. '{font-family:Ubuntu,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}'
		. '#easy-svg-hint[data-chakra] .chakra-button{font-family:inherit;font-size:16px;font-weight:500;text-decoration:none}'
	);
}

// The fallback form must work without JavaScript.
function easy_svg_icons_hint_notice(): void {
	if ( ! easy_svg_icons_hint_shows() ) {
		return;
	}
	$copy = easy_svg_icons_hint_copy();
	printf(
		'<div id="easy-svg-hint" class="notice notice-info"><form method="post" action="%1$s"><p><strong>%2$s</strong> %3$s</p><p><input type="hidden" name="action" value="easy_svg_enable_icons" />%4$s<button type="submit" class="button button-primary">%5$s</button></p></form></div>',
		esc_url( admin_url( 'admin-post.php' ) ),
		esc_html( $copy[0] ),
		esc_html( $copy[1] ),
		wp_nonce_field( 'easy_svg_enable_icons', '_wpnonce', true, false ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- core builds the field.
		esc_html__( 'Switch it on', 'easy-svg' )
	);
}

function easy_svg_icons_hint_enable_request(): void {
	$ok = easy_svg_icons_hint_enable( false !== check_admin_referer( 'easy_svg_enable_icons' ), current_user_can( 'manage_options' ) );
	if ( ! $ok ) {
		wp_die( esc_html__( 'Sorry, you are not allowed to do that.', 'easy-svg' ), '', array( 'response' => 403 ) );
	}
	wp_safe_redirect( admin_url( 'admin.php?page=' . EASY_SVG_PANEL_SLUG . '&tab=library' ) );
	exit;
}

function easy_svg_icons_hint_dismiss_request(): void {
	$ok = easy_svg_icons_hint_dismiss( false !== check_ajax_referer( 'easy_svg_dismiss_icons_hint', 'nonce', false ), current_user_can( 'manage_options' ), get_current_user_id(), time() );
	if ( $ok ) {
		wp_send_json_success();
	}
	wp_send_json_error( null, 403 );
}

add_action( 'admin_enqueue_scripts', 'easy_svg_icons_hint_assets' );
add_action( 'admin_notices', 'easy_svg_icons_hint_notice' );
add_action( 'admin_post_easy_svg_enable_icons', 'easy_svg_icons_hint_enable_request' );
add_action( 'wp_ajax_easy_svg_dismiss_icons_hint', 'easy_svg_icons_hint_dismiss_request' );
