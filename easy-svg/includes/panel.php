<?php
// Free owns the Icons panel and Pro extends it through window.EasySvgPanel; React comes from WordPress, not the bundle.

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const EASY_SVG_PANEL_SLUG = 'easy-svg-icons';

require_once __DIR__ . '/utm.php';

// Filterable, so a moved shop page needs no release.
const EASY_SVG_PRO_URL = 'https://www.unleash-wp.com/plugins/easy-svg-pro';

function easy_svg_panel_pro_url() {
	return (string) apply_filters( 'easy_svg_pro_url', EASY_SVG_PRO_URL );
}

/**
 * @param array $links
 * @return array
 */
function easy_svg_plugin_action_links( $links ) {
	$ours = array(
		'easy_svg_panel' => sprintf(
			'<a href="%s">%s</a>',
			esc_url( admin_url( 'admin.php?page=' . EASY_SVG_PANEL_SLUG ) ),
			esc_html__( 'Icons', 'easy-svg' )
		),
	);

	// Only without Pro: an upsell that stays after somebody has paid reads as nagging.
	if ( ! function_exists( 'easy_svg_pro_pro_enabled' ) ) {
		$ours['easy_svg_pro'] = sprintf(
			// Core's own red for a link that leaves the ordinary flow, so it reads as a WordPress link, not a banner.
			'<a href="%s" target="_blank" rel="noopener noreferrer" style="color:#d63638;font-weight:600">%s</a>',
			esc_url( easy_svg_utm_url( easy_svg_panel_pro_url(), 'plugin-row', 'buy' ) ),
			esc_html__( 'Buy Easy SVG Pro', 'easy-svg' )
		);
	}

	return array_merge( $ours, (array) $links );
}
add_filter( 'plugin_action_links_' . plugin_basename( dirname( __DIR__ ) . '/easy-svg.php' ), 'easy_svg_plugin_action_links' );

// Priority 9, before core's post type submenus: WordPress points the top-level link at the first submenu registered.
add_action( 'admin_menu', 'easy_svg_panel_menu', 9 );
// Again at the very end: a position only decides where an entry is inserted, so later plugins land below it.
add_action( 'admin_menu', 'easy_svg_panel_menu_to_the_end', 9999 );

// The Media screens lead to the library only while the icon manager is on and this user may open it.
function easy_svg_media_links_url(): string {
	$tabs = easy_svg_panel_tabs_for_user();
	if ( ! easy_svg_feature_enabled( 'icons' ) || ! isset( $tabs['library'] ) ) {
		return '';
	}
	return 'admin.php?page=' . EASY_SVG_PANEL_SLUG . '&tab=library';
}

// A slug with no callback is drawn as the link itself, so the entry opens the panel and adds no page.
function easy_svg_media_menu(): void {
	$url = easy_svg_media_links_url();
	if ( '' === $url ) {
		return;
	}
	$tabs = easy_svg_panel_tabs_for_user();
	// add=1 opens the library's add area, as Add Media File opens the uploader.
	add_submenu_page( 'upload.php', __( 'Add icon', 'easy-svg' ), __( 'Add icon', 'easy-svg' ), $tabs['library']['capability'], $url . '&add=1' );
}
add_action( 'admin_menu', 'easy_svg_media_menu' );

// Core has no hook beside the Media Library's heading, so the button is placed after the last one there.
function easy_svg_media_button( string $hook ): void {
	$url = easy_svg_media_links_url();
	if ( 'upload.php' !== $hook || '' === $url ) {
		return;
	}
	$handle = 'easy-svg-media-button';
	wp_register_script( $handle, false, array(), (string) filemtime( __FILE__ ), array( 'in_footer' => true ) );
	wp_enqueue_script( $handle );
	wp_add_inline_script(
		$handle,
		'(function(d,b){var h=d.querySelector(".wrap .wp-header-end");if(!h||d.querySelector("[data-easy-svg-library]")){return}'
		. 'var a=d.createElement("a");a.className="page-title-action";a.href=b.url;a.textContent=b.label;a.setAttribute("data-easy-svg-library","");'
		. 'h.parentNode.insertBefore(a,h)})(document,' . wp_json_encode(
			array(
				'url'   => admin_url( $url ),
				'label' => __( 'Icon manager', 'easy-svg' ),
			)
		) . ');'
	);
}
add_action( 'admin_enqueue_scripts', 'easy_svg_media_button' );

// WordPress lists the menu entries in the command palette itself; this adds the name people type, in every editor.
function easy_svg_palette_command(): void {
	$url = easy_svg_media_links_url();
	if ( '' === $url || ! wp_script_is( 'wp-commands', 'enqueued' ) ) {
		return;
	}
	$handle = 'easy-svg-palette-command';
	wp_register_script( $handle, false, array( 'wp-commands', 'wp-data' ), (string) filemtime( __FILE__ ), array( 'in_footer' => true ) );
	wp_enqueue_script( $handle );
	wp_add_inline_script(
		$handle,
		'(function(c){wp.data.dispatch("core/commands").registerCommand({name:"easy-svg/library",label:c.label,'
		. 'callback:function(o){o.close();window.location.href=c.url}})})(' . wp_json_encode(
			array(
				'url'   => admin_url( $url ),
				'label' => __( 'Icon manager', 'easy-svg' ),
			)
		) . ');'
	);
}
// After core has enqueued the palette, so a screen without one loads nothing for it.
add_action( 'admin_enqueue_scripts', 'easy_svg_palette_command', 20 );

function easy_svg_panel_menu_icon_css(): void {
	$selector = '#adminmenu .toplevel_page_' . EASY_SVG_PANEL_SLUG . ' .wp-menu-image';

	// Enqueued, not echoed into admin_head: Plugin Check reads that echo as unescaped output.
	$handle = 'easy-svg-menu-icon';
	wp_register_style( $handle, false, array(), (string) filemtime( __FILE__ ) );
	wp_enqueue_style( $handle );
	wp_add_inline_style(
		$handle,
		$selector . '{display:flex;align-items:center;justify-content:center;padding:0}'
		// Folded menu and the mobile bar have taller rows.
		. '.folded ' . $selector . ',#adminmenu .wp-submenu ' . $selector . '{padding:0}'
	);
}
add_action( 'admin_enqueue_scripts', 'easy_svg_panel_menu_icon_css' );
add_filter( 'submenu_file', 'easy_svg_panel_current_submenu' );
add_action( 'admin_enqueue_scripts', 'easy_svg_panel_assets' );
add_action( 'rest_api_init', 'easy_svg_panel_rest' );

