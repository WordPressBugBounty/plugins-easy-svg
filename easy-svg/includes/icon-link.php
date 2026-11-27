<?php
// A link for core's Icon block: two attributes of our own, the editor's link field, and an <a> around the drawing.

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Registered on the server too, or the block's attributes would be stripped when a post is saved through REST.
function easy_svg_icon_link_attributes( $args, $name ) {
    if ( 'core/icon' !== $name || ! is_array( $args ) ) {
        return $args;
    }
    $args['attributes'] = (array) ( $args['attributes'] ?? array() ) + array(
        'easySvgUrl'    => array( 'type' => 'string' ),
        'easySvgNewTab' => array(
            'type'    => 'boolean',
            'default' => false,
        ),
    );
    return $args;
}
add_filter( 'register_block_type_args', 'easy_svg_icon_link_attributes', 10, 2 );

// Inside the block's wrapper, so its alignment, margin and colours stay on the <div> core prints.
function easy_svg_icon_link_render( $html, $block ) {
    $url = is_array( $block ) ? (string) ( $block['attrs']['easySvgUrl'] ?? '' ) : '';
    // Already linked, by another plugin or inside the drawing: a second <a> around it would nest links.
    if ( ! is_string( $html ) || '' === trim( $url ) || 1 === preg_match( '/<a[\s>]/i', $html ) ) {
        return $html;
    }
    $href  = esc_url( $url );
    $start = easy_svg_root_svg_offset( $html );
    $end   = strripos( $html, '</svg>' );
    if ( '' === $href || null === $start || false === $end ) {
        return $html;
    }
    $end += strlen( '</svg>' );

    $attrs  = ' href="' . $href . '" class="wp-block-icon__link"';
    $new_tab = ! empty( $block['attrs']['easySvgNewTab'] );
    if ( $new_tab ) {
        $attrs .= ' target="_blank" rel="noopener noreferrer"';
    }
    // The name sits on the link itself: a name only inside the drawing is not read for the link by every browser.
    $name = trim( (string) ( $block['attrs']['ariaLabel'] ?? '' ) );
    if ( '' === $name ) {
        $icon  = (string) ( $block['attrs']['icon'] ?? '' );
        $parts = explode( '/', $icon, 2 );
        $name  = 2 === count( $parts ) && function_exists( 'easy_svg_icon_label' ) ? trim( (string) easy_svg_icon_label( $parts[1], $parts[0] ) ) : '';
    }
    if ( '' !== $name ) {
        if ( $new_tab ) {
            /* translators: %s: what an icon link leads to, e.g. "Prices". */
            $name = sprintf( __( '%s (opens in a new tab)', 'easy-svg' ), $name );
        }
        $attrs .= ' aria-label="' . esc_attr( $name ) . '"';
    }
    easy_svg_icon_link_style();
    $svg = substr( $html, $start, $end - $start );
    // The link carries the name; the drawing inside is hidden, or some screen readers read the name twice.
    if ( false !== strpos( $attrs, 'aria-label=' ) && class_exists( 'WP_HTML_Tag_Processor' ) ) {
        $tags = new WP_HTML_Tag_Processor( $svg );
        if ( $tags->next_tag( array( 'tag_name' => 'svg' ) ) ) {
            $tags->remove_attribute( 'role' );
            $tags->remove_attribute( 'aria-label' );
            $tags->set_attribute( 'aria-hidden', 'true' );
            $tags->set_attribute( 'focusable', 'false' );
            $svg = $tags->get_updated_html();
        }
    }
    return substr( $html, 0, $start ) . '<a' . $attrs . '>' . $svg . '</a>' . substr( $html, $end );
}
add_filter( 'render_block_core/icon', 'easy_svg_icon_link_render', 10, 2 );

// Once per page and only with a link on it: the link takes the icon's size, and keyboard focus shows.
function easy_svg_icon_link_style() {
    static $done = false;
    if ( $done ) {
        return;
    }
    $css = '.wp-block-icon__link{display:inline-flex;color:inherit;line-height:0}.wp-block-icon__link:focus-visible{outline:2px solid currentColor;outline-offset:2px}';
    // A handle of its own: core's block style may be combined away on classic themes; after wp_head it prints in the footer.
    if ( ! wp_style_is( 'easy-svg-icon-link', 'registered' ) ) {
        wp_register_style( 'easy-svg-icon-link', false, array(), (string) filemtime( __FILE__ ) );
    }
    wp_enqueue_style( 'easy-svg-icon-link' );
    $done = false !== wp_add_inline_style( 'easy-svg-icon-link', $css );
}

function easy_svg_enqueue_icon_link() {
    if ( ! easy_svg_icons_supported() ) {
        return;
    }
    $main = dirname( __DIR__ ) . '/easy-svg.php';
    $file = dirname( __DIR__ ) . '/assets/icon-block-link.js';
    if ( ! is_readable( $file ) ) {
        return;
    }
    wp_enqueue_script(
        'easy-svg-icon-block-link',
        plugins_url( 'assets/icon-block-link.js', $main ),
        array( 'wp-hooks', 'wp-element', 'wp-i18n', 'wp-compose', 'wp-block-editor', 'wp-components', 'wp-blocks' ),
        (string) filemtime( $file ),
        true
    );
    wp_set_script_translations( 'easy-svg-icon-block-link', 'easy-svg', dirname( __DIR__ ) . '/languages' );
}
add_action( 'enqueue_block_editor_assets', 'easy_svg_enqueue_icon_link' );