// $menu is keyed by position and sorted by key, so the last place is one past the highest key.
function easy_svg_panel_menu_to_the_end(): void {
	global $menu;

	if ( ! is_array( $menu ) ) {
		return;
	}

	$ours = null;
	foreach ( $menu as $position => $entry ) {
		if ( is_array( $entry ) && isset( $entry[2] ) && EASY_SVG_PANEL_SLUG === $entry[2] ) {
			$ours = $entry;
			unset( $menu[ $position ] );
			break;
		}
	}

	if ( null === $ours ) {
		return;
	}

	$keys = array_map( 'intval', array_keys( $menu ) );
	$last = $keys ? max( $keys ) + 1 : 100;

	$menu[ (string) $last ] = $ours;
}

// Only a base64 SVG is tinted by core's svg-painter.js to the admin colour scheme.
function easy_svg_panel_menu_icon(): string {
	$svg = file_get_contents( dirname( __DIR__ ) . '/assets/menu-icon.svg' );
	// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- add_menu_page() takes an SVG icon only as a base64 data URI.
	return 'data:image/svg+xml;base64,' . base64_encode( is_string( $svg ) ? $svg : '' );
}

// The panel's white header starts at the admin bar; a notice from any plugin would sit above it.
function easy_svg_panel_quiet_notices(): void {
	add_action( 'in_admin_header', 'easy_svg_panel_clear_notices', 9999 );
}

function easy_svg_panel_clear_notices(): void {
	foreach ( array( 'admin_notices', 'network_admin_notices', 'user_admin_notices', 'all_admin_notices' ) as $hook ) {
		remove_all_actions( $hook );
	}
}

function easy_svg_panel_menu(): void {
	$tabs = easy_svg_panel_tabs_for_user();
	if ( array() === $tabs ) {
		return;
	}

	// The parent needs a capability this user holds, or WordPress draws no submenu under it.
	$parent_cap = (string) reset( $tabs )['capability'];

	// Position as a string: a second plugin that wants an integer slot replaces whatever is in it.
	$page = add_menu_page(
		'Easy SVG',
		'Easy SVG',
		$parent_cap,
		EASY_SVG_PANEL_SLUG,
		'easy_svg_panel_render',
		easy_svg_panel_menu_icon(),
		'99.7'
	);
	if ( is_string( $page ) && '' !== $page ) {
		add_action( 'load-' . $page, 'easy_svg_panel_quiet_notices' );
	}

	// The self-entry: without it WordPress points the parent link at the first nested entry, a post list.
	add_submenu_page(
		EASY_SVG_PANEL_SLUG,
		__( 'Icons', 'easy-svg' ),
		__( 'Icons', 'easy-svg' ),
		$parent_cap,
		EASY_SVG_PANEL_SLUG,
		'easy_svg_panel_render'
	);

	// Without the icon manager the panel draws no Templates screen, so that entry would open the Icons welcome.
	$icons_on = easy_svg_feature_enabled( 'icons' );

	// One entry per page, not per tab, each opening the page's first tab this user may see.
	foreach ( easy_svg_panel_menu_pages( $tabs ) as $page => $entry ) {
		if ( 'icons' === $page || ( 'templates' === $page && ! $icons_on ) ) {
			continue;
		}
		add_submenu_page(
			EASY_SVG_PANEL_SLUG,
			$entry['label'],
			$entry['label'],
			$entry['capability'],
			EASY_SVG_PANEL_SLUG . '&tab=' . $entry['tab'],
			'easy_svg_panel_render'
		);
	}
}

// Unknown tabs land in the settings, as in the panel.
function easy_svg_panel_page_of( string $tab ): string {
	$pages = array(
		'icons'     => array( 'library', 'sets', 'bulk' ),
		'templates' => array( 'packs', 'export' ),
		'tools'     => array( 'support' ),
		'settings'  => array( 'settings', 'features', 'configurator', 'licence', 'upsell' ),
	);
	foreach ( $pages as $page => $ids ) {
		if ( in_array( $tab, $ids, true ) ) {
			return $page;
		}
	}
	return 'settings';
}

/**
 * @param array<string,array{label:string,capability:string}> $tabs
 * @return array<string,array{label:string,tab:string,capability:string}>
 */
function easy_svg_panel_menu_pages( array $tabs ): array {
	$labels = array(
		'icons'     => __( 'Icons', 'easy-svg' ),
		'templates' => __( 'Templates', 'easy-svg' ),
		'tools'     => __( 'Tools', 'easy-svg' ),
		'settings'  => __( 'Settings', 'easy-svg' ),
	);
	// The first tab a page opens with, when the user may see it.
	$first = array( 'library', 'packs', 'support', 'settings', 'features', 'configurator', 'licence' );
	uksort(
		$tabs,
		static function ( $a, $b ) use ( $first ) {
			$ia = array_search( $a, $first, true );
			$ib = array_search( $b, $first, true );
			return ( false === $ia ? 99 : $ia ) <=> ( false === $ib ? 99 : $ib );
		}
	);
	$out = array();
	foreach ( $tabs as $tab => $meta ) {
		$page = easy_svg_panel_page_of( (string) $tab );
		if ( isset( $out[ $page ] ) ) {
			continue;
		}
		$out[ $page ] = array(
			'label'      => $labels[ $page ],
			'tab'        => (string) $tab,
			'capability' => $meta['capability'],
		);
	}
	$ordered = array();
	foreach ( array_keys( $labels ) as $page ) {
		if ( isset( $out[ $page ] ) ) {
			$ordered[ $page ] = $out[ $page ];
		}
	}
	return $ordered;
}

// WordPress picks the current item from $plugin_page alone, which here is always this page.
/**
 * @param string|null $submenu_file
 * @return string|null
 */
function easy_svg_panel_current_submenu( $submenu_file ) {
	if ( ! isset( $_GET['page'], $_GET['tab'] ) || EASY_SVG_PANEL_SLUG !== $_GET['page'] ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return $submenu_file;
	}
	$tab = sanitize_key( wp_unslash( $_GET['tab'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$tabs = easy_svg_panel_tabs_for_user();
	// The Pro page has no menu entry of its own; it sits on Settings.
	if ( ! isset( $tabs[ $tab ] ) && 'upsell' !== $tab ) {
		return $submenu_file;
	}
	$page = easy_svg_panel_page_of( $tab );
	$pages = easy_svg_panel_menu_pages( $tabs );
	if ( 'icons' === $page || ! isset( $pages[ $page ] ) ) {
		return EASY_SVG_PANEL_SLUG;
	}
	return EASY_SVG_PANEL_SLUG . '&tab=' . $pages[ $page ]['tab'];
}

/** @return array<string,string|array<string,string>> */
function easy_svg_panel_menu_tabs(): array {
	return (array) apply_filters(
		'easy_svg_panel_menu_tabs',
		array(
			'settings' => __( 'General', 'easy-svg' ),
			'library'  => __( 'Icon library', 'easy-svg' ),
			'support'  => __( 'Support', 'easy-svg' ),
		)
	);
}

// A plain label means manage_options, so an add-on built against the older contract keeps the access it had.
/** @return array<string,array{label:string,capability:string}> */
function easy_svg_panel_tabs_for_user(): array {
	$out = array();
	foreach ( easy_svg_panel_menu_tabs() as $slug => $tab ) {
		$label      = is_array( $tab ) ? (string) ( $tab['label'] ?? $slug ) : (string) $tab;
		$capability = is_array( $tab ) ? (string) ( $tab['capability'] ?? 'manage_options' ) : 'manage_options';
		if ( ! current_user_can( $capability ) ) {
			continue;
		}
		$out[ $slug ] = array(
			'label'      => $label,
			'capability' => $capability,
		);
	}
	return $out;
}

// No visible tab means no page, menu entry or bundle; each REST route checks its own capability, because the screen is never the authority.
function easy_svg_panel_user_may_open(): bool {
	return array() !== easy_svg_panel_tabs_for_user();
}

/** @return array<string,string> */
function easy_svg_panel_tab_capabilities(): array {
	$out = array();
	foreach ( easy_svg_panel_menu_tabs() as $slug => $tab ) {
		$out[ $slug ] = is_array( $tab ) ? (string) ( $tab['capability'] ?? 'manage_options' ) : 'manage_options';
	}
	return $out;
}

// manage_options too, for the tabs that have no menu entry of their own.
/** @return array<string,bool> */
function easy_svg_panel_user_caps(): array {
	$out = array( 'manage_options' => current_user_can( 'manage_options' ) );
	foreach ( easy_svg_panel_tab_capabilities() as $capability ) {
		$out[ $capability ] = current_user_can( $capability );
	}
	return $out;
}

// Pro's tools open, not only its licence: a network without the plan is refused by Pro's REST. An older Pro has only the licence check.
function easy_svg_panel_has_pro_licence(): bool {
	if ( function_exists( 'easy_svg_pro_tools_open' ) ) {
		return (bool) easy_svg_pro_tools_open();
	}
	return function_exists( 'easy_svg_pro_pro_enabled' ) && easy_svg_pro_pro_enabled();
}

function easy_svg_panel_render(): void {
	if ( ! easy_svg_panel_user_may_open() ) {
		return;
	}
	echo '<div class="wrap"><div id="easy-svg-panel"></div></div>';
}

// Ubuntu, bundled (UFL 1.0), the same faces Pro's set editor loads; the panel and the Plugins screen hint both print them.
function easy_svg_font_faces( string $main ): string {
	$css = '';
	foreach ( array( 400, 500, 700 ) as $weight ) {
		$css .= '@font-face{font-family:Ubuntu;font-style:normal;font-weight:' . $weight . ';font-display:swap;src:url('
			. esc_url( plugins_url( 'build/fonts/ubuntu-v21-latin-' . $weight . '-normal.woff2', $main ) ) . ') format("woff2")}';
	}
	return $css;
}

// Registered on every admin screen, so an add-on can depend on the handle wherever it draws.
function easy_svg_register_ui_kit(): void {
	$file = dirname( __DIR__ ) . '/build/ui.js';
	if ( ! is_readable( $file ) ) {
		return;
	}
	// Deferred where only deferred scripts need it, like the Plugins screen hint; WordPress loads it blocking for the panel.
	wp_register_script(
		'easy-svg-ui',
		plugins_url( 'build/ui.js', dirname( __DIR__ ) . '/easy-svg.php' ),
		array( 'react', 'react-dom', 'react-jsx-runtime' ),
		(string) filemtime( $file ),
		array(
			'in_footer' => true,
			'strategy'  => 'defer',
		)
	);
}
add_action( 'admin_init', 'easy_svg_register_ui_kit' );

function easy_svg_panel_assets( $hook ): void {
	if ( 'toplevel_page_' . EASY_SVG_PANEL_SLUG !== $hook ) {
		return;
	}
	$main  = dirname( __DIR__ ) . '/easy-svg.php';
	$build = dirname( __DIR__ ) . '/build/panel.js';
	if ( ! is_readable( $build ) ) {
		return;
	}

	// Only on this screen: media-views is too large to hand every admin page.
	wp_enqueue_media();

	// False when the user switched syntax highlighting off; the dialog then keeps a plain field.
	$code_editor = wp_enqueue_code_editor( array( 'type' => 'text/html' ) );

	// React, ReactDOM, the JSX runtime and wp.i18n come from WordPress, Chakra and the theme from easy-svg-ui.
	wp_enqueue_script(
		'easy-svg-panel',
		plugins_url( 'build/panel.js', $main ),
		array( 'easy-svg-ui', 'react', 'react-dom', 'react-jsx-runtime', 'wp-i18n' ),
		(string) filemtime( $build ),
		true
	);

	// The path is required for the bundled catalogue: on the 6.6 floor WordPress looks only in WP_LANG_DIR otherwise.
	wp_set_script_translations( 'easy-svg-panel', 'easy-svg', dirname( __DIR__ ) . '/languages' );

	$pro_active   = function_exists( 'easy_svg_pro_pro_enabled' );
	$pro_licensed = easy_svg_panel_has_pro_licence();

	wp_localize_script(
		'easy-svg-panel',
		'EasySvgPanelData',
		array(
			// The constant itself, so the PHP and JS sides cannot drift apart.
			'panelApi'     => (int) EASY_SVG_PANEL_API,
			// The verdict is PHP's; the screen only draws it, and every REST route still checks for itself.
			'tabCaps'      => easy_svg_panel_tab_capabilities(),
			'codeEditor'   => false === $code_editor ? null : $code_editor,
			'caps'         => easy_svg_panel_user_caps(),
			'restRoot'     => esc_url_raw( trailingslashit( rest_url() ) ),
			'nonce'        => wp_create_nonce( 'wp_rest' ),
			// The plugin header is the single version source.
			'version'      => (string) ( get_file_data( $main, array( 'Version' => 'Version' ) )['Version'] ?? '' ),
			'proActive'    => $pro_active,
			'proVersion'   => function_exists( 'easy_svg_pro_version' ) ? (string) easy_svg_pro_version() : '',
			'proLicensed'  => $pro_licensed,
			// Only without Pro: a site that has it is not sold it again.
			'proUrl'       => $pro_active ? '' : esc_url_raw( easy_svg_panel_pro_url() ),
			// Pro's own logo for the header; empty without Pro, or from a Pro too old to hand one over.
			'proLogo'      => esc_url_raw( (string) apply_filters( 'easy_svg_panel_pro_logo', '' ) ),
			// Where the footer's stars lead: wordpress.org for the free plugin, Pro's own review window once Pro names it.
			'reviewUrl'    => esc_url_raw( easy_svg_review_url() ),
			'proReviewUrl' => esc_url_raw( (string) apply_filters( 'easy_svg_panel_pro_review_url', '' ) ),
			'iconsEnabled' => easy_svg_feature_enabled( 'icons' ),
			// Core's Icon block exists only with the 7.1 icon registry.
			'iconBlock'    => function_exists( 'easy_svg_icons_supported' ) && easy_svg_icons_supported(),
			// 0 means this site keeps no trash: a delete is final, and the panel says so.
			'trashDays'    => defined( 'EMPTY_TRASH_DAYS' ) ? max( 0, (int) EMPTY_TRASH_DAYS ) : 0,
			// The rail writes a read-only twin's origin on its own line, so Pro leaves the name as it is.
			'railOrigin'   => true,
			// The rule the library routes refuse by, so the screen offers no upload the server turns down. Pro reads it too.
			'svgUploads'   => null === easy_svg_panel_library_refused(),
		)
	);

	// Core styles are unlayered and beat any layered Chakra rule, so these are unlayered too. The numbers repeat src/theme.js; change both.
	wp_register_style( 'easy-svg-panel', false, array(), (string) filemtime( $build ) );
	wp_enqueue_style( 'easy-svg-panel' );
	wp_add_inline_style(
		'easy-svg-panel',
		// Scoped to this screen; html too, because body is only as tall as the viewport.
		'html:has(body.toplevel_page_' . EASY_SVG_PANEL_SLUG . '),body.toplevel_page_' . EASY_SVG_PANEL_SLUG . '{background:#eef1f6}'
		. 'body.toplevel_page_' . EASY_SVG_PANEL_SLUG . ' #wpcontent{padding-left:0}'
		// Below 600px core lets the admin bar scroll away; a crowded one wraps, and in the flow it pushes the panel down.
		. '@media screen and (max-width:600px){html.wp-toolbar:has(body.toplevel_page_' . EASY_SVG_PANEL_SLUG . '){padding-top:0}body.toplevel_page_' . EASY_SVG_PANEL_SLUG . ' #wpadminbar{position:relative;height:auto;display:flow-root}body.toplevel_page_' . EASY_SVG_PANEL_SLUG . ' #wpbody{padding-top:0}}'
		. '.wrap:has(> #easy-svg-panel){margin:0}'
		. easy_svg_font_faces( $main )
		// inherit on the controls: a button, input or select takes the browser's font, not the document's.
		. '.wrap #easy-svg-panel,.wrap #easy-svg-panel :is(div,p,span,h1,h2,h3,h4,label,a,li,td,th,strong,em,small)'
		. '{font-family:Ubuntu,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}'
		. '.wrap #easy-svg-panel :is(button,input,textarea,select){font-family:inherit}'
		. '.wrap #easy-svg-panel h1{font-size:28px;font-weight:700;margin:0;padding:0}'
		// wp-admin's unlayered inherit on buttons beats Chakra's recipe; the header's page tabs set their own weight.
		. '.wrap #easy-svg-panel .chakra-button:not([data-page-tab]){font-size:16px;font-weight:500}'
		// A dialog locks scrolling; keeping the scrollbar's room stops the panel jumping sideways.
		. 'html{scrollbar-gutter:stable}'
		// The panel draws its own footer, so wp-admin's goes, with the room kept for it.
		. '#wpfooter{display:none}#wpbody-content{padding-bottom:0}'
		. '.wrap #easy-svg-panel a:not(.chakra-button){color:#203159}'
		. '.wrap #easy-svg-panel a:not(.chakra-button):hover{color:#11203f}'
		// core's forms.css is unlayered too. The values repeat src/theme.js; change both.
		. '.wrap #easy-svg-panel :is(input[type=text],input[type=search],input[type=number],input[type=email],input[type=url],textarea,select)'
		. '{background:#fff;border:1px solid #d9dee8;border-radius:5px;padding:8px 12px}'
		. '.wrap #easy-svg-panel :is(input[type=text],input[type=search],input[type=number],input[type=email],input[type=url],select){min-height:44px}'
		. '.wrap #easy-svg-panel :is(input,textarea,select):is(:focus,:focus-visible){background:#fff;border-color:#203159;box-shadow:0 0 0 3px rgba(32,49,89,.26);outline:none}'
		// Room for the icon in front, aimed at the field's own attribute: a selector scoped to the library can silently stop matching.
		. '.wrap #easy-svg-panel input[data-esw-search]{padding-inline-start:36px}'
		// The copy field reads as code, and only this rule can undo the inherit above.
		. '.wrap #easy-svg-panel [data-scope=clipboard] input{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}'
	);

	// Let Pro enqueue its extension bundle with ours as a dependency.
	do_action( 'easy_svg_panel_enqueue', 'easy-svg-panel' );
}

function easy_svg_panel_rest(): void {
	$perm = 'easy_svg_panel_rest_permission';

	// Declared args refuse a wrong type early; handlers still re-sanitise for callers outside REST.
	$id_arg = array(
		'type'        => 'integer',
		'required'    => true,
		'minimum'     => 1,
		'description' => __( 'The icon post id, as the library listing reports it.', 'easy-svg' ),
	);

	// svg_upload stays in the answer for older clients; uploads are always sanitised and have no switch, so a write to it is ignored.
	$settings_fields = array(
		'svg_upload' => array(
			'type'        => 'boolean',
			'readonly'    => true,
			'description' => __( 'Always true: SVG uploads are allowed and every file is sanitized. There is no switch for this, and a value sent here is ignored.', 'easy-svg' ),
		),
		'icons'      => array(
			'type'        => 'boolean',
			'description' => __( 'Whether the icon library and the Icon block are registered.', 'easy-svg' ),
		),
	);
	register_rest_route(
		'easy-svg/v1',
		'/settings',
		array(
			array(
				'methods'             => 'GET',
				'permission_callback' => $perm,
				'callback'            => 'easy_svg_panel_settings_get',
			),
			array(
				'methods'             => 'POST',
				'permission_callback' => $perm,
				'callback'            => 'easy_svg_panel_settings_post',
				// None required: an absent key keeps its stored value.
				'args'                => $settings_fields,
			),
			'schema' => static fn() => array(
				'$schema'    => 'http://json-schema.org/draft-04/schema#',
				'title'      => 'easy-svg-settings',
				'type'       => 'object',
				'properties' => $settings_fields,
			),
		)
	);
	register_rest_route(
		'easy-svg/v1',
		'/support/report',
		array(
			'methods'             => 'GET',
			'permission_callback' => $perm,
			'callback'            => static fn() => new WP_REST_Response( array( 'text' => easy_svg_support_text( easy_svg_support_lines() ) ) ),
		)
	);
	// The first 500 by default: the abilities and older callers read the whole list from one answer.
	$limit_arg = array(
		'type'        => 'integer',
		'minimum'     => 1,
		'maximum'     => EASY_SVG_PANEL_LIBRARY_MAX,
		'default'     => EASY_SVG_PANEL_LIBRARY_MAX,
		'description' => __( 'How many icons the answer lists.', 'easy-svg' ),
	);
	register_rest_route(
		'easy-svg/v1',
		'/library',
		array(
			'methods'             => 'GET',
			'permission_callback' => $perm,
			'callback'            => 'easy_svg_panel_library_get',
			'args'                => array(
				'search' => array(
					'type'        => 'string',
					'required'    => false,
					'description' => __( 'Narrow the list to icons whose name or slug contains this.', 'easy-svg' ),
				),
				'offset' => array(
					'type'        => 'integer',
					'minimum'     => 0,
					'default'     => 0,
					'description' => __( 'How many icons to skip, for the next page.', 'easy-svg' ),
				),
				'limit'  => $limit_arg,
			),
		)
	);
	register_rest_route(
		'easy-svg/v1',
		'/library/add',
		array(
			'methods'             => 'POST',
			'permission_callback' => $perm,
			'callback'            => 'easy_svg_panel_library_add',
			'args'                => array(
				'markup'     => array(
					'type'        => 'string',
					'required'    => true,
					'description' => __( 'The SVG markup. Sanitized and hardened on the way in, whatever is sent.', 'easy-svg' ),
				),
				'label'      => array(
					'type'        => 'string',
					'description' => __( 'The icon name a person reads. The slug is derived from it and never moves afterwards.', 'easy-svg' ),
				),
				'request_id' => array(
					'type'        => 'string',
					'maxLength'   => 64,
					'pattern'     => '^[A-Za-z0-9_-]+$',
					'description' => __( 'Made up by the client once per add. A retry with the same one gets the first answer instead of a second copy.', 'easy-svg' ),
				),
				'limit'      => $limit_arg,
			),
		)
	);
	register_rest_route(
		'easy-svg/v1',
		'/library/media',
		array(
			'methods'             => 'POST',
			'permission_callback' => $perm,
			'callback'            => 'easy_svg_panel_library_media',
			'args'                => array(
				'ids' => array(
					'type'        => 'array',
					'required'    => true,
					'items'       => array( 'type' => 'integer' ),
					'minItems'    => 1,
					// The handler's own bound, so the panel chunks instead of being refused.
					'maxItems'    => EASY_SVG_MEDIA_MAX_IDS,
					'description' => __( 'Attachment ids of SVGs already in the media library.', 'easy-svg' ),
				),
				'limit' => $limit_arg,
			),
		)
	);
	register_rest_route(
		'easy-svg/v1',
		'/library/off',
		array(
			'methods'             => 'POST',
			'permission_callback' => $perm,
			'callback'            => 'easy_svg_panel_library_off',
			'args'                => array(
				'ids'   => array(
					'type'     => 'array',
					'required' => true,
					'items'    => array( 'type' => 'integer' ),
					'maxItems' => 500,
				),
				'off'   => array(
					'type'     => 'boolean',
					'required' => true,
				),
				'limit' => $limit_arg,
			),
		)
	);
	register_rest_route(
		'easy-svg/v1',
		'/library/rename',
		array(
			'methods'             => 'POST',
			'permission_callback' => $perm,
			'callback'            => 'easy_svg_panel_library_rename',
			'args'                => array(
				'id'    => $id_arg,
				'label' => array(
					'type'        => 'string',
					'required'    => true,
					'description' => __( 'The new visible name. The slug is not touched.', 'easy-svg' ),
				),
				'limit' => $limit_arg,
			),
		)
	);
	register_rest_route(
		'easy-svg/v1',
		'/library/delete',
		array(
			'methods'             => 'POST',
			'permission_callback' => $perm,
			'callback'            => 'easy_svg_panel_library_delete',
			'args'                => array(
				'id'    => $id_arg,
				'limit' => $limit_arg,
			),
		)
	);

	$ids_arg = array(
		'type'        => 'array',
		'required'    => true,
		'items'       => array( 'type' => 'integer' ),
		'minItems'    => 1,
		// The handler's own bound, so the panel chunks instead of being refused.
		'maxItems'    => EASY_SVG_TRASH_MAX_IDS,
		'description' => __( 'Ids of icons in the trash, as the trash listing reports them.', 'easy-svg' ),
	);
	// A selection in one request, which answers with the library once instead of once per icon.
	register_rest_route(
		'easy-svg/v1',
		'/library/delete-many',
		array(
			'methods'             => 'POST',
			'permission_callback' => $perm,
			'callback'            => 'easy_svg_panel_library_delete_many',
			'args'                => array(
				'ids'   => array_merge( $ids_arg, array( 'description' => __( 'Ids of icons in the library, as the library listing reports them.', 'easy-svg' ) ) ),
				'limit' => $limit_arg,
			),
		)
	);
	register_rest_route(
		'easy-svg/v1',
		'/library/trash',
		array(
			'methods'             => 'GET',
			'permission_callback' => $perm,
			'callback'            => 'easy_svg_panel_library_trash',
			'args'                => array(
				'offset' => array(
					'type'        => 'integer',
					'minimum'     => 0,
					'default'     => 0,
					'description' => __( 'How many icons to skip, for the next page.', 'easy-svg' ),
				),
				'limit'  => array(
					'type'        => 'integer',
					'minimum'     => 1,
					'maximum'     => EASY_SVG_TRASH_PAGE_MAX,
					'default'     => EASY_SVG_TRASH_PAGE_MAX,
					'description' => __( 'How many icons the answer lists.', 'easy-svg' ),
				),
			),
		)
	);
	register_rest_route(
		'easy-svg/v1',
		'/library/restore',
		array(
			'methods'             => 'POST',
			'permission_callback' => $perm,
			'callback'            => 'easy_svg_panel_library_restore',
			'args'                => array(
				'ids'   => $ids_arg,
				'limit' => $limit_arg,
			),
		)
	);
	register_rest_route(
		'easy-svg/v1',
		'/library/purge',
		array(
			'methods'             => 'POST',
			'permission_callback' => $perm,
			'callback'            => 'easy_svg_panel_library_purge',
			'args'                => array(
				'ids' => $ids_arg,
			),
		)
	);
}

// Every trashed icon's markup is in the answer, and each restore or final delete is a write.
const EASY_SVG_TRASH_PAGE_MAX = 100;
const EASY_SVG_TRASH_MAX_IDS  = 100;

// A bound, not a page size: every icon's markup is in the response.
const EASY_SVG_PANEL_LIBRARY_MAX = 500;

// offset rounds down to a whole page of limit; wp_count_posts() is cached by WordPress and busted on save.
/** @return array{items:array,total:int,offset:int,limit:int,has_more:bool,truncated:bool} */
function easy_svg_panel_library_payload( string $search = '', int $offset = 0, int $limit = EASY_SVG_PANEL_LIBRARY_MAX ) {
	$limit  = max( 1, min( EASY_SVG_PANEL_LIBRARY_MAX, $limit ) );
	$offset = max( 0, $offset ) - ( max( 0, $offset ) % $limit );
	if ( ! function_exists( 'easy_svg_icon_page' ) ) {
		return array(
			'items'       => array(),
			'total'       => 0,
			'offset'      => $offset,
			'limit'       => $limit,
			'has_more'    => false,
			'truncated'   => false,
			'trash_total' => 0,
		);
	}

	// One more than asked: whether a next page exists, without a count query.
	$page  = (int) ( $offset / $limit ) + 1;
	$items = array_values( (array) easy_svg_icon_page( $page, $limit, $search ) );
	$more  = false;
	if ( count( $items ) === $limit ) {
		$peek = (array) easy_svg_icon_page( $page * $limit + 1, 1, $search );
		$more = array() !== $peek;
	}
	$total = $offset + count( $items ) + ( $more ? 1 : 0 );
	// Only the unfiltered list can say how many icons the site has.
	if ( '' === $search && function_exists( 'wp_count_posts' ) ) {
		$counts = wp_count_posts( EASY_SVG_ICON_POST_TYPE );
		$total  = max( $total, (int) ( $counts->publish ?? 0 ) );
	} elseif ( $more && function_exists( 'easy_svg_icon_search_count' ) ) {
		// Past one page the matches are counted, not guessed from the page.
		$total = max( $total, (int) easy_svg_icon_search_count( $search ) );
	}

	return array(
		'items'       => $items,
		'total'       => $total,
		'offset'      => $offset,
		'limit'       => $limit,
		'has_more'    => $more,
		// Kept for callers of the one-answer list: more icons than it carries.
		'truncated'   => $more,
		// With every answer, so the rail's Trash entry needs no request of its own.
		'trash_total' => easy_svg_panel_trash_total(),
	);
}

function easy_svg_panel_trash_total(): int {
	if ( ! function_exists( 'wp_count_posts' ) || ! easy_svg_feature_enabled( 'icons' ) ) {
		return 0;
	}
	return max( 0, (int) ( wp_count_posts( EASY_SVG_ICON_POST_TYPE )->trash ?? 0 ) );
}

function easy_svg_panel_request_limit( $request ): int {
	$limit = is_object( $request ) && method_exists( $request, 'get_param' ) ? (int) $request->get_param( 'limit' ) : 0;
	return $limit > 0 ? $limit : EASY_SVG_PANEL_LIBRARY_MAX;
}

function easy_svg_panel_library_get( $request ) {
	$off = easy_svg_panel_library_closed();
	if ( null !== $off ) {
		return $off;
	}
	$search = sanitize_text_field( (string) $request->get_param( 'search' ) );
	return new WP_REST_Response(
		easy_svg_panel_library_payload( $search, (int) $request->get_param( 'offset' ), easy_svg_panel_request_limit( $request ) )
	);
}

function easy_svg_panel_add_message( string $state ): string {
	switch ( $state ) {
		case 'no_sanitizer':
			return __( 'The SVG check did not load, so nothing was saved. Reinstall Easy SVG.', 'easy-svg' );
		case 'empty':
			return __( 'That SVG is empty, so there was nothing to store.', 'easy-svg' );
		case 'not_saved':
			return __( 'That SVG could not be saved. Check the file and try again.', 'easy-svg' );
		case 'added':
			return __( 'Icon added.', 'easy-svg' );
		case 'not_found':
			return __( 'That file is no longer in the media library.', 'easy-svg' );
		case 'no_file':
			return __( 'That file is not stored on this server, so it could not be read.', 'easy-svg' );
		case 'not_svg':
			return __( 'This SVG contains parts that are not allowed.', 'easy-svg' );
		case 'bad_name':
			return __( 'That name cannot be turned into an icon name. Use letters and numbers.', 'easy-svg' );
		case 'too_large':
			return sprintf(
				/* translators: %s: the largest SVG file this site accepts, e.g. "2 MB". */
				__( 'That SVG is larger than %s, the most this site accepts.', 'easy-svg' ),
				size_format( easy_svg_max_bytes() )
			);
		case 'too_complex':
			return __( 'That SVG has too many parts to be read safely.', 'easy-svg' );
		default:
			// The catch-all: saying so and offering a move beats a dead end.
			return __( 'The icon could not be added. Try again or use another file.', 'easy-svg' );
	}
}

// How long a request_id answers a retry: long enough for a timeout and a second click.
const EASY_SVG_ADD_REPLAY_SECONDS = 600;

// Library and trash belong to the icon manager: switched off, no route writes, lists or empties. One sentence, the one the Library tab shows.
function easy_svg_panel_library_closed(): ?WP_Error {
	if ( easy_svg_feature_enabled( 'icons' ) ) {
		return null;
	}
	return new WP_Error( 'easy_svg_no_store', __( 'The icon library is off. Switch it on under the Settings tab.', 'easy-svg' ), array( 'status' => 409 ) );
}

// The library takes SVG files as an upload does, so a network that does not allow them closes it to new icons too.
function easy_svg_panel_library_refused(): ?WP_Error {
	if ( ! function_exists( 'easy_svg_network_allows_svg' ) || easy_svg_network_allows_svg() ) {
		return null;
	}
	return new WP_Error( 'easy_svg_network_no_svg', __( 'This network does not allow SVG files, so no icon can be added. A network administrator can add svg to the upload file types.', 'easy-svg' ), array( 'status' => 403 ) );
}

// easy_svg_add_icon() sanitises and hardens the markup, the same bar an upload meets.
function easy_svg_panel_library_add( $request ) {
	$off = easy_svg_panel_library_closed() ?? easy_svg_panel_library_refused();
	if ( null !== $off ) {
		return $off;
	}
	// get_param(), not the JSON body alone: the declared args validate a form post or set_param() too.
	$label  = sanitize_text_field( (string) $request->get_param( 'label' ) );
	$markup = (string) $request->get_param( 'markup' );
	// A retry after a timeout must not store the icon again as name-2; only an add that worked is remembered.
	$rid    = (string) $request->get_param( 'request_id' );
	$replay = 1 === preg_match( '/^[A-Za-z0-9_-]{1,64}$/', $rid ) ? 'easy_svg_add_' . md5( get_current_user_id() . '|' . $rid ) : '';
	$added  = '' !== $replay ? get_transient( $replay ) : false;
	if ( ! is_array( $added ) ) {
		$result = easy_svg_add_icon_result( $label, $markup );
		if ( 'added' !== $result['state'] ) {
			return new WP_Error( 'easy_svg_add_failed', easy_svg_panel_add_message( (string) $result['state'] ), array( 'status' => 422 ) );
		}
		$added = easy_svg_panel_added_names( $result );
		if ( '' !== $replay ) {
			set_transient( $replay, $added, EASY_SVG_ADD_REPLAY_SECONDS );
			update_post_meta( $added['id'], EASY_SVG_ADD_REPLAY_META, $replay );
		}
	}
	$payload          = easy_svg_panel_library_payload( '', 0, easy_svg_panel_request_limit( $request ) );
	$payload['added'] = $added;
	return new WP_REST_Response( $payload );
}

// The slug differs from the wanted one when the name was taken, and the slug is what a block calls.
/** @return array{id:int, slug:string, wanted:string} */
function easy_svg_panel_added_names( array $result ): array {
	$slug = (string) ( $result['slug'] ?? '' );
	return array(
		'id'     => (int) ( $result['id'] ?? 0 ),
		'slug'   => $slug,
		'wanted' => (string) ( $result['wanted'] ?? $slug ),
	);
}

// The server sanitises every file, so one click must not ask for unbounded work.
const EASY_SVG_MEDIA_MAX_IDS = 25;

// Attachment ids, never bytes: an offloaded library would hit CORS, and an old SVG may never have been cleaned.
function easy_svg_panel_library_media( $request ) {
	$off = easy_svg_panel_library_closed() ?? easy_svg_panel_library_refused();
	if ( null !== $off ) {
		return $off;
	}
	$ids = $request->get_param( 'ids' );
	$ids = is_array( $ids ) ? array_values( $ids ) : array();
	if ( array() === $ids ) {
		return new WP_Error( 'easy_svg_no_ids', __( 'Choose at least one SVG from the media library.', 'easy-svg' ), array( 'status' => 400 ) );
	}
	if ( count( $ids ) > EASY_SVG_MEDIA_MAX_IDS ) {
		return new WP_Error(
			'easy_svg_too_many',
			sprintf(
				/* translators: %d: how many media files one request may carry. */
				__( 'Choose at most %d files at a time.', 'easy-svg' ),
				EASY_SVG_MEDIA_MAX_IDS
			),
			array( 'status' => 400 )
		);
	}

	$report = array();
	foreach ( $ids as $raw ) {
		$id       = max( 0, (int) $raw );
		$result   = easy_svg_panel_media_add( $id );
		$state    = (string) $result['state'];
		$names    = 'added' === $state ? easy_svg_panel_added_names( $result ) : array();
		// id stays the attachment the row is about; the new icon's id has a name of its own.
		if ( isset( $names['id'] ) ) {
			$names['icon_id'] = $names['id'];
			unset( $names['id'] );
		}
		$report[] = array_merge(
			array(
				'id'      => $id,
				'label'   => 'not_found' === $state ? '' : (string) get_the_title( $id ),
				'state'   => $state,
				'message' => easy_svg_panel_add_message( $state ),
			),
			$names
		);
	}

	$payload           = easy_svg_panel_library_payload( '', 0, easy_svg_panel_request_limit( $request ) );
	$payload['report'] = $report;
	return new WP_REST_Response( $payload );
}

// Stored paths are only post meta and a plugin's bundled SVG is no upload; resolved, so ../ cannot fake inside. The upload net calls it too.
function easy_svg_path_in_uploads( string $path ): bool {
	if ( ! function_exists( 'wp_upload_dir' ) ) {
		return false;
	}
	$uploads = wp_upload_dir( null, false );
	$base    = empty( $uploads['basedir'] ) ? false : realpath( (string) $uploads['basedir'] );
	$real    = realpath( $path );
	if ( false === $base || false === $real ) {
		return false;
	}
	return 0 === strpos( $real, rtrim( $base, '/\\' ) . DIRECTORY_SEPARATOR );
}

/** @return array{state:string, id?:int, slug?:string, wanted?:string} */
function easy_svg_panel_media_add( int $id ): array {
	$post = $id > 0 ? get_post( $id ) : null;
	// Any id reaches this route, and a privacy request's title is an email core keeps from site admins: only a readable attachment exists here.
	if ( ! $post || 'attachment' !== $post->post_type || ! current_user_can( 'read_post', $id ) ) {
		return array( 'state' => 'not_found' );
	}
	if ( 'image/svg+xml' !== strtolower( (string) get_post_mime_type( $id ) ) ) {
		return array( 'state' => 'not_svg' );
	}
	$path = get_attached_file( $id );
	if ( ! is_string( $path ) || '' === $path || ! is_readable( $path ) || ! easy_svg_path_in_uploads( $path ) ) {
		return array( 'state' => 'no_file' );
	}
	// On disk first: reading a huge file is the cost the bound exists to refuse.
	if ( function_exists( 'easy_svg_max_bytes' ) && (int) filesize( $path ) > easy_svg_max_bytes() ) {
		return array( 'state' => 'too_large' );
	}
	$markup = file_get_contents( $path );
	if ( ! is_string( $markup ) ) {
		return array( 'state' => 'no_file' );
	}
	return easy_svg_add_icon_result( sanitize_text_field( (string) get_the_title( $id ) ), $markup );
}

/**
 * @param WP_REST_Request $request
 * @return WP_REST_Response|WP_Error
 */
function easy_svg_panel_library_off( $request ) {
	$off = easy_svg_panel_library_closed();
	if ( null !== $off ) {
		return $off;
	}
	// "false" from a form or a client is false, not a non-empty string.
	easy_svg_switch_icons( (array) ( $request->get_param( 'ids' ) ?? array() ), rest_sanitize_boolean( $request->get_param( 'off' ) ?? false ) );
	return new WP_REST_Response( easy_svg_panel_library_payload( '', 0, easy_svg_panel_request_limit( $request ) ) );
}

// Only the title: post_name is the icon's identity, and a moved slug renders as nothing.
function easy_svg_panel_library_rename( $request ) {
	$off = easy_svg_panel_library_closed();
	if ( null !== $off ) {
		return $off;
	}
	$id = max( 0, (int) $request->get_param( 'id' ) );

	// A title that is blank after sanitising means no rename at all.
	$label = sanitize_text_field( (string) $request->get_param( 'label' ) );

	// An add-on renaming an icon must meet the same kses handling and cache bust in easy_svg_rename_icon().
	$state = easy_svg_rename_icon( $id, $label );
	if ( 'not_found' === $state ) {
		return new WP_Error( 'easy_svg_no_icon', __( 'Icon not found.', 'easy-svg' ), array( 'status' => 404 ) );
	}
	if ( 'no_label' === $state ) {
		return new WP_Error( 'easy_svg_bad_label', __( 'An icon needs a name.', 'easy-svg' ), array( 'status' => 422 ) );
	}
	if ( 'renamed' !== $state ) {
		return new WP_Error( 'easy_svg_rename_failed', __( 'The icon could not be renamed.', 'easy-svg' ), array( 'status' => 500 ) );
	}

	return new WP_REST_Response( easy_svg_panel_library_payload( '', 0, easy_svg_panel_request_limit( $request ) ) );
}

function easy_svg_panel_library_delete( $request ) {
	$off = easy_svg_panel_library_closed();
	if ( null !== $off ) {
		return $off;
	}
	$id = max( 0, (int) $request->get_param( 'id' ) );
	if ( null === easy_svg_icon_post( $id ) ) {
		return new WP_Error( 'easy_svg_no_icon', __( 'Icon not found.', 'easy-svg' ), array( 'status' => 404 ) );
	}
	// Into the trash; `trashed` is false where the site keeps none and the icon is gone for good.
	$state = easy_svg_trash_icon( $id );
	if ( 'trashed' !== $state && 'deleted' !== $state ) {
		return new WP_Error( 'easy_svg_delete_failed', __( 'The icon could not be deleted. Try again.', 'easy-svg' ), array( 'status' => 500 ) );
	}
	$payload            = easy_svg_panel_library_payload( '', 0, easy_svg_panel_request_limit( $request ) );
	$payload['trashed'] = 'trashed' === $state;
	return new WP_REST_Response( $payload );
}

// `trashed` can come back, `deleted` went for good on a site that keeps no trash, `gone` was gone already, `missed` failed.
function easy_svg_panel_library_delete_many( $request ) {
	$off = easy_svg_panel_library_closed();
	if ( null !== $off ) {
		return $off;
	}
	$ids = easy_svg_panel_trash_ids( $request );
	if ( is_wp_error( $ids ) ) {
		return $ids;
	}
	$done = array(
		'trashed' => array(),
		'deleted' => array(),
		'gone'    => array(),
		'missed'  => array(),
	);
	foreach ( $ids as $id ) {
		$state = null === easy_svg_icon_post( $id ) ? 'not_found' : easy_svg_trash_icon( $id );
		$into  = array(
			'trashed'   => 'trashed',
			'deleted'   => 'deleted',
			'not_found' => 'gone',
		)[ $state ] ?? 'missed';
		$done[ $into ][] = $id;
	}
	$payload = array_merge( easy_svg_panel_library_payload( '', 0, easy_svg_panel_request_limit( $request ) ), $done );
	if ( array() !== $done['missed'] ) {
		$payload['message'] = sprintf(
			/* translators: %d: number of icons that could not be deleted. */
			_n( '%d icon could not be deleted. Try again.', '%d icons could not be deleted. Try again.', count( $done['missed'] ), 'easy-svg' ),
			count( $done['missed'] )
		);
	}
	return new WP_REST_Response( $payload );
}

function easy_svg_panel_library_trash( $request ) {
	$off = easy_svg_panel_library_closed();
	if ( null !== $off ) {
		return $off;
	}
	$limit  = (int) $request->get_param( 'limit' );
	$limit  = $limit > 0 ? min( EASY_SVG_TRASH_PAGE_MAX, $limit ) : EASY_SVG_TRASH_PAGE_MAX;
	$offset = max( 0, (int) $request->get_param( 'offset' ) );
	$offset = $offset - ( $offset % $limit );
	$items  = function_exists( 'easy_svg_trashed_icon_page' ) ? array_values( (array) easy_svg_trashed_icon_page( (int) ( $offset / $limit ) + 1, $limit ) ) : array();
	$total  = max( $offset + count( $items ), easy_svg_panel_trash_total() );
	return new WP_REST_Response(
		array(
			'items'    => $items,
			'total'    => $total,
			'offset'   => $offset,
			'limit'    => $limit,
			'has_more' => $offset + count( $items ) < $total,
		)
	);
}

// Whole ids, each once, and never more than one request may carry: a caller outside REST skips the schema.
/** @return int[]|WP_Error */
function easy_svg_panel_trash_ids( $request ) {
	$ids = $request->get_param( 'ids' );
	$ids = is_array( $ids ) ? array_map( 'intval', $ids ) : array();
	$ids = array_values( array_unique( array_filter( $ids, static fn( $id ) => $id > 0 ) ) );
	if ( array() === $ids ) {
		return new WP_Error( 'easy_svg_no_ids', __( 'Choose at least one icon.', 'easy-svg' ), array( 'status' => 400 ) );
	}
	if ( count( $ids ) > EASY_SVG_TRASH_MAX_IDS ) {
		return new WP_Error(
			'easy_svg_too_many',
			sprintf(
				/* translators: %d: how many icons one request may carry. */
				__( 'Choose at most %d icons at a time.', 'easy-svg' ),
				EASY_SVG_TRASH_MAX_IDS
			),
			array( 'status' => 400 )
		);
	}
	return $ids;
}

// `slug` is the address an icon came back under; it differs from `wanted` when that one was taken meanwhile.
function easy_svg_panel_library_restore( $request ) {
	$off = easy_svg_panel_library_closed();
	if ( null !== $off ) {
		return $off;
	}
	$ids = easy_svg_panel_trash_ids( $request );
	if ( is_wp_error( $ids ) ) {
		return $ids;
	}
	$restored = array();
	$missed   = array();
	$gone     = array();
	foreach ( $ids as $id ) {
		$result = easy_svg_restore_icon( $id );
		if ( 'restored' === $result['state'] ) {
			$restored[] = array(
				'id'     => (int) $result['id'],
				'slug'   => (string) $result['slug'],
				'wanted' => (string) $result['wanted'],
			);
		} elseif ( 'not_found' === $result['state'] ) {
			// Deleted for good meanwhile, from another tab or by WordPress: not "still in the trash".
			$gone[] = $id;
		} elseif ( 'failed' === $result['state'] ) {
			$missed[] = $id;
		}
	}
	$payload             = easy_svg_panel_library_payload( '', 0, easy_svg_panel_request_limit( $request ) );
	$payload['restored'] = $restored;
	$payload['missed']   = $missed;
	$payload['gone']     = $gone;
	return new WP_REST_Response( $payload );
}

function easy_svg_panel_library_purge( $request ) {
	$off = easy_svg_panel_library_closed();
	if ( null !== $off ) {
		return $off;
	}
	$ids = easy_svg_panel_trash_ids( $request );
	if ( is_wp_error( $ids ) ) {
		return $ids;
	}
	$purged = array();
	$missed = array();
	foreach ( $ids as $id ) {
		if ( 'purged' === easy_svg_purge_icon( $id ) ) {
			$purged[] = $id;
		} else {
			$missed[] = $id;
		}
	}
	return new WP_REST_Response(
		array(
			'purged'      => $purged,
			'missed'      => $missed,
			'trash_total' => easy_svg_panel_trash_total(),
		)
	);
}

function easy_svg_panel_rest_permission(): bool {
	return current_user_can( 'manage_options' );
}

function easy_svg_panel_settings_get( $request ) {
	return new WP_REST_Response( easy_svg_settings() );
}

// Sanitising and the size cap are always on and are not toggles here.
function easy_svg_panel_settings_post( $request ) {
	$body = (array) $request->get_json_params();
	// Merged onto what is stored, not the defaults, or a partial write would switch the keys it never named off.
	update_option( EASY_SVG_SETTINGS_OPTION, easy_svg_sanitize_settings( array_merge( easy_svg_settings(), $body ) ) );
	return new WP_REST_Response( easy_svg_settings() );
}
