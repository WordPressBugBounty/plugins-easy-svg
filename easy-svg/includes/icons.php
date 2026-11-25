<?php
// The icon registry is WordPress 7.1 and this plugin supports 6.6, so everything here must be absent-safe.

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// `core` is a reserved collection name.
const EASY_SVG_ICON_COLLECTION = 'easy-svg';

// Private: never a URL, never a query.
const EASY_SVG_ICON_POST_TYPE = 'esw_icon';

// Duplicated from WP_Icons_Registry on purpose: core refuses a bad name through _doing_it_wrong, so the icon never appears.
const EASY_SVG_ICON_NAME_PATTERN = '/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/D';

/** @param callable|null $sanitize */
function easy_svg_icon_slug( $label, $sanitize = null ) {
    if ( null === $sanitize ) {
        $sanitize = function_exists( 'sanitize_title' ) ? 'sanitize_title' : 'strtolower';
    }

    $slug = (string) call_user_func( $sanitize, (string) $label );

    // Folded, not rejected: a sanitiser that leaves capitals is a configuration problem, not the user's mistake.
    $slug = strtolower( $slug );

    return 1 === preg_match( EASY_SVG_ICON_NAME_PATTERN, $slug ) ? $slug : '';
}

function easy_svg_icon_name( $slug ) {
    $slug = (string) $slug;

    if ( 1 !== preg_match( EASY_SVG_ICON_NAME_PATTERN, $slug ) ) {
        return '';
    }

    return EASY_SVG_ICON_COLLECTION . '/' . $slug;
}

// Never add a key: core refuses any key but label, content and file_path, and the icon then silently does not exist.
function easy_svg_icon_args( $label, $content ) {
    return array(
        'label'   => (string) $label,
        'content' => (string) $content,
    );
}

function easy_svg_icons_supported() {
    return function_exists( 'wp_register_icon' ) && function_exists( 'wp_register_icon_collection' );
}

// Editor only: a reader cannot fix a missing icon, so the front end stays silent.
function easy_svg_enqueue_icon_block_notice() {
    if ( ! easy_svg_icons_supported() ) {
        return;
    }

    $main = dirname( __DIR__ ) . '/easy-svg.php';
    $file = dirname( __DIR__ ) . '/assets/icon-block-notice.js';
    if ( ! is_readable( $file ) ) {
        return;
    }

    wp_enqueue_script(
        'easy-svg-icon-block-notice',
        plugins_url( 'assets/icon-block-notice.js', $main ),
        array( 'wp-hooks', 'wp-element', 'wp-data', 'wp-i18n', 'wp-compose', 'wp-block-editor' ),
        (string) filemtime( $file ),
        true
    );
    // The path points at the catalogue this plugin bundles.
    wp_set_script_translations( 'easy-svg-icon-block-notice', 'easy-svg', dirname( __DIR__ ) . '/languages' );
}
// Hooked in easy-svg.php so the suite can load this file without WordPress.

function easy_svg_hardened_once( $markup ) {
    static $seen = array();
    if ( '' === $markup ) {
        return '';
    }
    $key = md5( $markup );
    if ( ! isset( $seen[ $key ] ) ) {
        $seen[ $key ] = easy_svg_harden_icon_markup( $markup );
    }
    return $seen[ $key ];
}

// get_page_by_path() matches any status, so a draft, private or trashed icon would otherwise reach every visitor.
function easy_svg_is_published_icon( $post ) {
    return is_object( $post )
        && EASY_SVG_ICON_POST_TYPE === ( $post->post_type ?? '' )
        && 'publish' === ( $post->post_status ?? '' );
}

// Hardened again on read: a post written past the upload path (an import, `wp post update`) is printed into every page.
function easy_svg_icon_markup( $slug, $collection = EASY_SVG_ICON_COLLECTION ) {
    $slug   = (string) $slug;
    $markup = '';
    if ( EASY_SVG_ICON_COLLECTION === $collection ) {
        if ( easy_svg_icon_lookup_ready() ) {
            $row    = easy_svg_cached_icon_row( $slug );
            $markup = null === $row ? '' : easy_svg_hardened_once( (string) $row['content'] );
        } else {
            $post = function_exists( 'get_page_by_path' ) ? get_page_by_path( $slug, OBJECT, EASY_SVG_ICON_POST_TYPE ) : null;
            if ( easy_svg_is_published_icon( $post ) ) {
                $markup = easy_svg_hardened_once( (string) $post->post_content );
            }
        }
    }

    // The filtered markup is printed as is, so an add-on must return SVG already hardened by easy_svg_harden_icon_markup().
    $filtered = apply_filters( 'easy_svg_icon_markup', $markup, $slug, (string) $collection );
    $markup   = is_string( $filtered ) ? $filtered : '';

    if ( '' === $markup ) {
        $markup = easy_svg_kept_icon_markup( $slug, (string) $collection );
    }

    return '' !== $markup ? $markup : easy_svg_registry_icon_markup( $slug, (string) $collection );
}

// Last: an icon WordPress's own registry holds (core's collection, another plugin's), which no add-on answered for.
function easy_svg_registry_icon_markup( $slug, $collection ) {
    // Named as a string, as the guard above names the 7.1 functions: the class is missing on older WordPress.
    $registry = 'WP_Icons_Registry';
    if ( EASY_SVG_ICON_COLLECTION === $collection || '' === (string) $slug || ! class_exists( $registry ) ) {
        return '';
    }
    // Raw content, not wp_get_icon(): that adds a size and class of its own, and easy_svg_icon() applies the caller's.
    $icon    = call_user_func( array( $registry, 'get_instance' ) )->get_registered_icon( $collection . '/' . $slug );
    $content = is_array( $icon ) ? (string) ( $icon['content'] ?? '' ) : '';
    return '' === $content ? '' : easy_svg_hardened_once( $content );
}

// An add-on switched off left this icon behind; the template tag and the shortcode print it like the block does.
function easy_svg_kept_icon_markup( $slug, $collection ) {
    if ( EASY_SVG_ICON_COLLECTION === $collection || ! function_exists( 'get_option' ) ) {
        return '';
    }
    $kept    = get_option( EASY_SVG_KEPT_ICONS_OPTION, array() );
    $content = is_array( $kept ) ? (string) ( $kept[ $collection ]['icons'][ (string) $slug ]['content'] ?? '' ) : '';
    return '' === $content ? '' : easy_svg_hardened_once( $content );
}

// The store is read straight from the table once the icon manager is loaded; without it, get_page_by_path() answers.
function easy_svg_icon_lookup_ready() {
    return defined( 'EASY_SVG_ICON_VERSION' ) && function_exists( 'get_option' ) && isset( $GLOBALS['wpdb'] ) && is_object( $GLOBALS['wpdb'] );
}

// get_page_by_path() matches the slug as sanitize_title_for_query() leaves it, so a lookup here does too.
function easy_svg_icon_query_slug( $slug ) {
    $slug = rawurlencode( urldecode( (string) $slug ) );
    return function_exists( 'sanitize_title_for_query' ) ? (string) sanitize_title_for_query( $slug ) : $slug;
}

// Every slug not seen yet this request in one query, published icons only; a slug that is none is remembered as null.
/**
 * @param string[] $slugs
 * @return array<string, array{id:int, slug:string, label:string, content:string}|null>
 */
function easy_svg_icon_rows( $slugs = array() ) {
    static $map = array(), $version = null;
    // Per site too: after switch_to_blog() the same slug is another site's icon.
    $current = ( function_exists( 'get_current_blog_id' ) ? get_current_blog_id() : 0 ) . '|' . (int) get_option( EASY_SVG_ICON_VERSION, 0 );
    if ( $version !== $current ) {
        $map     = array();
        $version = $current;
    }
    $want = array();
    foreach ( (array) $slugs as $slug ) {
        $slug = (string) $slug;
        if ( array_key_exists( $slug, $map ) ) {
            continue;
        }
        $map[ $slug ] = null;
        $query        = easy_svg_icon_query_slug( $slug );
        if ( '' !== $slug && '' !== $query ) {
            $want[ $query ][] = $slug;
        }
    }
    if ( array() === $want ) {
        return $map;
    }
    global $wpdb;
    $names = array_map( 'strval', array_keys( $want ) );
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare -- one %s per slug, all bound by this prepare(); the answer is kept for the request above.
    $rows = (array) $wpdb->get_results(
        $wpdb->prepare(
            "SELECT ID, post_name, post_title, post_content FROM {$wpdb->posts} WHERE post_type = %s AND post_status = 'publish' AND post_name IN (" . implode( ',', array_fill( 0, count( $names ), '%s' ) ) . ')',
            array_merge( array( EASY_SVG_ICON_POST_TYPE ), $names )
        )
    );
    foreach ( $rows as $row ) {
        foreach ( $want[ strtolower( (string) ( $row->post_name ?? '' ) ) ] ?? array() as $slug ) {
            $map[ $slug ] = array(
                'id'      => (int) ( $row->ID ?? 0 ),
                'slug'    => $slug,
                'label'   => (string) ( $row->post_title ?? '' ),
                'content' => (string) ( $row->post_content ?? '' ),
            );
        }
    }
    return $map;
}

/** @return array{id:int, slug:string, label:string, content:string}|null */
function easy_svg_cached_icon_row( $slug ) {
    if ( ! easy_svg_icon_lookup_ready() ) {
        return null;
    }
    return easy_svg_icon_rows( array( (string) $slug ) )[ (string) $slug ] ?? null;
}

// Before blocks and shortcodes run: every icon a post names comes from one query instead of one each.
function easy_svg_prime_content_icons( $content ) {
    if ( is_string( $content ) && function_exists( 'easy_svg_register_icons_on_demand' ) && preg_match_all( '/<!--\s+wp:icon\s+(\{[^>]*?\})\s+\/?-->/', $content, $blocks ) ) {
        $named = array();
        foreach ( $blocks[1] as $attrs ) {
            $icon = json_decode( $attrs, true )['icon'] ?? null;
            if ( is_string( $icon ) && 0 === strpos( $icon, EASY_SVG_ICON_COLLECTION . '/' ) ) {
                $named[] = substr( $icon, strlen( EASY_SVG_ICON_COLLECTION ) + 1 );
            }
        }
        easy_svg_register_icons_on_demand( $named );
    }
    if ( ! is_string( $content ) || false === strpos( $content, '[easy_svg_icon' ) || ! easy_svg_icon_lookup_ready() ) {
        return $content;
    }
    $slugs = array();
    if ( preg_match_all( '/\[easy_svg_icon\s[^\]]*?\b(?:name|icon)\s*=\s*(["\']?)([^"\'\s\]]+)\1/i', $content, $found ) ) {
        foreach ( $found[2] as $name ) {
            $parts = explode( '/', (string) $name, 2 );
            if ( 1 === count( $parts ) ) {
                $slugs[] = $parts[0];
            } elseif ( EASY_SVG_ICON_COLLECTION === $parts[0] ) {
                $slugs[] = $parts[1];
            }
        }
    }
    if ( array() !== $slugs ) {
        easy_svg_icon_rows( array_unique( $slugs ) );
    }
    return $content;
}

function easy_svg_icon_label( $slug, $collection = EASY_SVG_ICON_COLLECTION ) {
    $slug  = (string) $slug;
    $label = '';
    $ready = easy_svg_icon_lookup_ready();
    $row   = EASY_SVG_ICON_COLLECTION === $collection && $ready ? easy_svg_cached_icon_row( $slug ) : null;
    if ( null !== $row && '' !== trim( (string) $row['label'] ) ) {
        $label = (string) $row['label'];
    } elseif ( ! $ready && EASY_SVG_ICON_COLLECTION === $collection && function_exists( 'get_page_by_path' ) ) {
        $post = get_page_by_path( $slug, OBJECT, EASY_SVG_ICON_POST_TYPE );
        if ( easy_svg_is_published_icon( $post ) && '' !== trim( (string) ( $post->post_title ?? '' ) ) ) {
            $label = (string) $post->post_title;
        }
    }
    if ( '' === $label ) {
        $words = trim( str_replace( array( '-', '_' ), ' ', $slug ) );
        $label = '' === $words ? $slug : ucfirst( $words );
    }
    // Another collection's titles live with its add-on; a blank answer keeps ours, so role="img" always has a name.
    $named = apply_filters( 'easy_svg_icon_label', $label, $slug, (string) $collection );
    $named = is_string( $named ) ? trim( $named ) : '';
    return '' === $named ? $label : $named;
}

/** @param array{class?:string, size?:string, label?:string, decorative?:bool} $args */
function easy_svg_icon( $name, $args = array() ) {
    // An array or object is no name; casting one would warn on every page that calls the tag that way.
    if ( ! is_string( $name ) && ! is_int( $name ) ) {
        return '';
    }
    $name       = (string) $name;
    $collection = EASY_SVG_ICON_COLLECTION;
    $slug       = $name;
    if ( false !== strpos( $name, '/' ) ) {
        list( $collection, $slug ) = explode( '/', $name, 2 );
    }

    $markup = easy_svg_icon_markup( $slug, $collection );
    if ( '' === $markup ) {
        return '';
    }
    $markup = easy_svg_scope_icon_ids( $markup );

    // Decorative unless labelled; an explicit 'decorative' overrides that either way.
    $decorative = isset( $args['decorative'] ) ? (bool) $args['decorative'] : empty( $args['label'] );

    $size    = easy_svg_icon_size( $markup, $args );
    $classes = trim( ( null !== $size ? 'easy-svg-icon ' : '' ) . (string) ( $args['class'] ?? '' ) );
    $attrs   = '';
    // A browser keeps only the first of two equal attributes, so a stored one is extended.
    if ( '' !== $classes ) {
        $merged = easy_svg_prepend_root_attr( $markup, 'class', esc_attr( $classes ) . ' ' );
        if ( null !== $merged ) {
            $markup = $merged;
        } else {
            $attrs .= ' class="' . esc_attr( $classes ) . '"';
        }
    }
    if ( null !== $size && '' !== $size ) {
        $style  = '--easy-svg-icon-size:' . esc_attr( $size );
        $merged = easy_svg_prepend_root_attr( $markup, 'style', $style . ';' );
        if ( null !== $merged ) {
            $markup = $merged;
        } else {
            $attrs .= ' style="' . $style . '"';
        }
    }
    // Ours replace the stored ones: a second equal attribute is invalid HTML, and only the first one counts.
    $markup = easy_svg_drop_root_attrs( $markup, array( 'role', 'aria-hidden', 'aria-label', 'aria-labelledby', 'focusable' ) );
    // The text colour, as in the Icon block; a presentation attribute, so any fill the drawing sets itself wins.
    if ( ! easy_svg_root_has_fill( $markup ) ) {
        $attrs .= ' fill="currentColor"';
    }
    if ( $decorative ) {
        // Hidden from a screen reader, and never a tab stop in IE / old Edge.
        $attrs .= ' aria-hidden="true" focusable="false"';
    } else {
        // role="img" is never emitted without a name, or a screen reader only says "graphic" (WCAG 1.1.1).
        $attrs .= ' role="img" focusable="false"';
        $label  = (string) ( $args['label'] ?? '' );
        if ( '' === trim( $label ) ) {
            $label = easy_svg_icon_label( $slug, $collection );
        }
        $attrs .= ' aria-label="' . esc_attr( $label ) . '"';
    }

    // Spliced, never preg_replace'd: esc_attr() leaves `$` and `\` alone, so "Price $20" would read as a backreference.
    $at = easy_svg_root_svg_offset( $markup );
    if ( null !== $at ) {
        $markup = substr( $markup, 0, $at + 4 ) . $attrs . substr( $markup, $at + 4 );
    }

    return easy_svg_icon_styles_for( $markup );
}

// The size and stroke rules reach a page only once an icon is drawn on it; after wp_head WordPress prints them in the footer.
function easy_svg_icon_styles_for( $html ) {
    if ( ! is_string( $html ) || '' === $html ) {
        return $html;
    }
    if ( false !== strpos( $html, 'easy-svg-icon' ) && function_exists( 'easy_svg_enqueue_size_css' ) ) {
        easy_svg_enqueue_size_css();
    }
    if ( false !== strpos( $html, 'esvg-stroke' ) && function_exists( 'easy_svg_enqueue_stroke_css' ) ) {
        easy_svg_enqueue_stroke_css();
    }
    return $html;
}

// Read whole, as a browser does: a name inside another value is text; null for a tag that does not read cleanly.
/** @return array<int, array{name: string, from: int, to: int, value_at: int, value: string}>|null */
function easy_svg_root_attributes( $markup ) {
    $markup = (string) $markup;
    $at     = easy_svg_root_svg_offset( $markup );
    if ( null === $at ) {
        return null;
    }
    $attrs = array();
    $pos   = $at + 4;
    while ( true ) {
        if ( 1 === preg_match( '/\G\s*\/?>/', $markup, $m, 0, $pos ) ) {
            return $attrs;
        }
        if ( 1 !== preg_match( '/\G(\s+)([^\s="\'\/>]+)\s*=\s*("[^"]*"|\'[^\']*\')/', $markup, $m, PREG_OFFSET_CAPTURE, $pos ) ) {
            return null;
        }
        $attrs[] = array(
            'name'     => strtolower( $m[2][0] ),
            'from'     => $pos,
            'to'       => $pos + strlen( $m[0][0] ),
            'value_at' => $m[3][1] + 1,
            'value'    => substr( $m[3][0], 1, -1 ),
        );
        $pos += strlen( $m[0][0] );
    }
}

/** @return array{name: string, from: int, to: int, value_at: int, value: string}|null */
function easy_svg_root_attribute( $markup, $name ) {
    foreach ( easy_svg_root_attributes( $markup ) ?? array() as $attr ) {
        if ( strtolower( $name ) === $attr['name'] ) {
            return $attr;
        }
    }
    return null;
}

/** @return string|null */
function easy_svg_prepend_root_attr( $markup, $name, $escaped ) {
    $attr = easy_svg_root_attribute( $markup, $name );
    if ( null === $attr ) {
        return null;
    }
    return substr( $markup, 0, $attr['value_at'] ) . $escaped . substr( $markup, $attr['value_at'] );
}

/** @param string[] $names */
function easy_svg_drop_root_attrs( $markup, array $names ) {
    $names = array_map( 'strtolower', $names );
    // Last first, so the offsets still standing stay true.
    foreach ( array_reverse( easy_svg_root_attributes( $markup ) ?? array() ) as $attr ) {
        if ( in_array( $attr['name'], $names, true ) ) {
            $markup = substr( $markup, 0, $attr['from'] ) . substr( $markup, $attr['to'] );
        }
    }
    return $markup;
}

// A fill on the root, as an attribute or in its style, is the drawing's own colour; a stroke icon's shapes stay unfilled.
function easy_svg_root_has_fill( $markup ) {
    $attrs = easy_svg_root_attributes( $markup );
    if ( null === $attrs ) {
        return true;
    }
    foreach ( $attrs as $attr ) {
        if ( 'fill' === $attr['name']
            || ( 'style' === $attr['name'] && 1 === preg_match( '/(?<![\w-])fill\s*:/i', $attr['value'] ) )
            || ( 'class' === $attr['name'] && 1 === preg_match( '/(?<![\w-])esvg-stroke(?![\w-])/i', $attr['value'] ) ) ) {
            return true;
        }
    }
    return false;
}

// A size that does nothing said nothing; with WP_DEBUG on, core's notice now says why.
function easy_svg_icon_size_ignored( $message ) {
    if ( function_exists( '_doing_it_wrong' ) ) {
        _doing_it_wrong( 'easy_svg_icon', esc_html( $message ), '5.0.1' );
    }
}

// Null for no size, '' for the stylesheet default, or a length for this one icon.
/** @return string|null */
function easy_svg_icon_size( $markup, $args ) {
    $asked = array_key_exists( 'size', (array) $args ) ? trim( (string) $args['size'] ) : null;
    if ( '' === $asked ) {
        return null;
    }
    // A bare number is pixels, as in width="24".
    if ( null !== $asked && 1 === preg_match( '/^\d+(\.\d+)?$/', $asked ) ) {
        $asked .= 'px';
    }
    // An unknown unit falls back to the default rather than to no size, where a viewBox-only icon fills its box.
    if ( null !== $asked && 1 !== preg_match( '/^\d+(\.\d+)?(px|em|rem|%)$/', $asked ) ) {
        easy_svg_icon_size_ignored(
            /* translators: %s: the size that was asked for, e.g. 24pt. */
            sprintf( __( 'Size "%s" is not a length in px, em, rem or %%, so the default size is used.', 'easy-svg' ), $asked )
        );
        $asked = null;
    }
    $attrs = easy_svg_root_attributes( $markup );
    if ( null === $attrs ) {
        return null;
    }
    foreach ( $attrs as $attr ) {
        if ( 'width' === $attr['name'] || 'height' === $attr['name'] ) {
            if ( null !== $asked ) {
                easy_svg_icon_size_ignored(
                    /* translators: %s: the size that was asked for, e.g. 24px. */
                    sprintf( __( 'Size "%s" is ignored: this icon sets its own width and height. Remove them from the SVG to size it here.', 'easy-svg' ), $asked )
                );
            }
            return null;
        }
    }
    return null === $asked ? '' : $asked;
}

// Zero specificity, so any rule of a theme wins.
function easy_svg_icon_size_css() {
    return ':where(svg.easy-svg-icon){width:var(--easy-svg-icon-size,1em);height:var(--easy-svg-icon-size,1em)}';
}

// Only ever calls easy_svg_icon(), so there is no second way for bytes onto a page.
/** @param array<string,mixed>|string $atts WordPress passes a string when there are none. */
function easy_svg_icon_shortcode( $atts ) {
    $atts = is_array( $atts ) ? $atts : array();
    $name = trim( (string) ( $atts['name'] ?? '' ) );
    // An add-on's page builder element writes icon=; its pages keep their icons with the add-on switched off.
    $name = '' !== $name ? $name : trim( (string) ( $atts['icon'] ?? '' ) );
    if ( '' === $name ) {
        return '';
    }
    $args = array();
    foreach ( array( 'class', 'label' ) as $key ) {
        if ( isset( $atts[ $key ] ) && '' !== (string) $atts[ $key ] ) {
            $args[ $key ] = (string) $atts[ $key ];
        }
    }
    // Kept even when empty: size="" asks for no size at all.
    if ( isset( $atts['size'] ) ) {
        $args['size'] = (string) $atts['size'];
    }
    return easy_svg_icon( $name, $args );
}

// `<svg` must be followed by a non-word character, so `<svgfoo` is not a root.
/** @return int|null */
function easy_svg_root_svg_offset( $markup ) {
    $markup = (string) $markup;
    $at     = 0;
    while ( true ) {
        $at = stripos( $markup, '<svg', $at );
        if ( false === $at ) {
            return null;
        }
        $next = substr( $markup, $at + 4, 1 );
        if ( '' === $next || 1 !== preg_match( '/\w/', $next ) ) {
            return $at;
        }
        $at += 4;
    }
}

// Inline, all icons on a page share one id space: a second copy's url(#a) finds the first copy's filter, which draws nothing while hidden.
function easy_svg_scope_icon_ids( $markup, $scope = null ) {
    $markup = (string) $markup;
    $start  = easy_svg_root_svg_offset( $markup );
    $end    = strripos( $markup, '</svg>' );
    if ( null === $start || false === $end || $end < $start || false === stripos( $markup, 'id', $start ) ) {
        return $markup;
    }
    $end   += 6;
    $region = substr( $markup, $start, $end - $start );

    // Only plain names: anything an attribute could not hold unescaped is left as it came.
    preg_match_all( '/<[^>]*?\sid\s*=\s*(["\'])([A-Za-z_][\w.:-]*)\1/', $region, $found );
    $ids = array_values( array_unique( $found[2] ) );
    if ( array() === $ids ) {
        return $markup;
    }
    $scope = null === $scope ? easy_svg_icon_id_scope() : (string) $scope;
    $map   = array();
    foreach ( $ids as $id ) {
        $map[ $id ] = $scope . $id;
    }
    $names = implode( '|', array_map( static fn( $id ) => preg_quote( $id, '/' ), $ids ) );

    $region = (string) preg_replace_callback(
        '/<[^>]+>/',
        static function ( $tag ) use ( $map, $names ) {
            return (string) preg_replace_callback(
                '/(\s)([\w:.-]+)(\s*=\s*)("[^"]*"|\'[^\']*\')/',
                static function ( $attr ) use ( $map, $names ) {
                    $name  = strtolower( $attr[2] );
                    $value = substr( $attr[4], 1, -1 );
                    if ( 'id' === $name ) {
                        $value = $map[ $value ] ?? $value;
                    } elseif ( 'href' === $name || 'xlink:href' === $name ) {
                        $value = (string) preg_replace_callback( '/^(\s*#)(' . $names . ')(\s*)$/', static fn( $m ) => $m[1] . $map[ $m[2] ] . $m[3], $value );
                    } elseif ( 'aria-labelledby' === $name || 'aria-describedby' === $name ) {
                        $value = implode( ' ', array_map( static fn( $t ) => $map[ $t ] ?? $t, preg_split( '/\s+/', trim( $value ) ) ?: array() ) );
                    }
                    // url(#a), url('#a') and url(&quot;#a&quot;) in any attribute, style included.
                    $value = (string) preg_replace_callback(
                        '/(url\(\s*(?:["\']|&quot;|&#0*39;)?\s*#)(' . $names . ')(?=\s*(?:["\']|&quot;|&#0*39;)?\s*\))/i',
                        static fn( $m ) => $m[1] . $map[ $m[2] ],
                        $value
                    );
                    return $attr[1] . $attr[2] . $attr[3] . $attr[4][0] . $value . $attr[4][0];
                },
                $tag[0]
            );
        },
        $region
    );

    return substr( $markup, 0, $start ) . $region . substr( $markup, $end );
}

// Random per request, counted per icon: a fragment cached on another request carries another token.
function easy_svg_icon_id_scope() {
    static $token = null, $count = 0;
    if ( null === $token ) {
        $token = bin2hex( random_bytes( 3 ) );
    }
    $count++;
    return 'esvg' . $token . '-' . $count . '-';
}

// Inlined icons are not isolated like an <img>: `style` styles the page and animation can rewrite an href after sanitising.
const EASY_SVG_ICON_UNSAFE_ELEMENTS = array(
    'script',
    'style',
    'foreignobject',
    'iframe',
    'embed',
    'object',
    'handler',
    'listener',
    'set',
    'animate',
    'animatecolor',
    'animatemotion',
    'animatetransform',
    'discard',
    'form',
    'meta',
    'base',
    'link',
    // Media elements: inside <desc> they are real HTML and load what they name.
    'audio',
    'video',
    'source',
    'picture',
    'track',
    // HTML breaks out of inline SVG while parsing, see the HTML spec's foreign content rules.
    'b', 'big', 'blockquote', 'body', 'br', 'center', 'code', 'dd', 'div', 'dl', 'dt', 'em', 'font',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'hr', 'i', 'img', 'li', 'listing', 'menu', 'nobr',
    'ol', 'p', 'pre', 'ruby', 's', 'small', 'span', 'strike', 'strong', 'sub', 'sup', 'table', 'tt',
    'u', 'ul', 'var',
);

// Inside <desc> or <title> the HTML parser builds real HTML elements, and these attributes fetch a URL on their own.
const EASY_SVG_ICON_FETCH_ATTRIBUTES = array( 'action', 'formaction', 'src', 'srcset', 'imagesrcset', 'poster', 'data', 'background', 'ping', 'lowsrc', 'dynsrc', 'codebase', 'longdesc' );

// Paint only, never layout: an inline icon with `position: fixed` covers the page.
const EASY_SVG_ICON_PAINT_PROPERTIES = array(
    'fill',
    'fill-opacity',
    'fill-rule',
    'stroke',
    'stroke-width',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-miterlimit',
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-opacity',
    'opacity',
    'color',
    'stop-color',
    'stop-opacity',
    'clip-rule',
    'mix-blend-mode',
    'isolation',
    'vector-effect',
    'paint-order',
    'shape-rendering',
    'display',
    'visibility',
    'font-family',
    'font-size',
    'font-weight',
    'font-style',
    'letter-spacing',
    'text-anchor',
    'dominant-baseline',
);

// A url() that is not a fragment fetches from another host the moment the icon renders.
function easy_svg_points_away( $value ) {
    return (bool) preg_match_all( '/url\s*\(\s*([\'"]?)\s*([^\'")\s]*)/i', (string) $value, $urls )
        && array() !== array_filter( $urls[2], static fn( $u ) => 0 !== strpos( $u, '#' ) );
}

function easy_svg_icon_paint_style( $style ) {
    $kept = array();
    foreach ( explode( ';', (string) $style ) as $declaration ) {
        $at = strpos( $declaration, ':' );
        if ( false === $at ) {
            continue;
        }
        $property = strtolower( trim( substr( $declaration, 0, $at ) ) );
        $value    = trim( substr( $declaration, $at + 1 ) );
        if ( '' === $value || ! in_array( $property, EASY_SVG_ICON_PAINT_PROPERTIES, true ) ) {
            continue;
        }
        if ( preg_match( '/[\\\\<>{}@]|expression\s*\(|javascript:/i', $value ) ) {
            continue;
        }
        if ( easy_svg_points_away( $value ) ) {
            continue;
        }
        $kept[] = $property . ':' . $value;
    }
    return implode( ';', $kept );
}

// Core's Icon block drops `style` and reads stroke from attributes only, so paint moves onto attributes.
/** @param DOMElement $element */
function easy_svg_icon_paint_attributes( $element, $style ) {
    $rest = array();
    foreach ( explode( ';', (string) $style ) as $declaration ) {
        $at = strpos( $declaration, ':' );
        if ( false === $at ) {
            continue;
        }
        $property = substr( $declaration, 0, $at );
        $value    = substr( $declaration, $at + 1 );
        if ( in_array( $property, array( 'mix-blend-mode', 'isolation' ), true ) ) {
            $rest[] = $declaration;
            continue;
        }
        $element->setAttribute( $property, $value );
    }
    return implode( ';', $rest );
}

/** @param DOMElement $element */
function easy_svg_element_has_href( $element ) {
    foreach ( $element->attributes as $attribute ) {
        if ( 'href' === strtolower( $attribute->localName ) && '' !== trim( (string) $attribute->nodeValue ) ) {
            return true;
        }
    }
    return false;
}

// Same attributes and children, so the shapes are drawn as before; only what a link alone means is left behind.
/** @param DOMElement $link */
function easy_svg_link_as_group( $link ) {
    $doc    = $link->ownerDocument;
    $prefix = '' !== (string) $link->prefix ? $link->prefix . ':' : '';
    $group  = null === $link->namespaceURI ? $doc->createElement( 'g' ) : $doc->createElementNS( $link->namespaceURI, $prefix . 'g' );
    foreach ( iterator_to_array( $link->attributes ) as $attribute ) {
        if ( ! in_array( strtolower( $attribute->localName ), array( 'target', 'rel', 'download', 'hreflang', 'referrerpolicy', 'type' ), true ) ) {
            $group->setAttributeNS( $attribute->namespaceURI, $attribute->nodeName, $attribute->nodeValue );
        }
    }
    while ( $link->firstChild ) {
        $group->appendChild( $link->firstChild );
    }
    $link->parentNode->replaceChild( $group, $link );
}

// A fixed layer on the sanitiser's output, so it never depends on a site's allow-list.
function easy_svg_harden_icon_markup( $markup ) {
    // Parsed here, not through easy_svg_load_svg(): this file must work when loaded on its own.
    $doc      = new DOMDocument();
    $internal = libxml_use_internal_errors( true );
    $loaded   = $doc->loadXML( (string) $markup, LIBXML_NONET );
    libxml_clear_errors();
    libxml_use_internal_errors( $internal );

    if ( ! $loaded || null === $doc->documentElement ) {
        return '';
    }

    $xpath = new DOMXPath( $doc );

    // Inline, the HTML parser ends a comment, a processing instruction or CDATA where XML does not, and what follows is live.
    foreach ( iterator_to_array( $xpath->query( '//comment()|//processing-instruction()' ) ) as $node ) {
        $node->parentNode->removeChild( $node );
    }
    foreach ( iterator_to_array( $xpath->query( '//text()' ) ) as $node ) {
        if ( $node instanceof DOMCdataSection ) {
            $node->parentNode->replaceChild( $doc->createTextNode( $node->data ), $node );
        }
    }

    // Snapshot first: removing nodes while walking a live list skips some.
    $doomed = array();
    foreach ( $xpath->query( '//*' ) as $element ) {
        // `//*` yields elements; DOMXPath promises only DOMNode.
        if ( ! $element instanceof DOMElement ) {
            continue;
        }
        if ( in_array( strtolower( $element->localName ), EASY_SVG_ICON_UNSAFE_ELEMENTS, true ) ) {
            $doomed[] = $element;
        }
    }
    foreach ( $doomed as $element ) {
        if ( $element->parentNode ) {
            $element->parentNode->removeChild( $element );
        }
    }

    // Inside desc and title (any case: the tokenizer lowercases) the HTML parser builds HTML and ignores `/>`, so a self-closed child can swallow the page.
    foreach ( iterator_to_array( $xpath->query( '//*' ) ) as $element ) {
        if ( $element instanceof DOMElement && in_array( strtolower( $element->localName ), array( 'desc', 'title' ), true ) && $xpath->query( '*', $element )->length > 0 ) {
            // Not a textContent write: PHP 8.0 frees the old children, and the snapshot above still holds them.
            $text = $element->textContent;
            while ( $element->firstChild ) {
                $element->removeChild( $element->firstChild );
            }
            $element->appendChild( $element->ownerDocument->createTextNode( $text ) );
        }
    }

    foreach ( $xpath->query( '//*' ) as $element ) {
        if ( ! $element instanceof DOMElement ) {
            continue;
        }
        $drop = array();
        foreach ( $element->attributes as $attribute ) {
            $name = strtolower( $attribute->localName );

            // The hardener must not rely on the sanitiser for `on*`: a site can widen its allow-list.
            if ( 0 === strpos( $name, 'on' ) ) {
                $drop[] = $attribute;
                continue;
            }
            if ( in_array( $name, EASY_SVG_ICON_FETCH_ATTRIBUTES, true ) ) {
                $drop[] = $attribute;
                continue;
            }
            // A drawing needs no data-*, and htmx or Bootstrap on the page would act on them.
            if ( 0 === strpos( $name, 'data-' ) ) {
                $drop[] = $attribute;
                continue;
            }
            if ( 'href' === $name && 0 !== strpos( ltrim( (string) $attribute->nodeValue ), '#' ) ) {
                $drop[] = $attribute;
                continue;
            }
            // fill, mask, filter and marker take url() too, also spelled with a CSS escape such as \75 rl(.
            if ( 'style' !== $name && ( easy_svg_points_away( (string) $attribute->nodeValue ) || ( str_contains( (string) $attribute->nodeValue, '\\' ) && str_contains( (string) $attribute->nodeValue, '(' ) ) ) ) {
                $drop[] = $attribute;
                continue;
            }
            if ( 'style' === $name ) {
                $kept = easy_svg_icon_paint_attributes( $element, easy_svg_icon_paint_style( (string) $attribute->nodeValue ) );
                if ( '' === $kept ) {
                    $drop[] = $attribute;
                } else {
                    $attribute->nodeValue = $kept;
                }
            }
        }
        foreach ( $drop as $attribute ) {
            $element->removeAttributeNode( $attribute );
        }
    }

    // With no target left, a link is only a group (core's Icon block drops it with its shapes) and an image or use draws nothing.
    foreach ( iterator_to_array( $xpath->query( '//*' ) ) as $element ) {
        if ( ! $element instanceof DOMElement || ! $element->parentNode || easy_svg_element_has_href( $element ) ) {
            continue;
        }
        $name = strtolower( $element->localName );
        if ( in_array( $name, array( 'image', 'use' ), true ) || ( 'a' === $name && '' === trim( $element->textContent ) && 0 === $xpath->query( '*', $element )->length ) ) {
            $element->parentNode->removeChild( $element );
        } elseif ( 'a' === $name ) {
            easy_svg_link_as_group( $element );
        }
    }

    // Refuse a root with no element left rather than store a blank icon.
    $has_drawing = false;
    foreach ( $doc->documentElement->childNodes as $node ) {
        if ( XML_ELEMENT_NODE === $node->nodeType ) {
            $has_drawing = true;
            break;
        }
    }
    if ( ! $has_drawing ) {
        return '';
    }

    return (string) $doc->saveXML( $doc->documentElement );
}

// Bounds are injected so a CLI import can ask for none.
/**
 * @param callable      $sanitize
 * @param callable|null $slugger
 * @param callable|null $too_complex
 * @return array{state: string, slug?: string, content?: string}
 */
function easy_svg_accept_icon( $label, $markup, $sanitize, $slugger = null, $max_bytes = 0, $too_complex = null ) {
    $slug = easy_svg_icon_slug( $label, $slugger );
    if ( '' === $slug ) {
        return array( 'state' => 'bad_name' );
    }

    if ( '' === trim( (string) $markup ) ) {
        return array( 'state' => 'empty' );
    }

    // Both bounds must run before the sanitiser parses; size alone misses a small file with a thousand <use>.
    $max_bytes = (int) $max_bytes;
    if ( $max_bytes > 0 && strlen( (string) $markup ) > $max_bytes ) {
        return array( 'state' => 'too_large' );
    }

    if ( null !== $too_complex && call_user_func( $too_complex, (string) $markup ) ) {
        return array( 'state' => 'too_complex' );
    }

    // The library throws for well-formed XML without one <svg> root; uncaught, that is a white screen.
    try {
        $clean = call_user_func( $sanitize, (string) $markup );
    } catch ( \Throwable $e ) {
        return array( 'state' => 'not_svg' );
    }

    // Never store what a refusing sanitiser returned; is_string() matters once strict_types is declared.
    if ( ! is_string( $clean ) || '' === trim( $clean ) ) {
        return array( 'state' => 'not_svg' );
    }

    // Checked on the cleaned markup: pasted HTML sanitises to a string with no drawing.
    if ( false === stripos( $clean, '<svg' ) ) {
        return array( 'state' => 'not_svg' );
    }

    $clean = easy_svg_harden_icon_markup( $clean );
    if ( '' === trim( $clean ) || false === stripos( $clean, '<svg' ) ) {
        return array( 'state' => 'not_svg' );
    }

    return array(
        'state'   => 'ok',
        'slug'    => $slug,
        // Only the cleaned, hardened markup is ever stored.
        'content' => $clean,
    );
}

// Paged until a page comes back short: nothing bounds how many icons a site keeps.
/** @param callable(int, int): array<int, array<string,mixed>> $fetch_page */
function easy_svg_collect_icons( $fetch_page, $per_page ) {
    $per_page = max( 1, (int) $per_page );
    $icons    = array();
    $seen     = array();
    $page     = 1;

    do {
        $batch = array_values( (array) call_user_func( $fetch_page, $page, $per_page ) );

        // A query that ignores `paged` answers every page with the first; without this the loop never ends.
        if ( array() !== $batch && isset( $batch[0]['id'], $seen[ $batch[0]['id'] ] ) ) {
            break;
        }

        foreach ( $batch as $icon ) {
            if ( isset( $icon['id'] ) ) {
                $seen[ $icon['id'] ] = true;
            }
            $icons[] = $icon;
        }

        $page++;
    } while ( count( $batch ) === $per_page );

    return $icons;
}

// The rewrite's own source is in the key: an update that changes it must not serve the old result.
function easy_svg_core_icon_key( $content ): string {
    static $salt = null;
    if ( null === $salt ) {
        $salt = (string) md5_file( __DIR__ . '/core-icon.php' );
    }
    return md5( $salt . "\n" . $content );
}

// For an icon deleted for good: the pass that prunes the memo may be a day away, and the entry holds its drawing.
function easy_svg_forget_core_icon( $content ) {
    if ( ! function_exists( 'get_transient' ) ) {
        return;
    }
    // Emptying a trash of hundreds would otherwise rewrite the whole memo once per icon; it is written once, at the end.
    $first = array() === easy_svg_forgotten_core_icons( easy_svg_core_icon_key( (string) $content ) );
    if ( ! function_exists( 'add_action' ) ) {
        easy_svg_forget_core_icons_now();
    } elseif ( $first ) {
        add_action( 'shutdown', 'easy_svg_forget_core_icons_now' );
    }
}

// The keys noted so far; noting one answers with the list as it was before.
/** @return array<string, true> */
function easy_svg_forgotten_core_icons( $add = null, $clear = false ) {
    static $keys = array();
    $before = $keys;
    if ( null !== $add ) {
        $keys[ (string) $add ] = true;
    }
    if ( $clear ) {
        $keys = array();
    }
    return $before;
}

function easy_svg_forget_core_icons_now() {
    $keys   = easy_svg_forgotten_core_icons( null, true );
    $stored = get_transient( 'easy_svg_core_icons' );
    if ( array() === $keys || ! is_array( $stored ) || array() === array_intersect_key( $stored, $keys ) ) {
        return;
    }
    set_transient( 'easy_svg_core_icons', array_diff_key( $stored, $keys ), DAY_IN_SECONDS );
}

// The DOM rewrite runs on every request, but its result only changes when the icon does.
/**
 * @param array<string, array<string,mixed>> $memo
 * @return array{content:string, classes:array}
 */
function easy_svg_core_icon_cached( $content, array &$memo ) {
    $key = easy_svg_core_icon_key( $content );
    if ( isset( $memo[ $key ]['content'], $memo[ $key ]['classes'] ) && is_array( $memo[ $key ]['classes'] ) ) {
        $memo[ $key ]['used'] = true;
        return array_diff_key( $memo[ $key ], array( 'used' => true ) );
    }
    $result       = easy_svg_core_icon( $content );
    $memo[ $key ] = $result + array( 'used' => true );
    return $result;
}

// Only entries this pass used are kept, so a deleted icon leaves nothing behind.
/**
 * @param array|null $memo
 * @param array|null $before
 */
function easy_svg_core_icon_memo( $memo = null, $before = null ) {
    if ( ! function_exists( 'get_transient' ) ) {
        return array();
    }
    if ( null === $memo ) {
        $stored = get_transient( 'easy_svg_core_icons' );
        $out    = array();
        foreach ( is_array( $stored ) ? $stored : array() as $key => $row ) {
            if ( is_array( $row ) ) {
                unset( $row['used'] );
                $out[ $key ] = $row;
            }
        }
        return $out;
    }
    $kept = array();
    foreach ( $memo as $key => $row ) {
        if ( ! empty( $row['used'] ) ) {
            unset( $row['used'] );
            $kept[ $key ] = $row;
        }
    }
    if ( array_keys( $kept ) !== array_keys( (array) $before ) ) {
        set_transient( 'easy_svg_core_icons', $kept, DAY_IN_SECONDS );
    }
    return $kept;
}

/**
 * @param array<int, array{slug?:string, label?:string, content?:string}> $icons
 * @param callable(string, array): bool $register_collection
 * @param callable(string, array): bool $register_icon
 */
function easy_svg_register_icons( $icons, $register_collection, $register_icon ) {
    // The collection must be registered first, but only when an icon is ready: an empty one looks broken in the picker.
    $ready_icons      = array();
    $needs_stylesheet = false;
    $memo             = easy_svg_core_icon_memo();
    $memo_before      = $memo;

    foreach ( (array) $icons as $icon ) {
        $name = easy_svg_icon_name( isset( $icon['slug'] ) ? $icon['slug'] : '' );

        if ( '' === $name ) {
            continue;
        }

        // Without the rewrite an outline icon reaches the Icon block with no stroke and no fill, and draws nothing.
        $for_core = easy_svg_core_icon_cached( isset( $icon['content'] ) ? (string) $icon['content'] : '', $memo );
        $content  = '' !== $for_core['content'] ? $for_core['content'] : (string) ( $icon['content'] ?? '' );
        if ( array() !== $for_core['classes'] ) {
            $needs_stylesheet = true;
        }

        $ready_icons[] = array(
            'name' => $name,
            'args' => easy_svg_icon_args(
                isset( $icon['label'] ) ? $icon['label'] : '',
                $content
            ),
        );
    }

    easy_svg_core_icon_memo( $memo, $memo_before );

    if ( array() === $ready_icons ) {
        return 0;
    }

    $ready = call_user_func(
        $register_collection,
        EASY_SVG_ICON_COLLECTION,
        array( 'label' => __( 'Easy SVG', 'easy-svg' ) )
    );

    if ( ! $ready ) {
        return 0;
    }

    $taken = 0;

    foreach ( $ready_icons as $icon ) {
        // Count only what core accepted, never what was sent.
        if ( call_user_func( $register_icon, $icon['name'], $icon['args'] ) ) {
            $taken++;
        }
    }

    if ( $needs_stylesheet && $taken > 0 ) {
        easy_svg_stroke_stylesheet_needed( true );
    }

    return $taken;
}

// Icons an add-on leaves behind when it is switched off, so a published page keeps them.
const EASY_SVG_KEPT_ICONS_OPTION = 'easy_svg_kept_icons';

/** @param array<string, array{label?:string, icons?:array<string, array{label?:string, content?:string}>}> $collections */
function easy_svg_keep_icons( $collections ) {
    // Read on every request: an empty autoloaded row is free, where a missing option costs a query each time.
    if ( array() === (array) $collections ) {
        update_option( EASY_SVG_KEPT_ICONS_OPTION, array(), true );
        return;
    }
    // No fixed answer: WordPress autoloads a small snapshot and leaves a large one out.
    update_option( EASY_SVG_KEPT_ICONS_OPTION, (array) $collections, null );
}

/**
 * @param mixed $kept
 * @param callable(string, array): bool $register_collection
 * @param callable(string, array): bool $register_icon
 * @param callable(string): bool $collection_registered
 */
function easy_svg_register_kept_icons( $kept, $register_collection, $register_icon, $collection_registered ) {
    if ( ! is_array( $kept ) ) {
        return 0;
    }

    $taken = 0;
    foreach ( $kept as $slug => $collection ) {
        $slug = (string) $slug;
        // The add-on, when it runs again, registers its own collection first and this copy stands down.
        if ( EASY_SVG_ICON_COLLECTION === $slug || 'core' === $slug || 1 !== preg_match( EASY_SVG_ICON_NAME_PATTERN, $slug ) || ! is_array( $collection ) || call_user_func( $collection_registered, $slug ) ) {
            continue;
        }

        $ready = array();
        foreach ( (array) ( $collection['icons'] ?? array() ) as $icon => $args ) {
            $icon    = (string) $icon;
            $content = is_array( $args ) ? (string) ( $args['content'] ?? '' ) : '';
            if ( '' === $content || 1 !== preg_match( EASY_SVG_ICON_NAME_PATTERN, $icon ) ) {
                continue;
            }
            $label                         = (string) ( $args['label'] ?? '' );
            $ready[ $slug . '/' . $icon ] = easy_svg_icon_args( '' !== $label ? $label : $icon, $content );
        }

        $label = (string) ( $collection['label'] ?? '' );
        if ( array() === $ready || ! call_user_func( $register_collection, $slug, array( 'label' => '' !== $label ? $label : $slug ) ) ) {
            continue;
        }

        foreach ( $ready as $name => $args ) {
            if ( call_user_func( $register_icon, $name, $args ) ) {
                $taken++;
            }
        }
    }

    return $taken;
}

// With the add-on gone its element's tag would print as text on the page; nobody else's tag is taken.
function easy_svg_icon_shortcode_fallback() {
    if ( defined( 'EASY_SVG_PRO_FILE' ) || shortcode_exists( 'easy_svg_icon' ) ) {
        return;
    }
    add_shortcode( 'easy_svg_icon', 'easy_svg_icon_shortcode' );
}

// Late on init, after every add-on had its turn to register the same collections itself.
function easy_svg_boot_kept_icons() {
    if ( ! easy_svg_icons_supported() || ! class_exists( 'WP_Icon_Collections_Registry' ) ) {
        return;
    }

    $collections = WP_Icon_Collections_Registry::get_instance();
    easy_svg_register_kept_icons(
        get_option( EASY_SVG_KEPT_ICONS_OPTION, array() ),
        'wp_register_icon_collection',
        'wp_register_icon',
        static fn( $slug ) => $collections->is_registered( (string) $slug )
    );
}

// A builder prints a class for the add-on's icon; with the add-on off only this rule still draws it.
const EASY_SVG_KEPT_CSS_BUDGET = 1048576;

// Plain classes only, one to three: anything else could end the rule and style the page.
const EASY_SVG_KEPT_SELECTOR_PATTERN = '/\A(?:\.[A-Za-z_][A-Za-z0-9_-]*){1,3}\z/';

// A data URI is read as XML, where names are case-sensitive; WordPress stores them lowercased.
function easy_svg_xml_case( $markup ) {
    static $names = array(
        'clippath', 'clippathunits', 'fegaussianblur', 'gradienttransform', 'gradientunits', 'lineargradient',
        'markerheight', 'markerunits', 'markerwidth', 'maskcontentunits', 'maskunits', 'patterncontentunits',
        'patterntransform', 'patternunits', 'preserveaspectratio', 'radialgradient', 'refx', 'refy',
        'spreadmethod', 'stddeviation', 'textpath', 'viewbox',
    );
    static $proper = array(
        'clipPath', 'clipPathUnits', 'feGaussianBlur', 'gradientTransform', 'gradientUnits', 'linearGradient',
        'markerHeight', 'markerUnits', 'markerWidth', 'maskContentUnits', 'maskUnits', 'patternContentUnits',
        'patternTransform', 'patternUnits', 'preserveAspectRatio', 'radialGradient', 'refX', 'refY',
        'spreadMethod', 'stdDeviation', 'textPath', 'viewBox',
    );
    static $find = null;
    $find = $find ?? '/(?<=[<\/\s])(' . implode( '|', $names ) . ')(?=[\s=\/>])/';
    $map  = array_combine( $names, $proper );
    // Tag by tag and outside quotes, so an attribute's value is never rewritten.
    return (string) preg_replace_callback(
        '/<[^>]+>/',
        static function ( $tag ) use ( $find, $map ) {
            $parts = preg_split( '/("[^"]*"|\'[^\']*\')/', $tag[0], -1, PREG_SPLIT_DELIM_CAPTURE );
            foreach ( $parts as $i => $part ) {
                if ( 0 === $i % 2 ) {
                    $parts[ $i ] = (string) preg_replace_callback( $find, static fn( $name ) => $map[ $name[1] ], $part );
                }
            }
            return implode( '', $parts );
        },
        (string) $markup
    );
}

function easy_svg_kept_icon_css( $kept ) {
    if ( ! is_array( $kept ) ) {
        return '';
    }
    $rules = '';
    $all   = array();
    foreach ( $kept as $slug => $collection ) {
        if ( EASY_SVG_ICON_COLLECTION === (string) $slug || 'core' === (string) $slug || ! is_array( $collection ) ) {
            continue;
        }
        foreach ( (array) ( $collection['icons'] ?? array() ) as $icon ) {
            $selectors = array_values( array_filter( (array) ( is_array( $icon ) ? ( $icon['selectors'] ?? array() ) : array() ), static fn( $s ) => is_string( $s ) && 1 === preg_match( EASY_SVG_KEPT_SELECTOR_PATTERN, $s ) ) );
            $markup    = array() === $selectors ? '' : easy_svg_xml_case( easy_svg_hardened_once( (string) ( $icon['content'] ?? '' ) ) );
            if ( '' === $markup ) {
                continue;
            }
            $rule = implode( ',', $selectors ) . '{--easy-svg-kept:url("data:image/svg+xml;base64,' . base64_encode( $markup ) . '")}';
            if ( strlen( $rules ) + strlen( $rule ) > EASY_SVG_KEPT_CSS_BUDGET ) {
                break 2;
            }
            $rules .= $rule;
            $all    = array_merge( $all, $selectors );
        }
    }
    if ( '' === $rules ) {
        return '';
    }
    // In ::before, so a builder's own background or circle behind the icon stays.
    return ':is(' . implode( ',', array_unique( $all ) ) . ')::before{content:"";display:inline-block;width:1em;height:1em;vertical-align:middle;'
        . 'background-color:currentColor;'
        . '-webkit-mask:var(--easy-svg-kept) center/contain no-repeat;mask:var(--easy-svg-kept) center/contain no-repeat}'
        . $rules;
}

const EASY_SVG_KEPT_CSS_FOLDER = 'easy-svg-kept-icons';

// Raise when easy_svg_kept_icon_css() writes different rules, so every site builds its file anew.
const EASY_SVG_KEPT_CSS_FORMAT = 1;

// Seconds a replaced file stays for pages a full-page cache built with it, counted from its replacement.
const EASY_SVG_KEPT_CSS_KEEP = 604800;

// Replaced kept files and when, so the grace runs from the replacement and not from the file's age.
const EASY_SVG_KEPT_CSS_RETIRED_OPTION = 'easy_svg_kept_css_retired';

// This plugin's build, so a fix to the hardener reaches every kept file at the next update.
function easy_svg_kept_css_build() {
    static $build = null;
    $build = $build ?? (string) filemtime( __FILE__ );
    return $build;
}

// Files this one replaced get a date; files past their grace go.
function easy_svg_retire_kept_files( $folder, $current ) {
    $retired = (array) get_option( EASY_SVG_KEPT_CSS_RETIRED_OPTION, array() );
    $now     = time();
    $left    = array();
    foreach ( (array) glob( $folder . '/kept-*.css' ) as $old ) {
        if ( ! is_string( $old ) || $old === $current ) {
            continue;
        }
        $name = basename( $old );
        $since = (int) ( $retired[ $name ] ?? $now );
        if ( $since < $now - EASY_SVG_KEPT_CSS_KEEP ) {
            wp_delete_file( $old );
            continue;
        }
        $left[ $name ] = $since;
    }
    update_option( EASY_SVG_KEPT_CSS_RETIRED_OPTION, $left, false );
}

// Up to a megabyte inline on every page was too heavy: a file, named by what it holds, is built once and cached by the browser.
/** @return array{url?: string, css?: string} */
function easy_svg_kept_icon_stylesheet( $kept ) {
    if ( ! is_array( $kept ) || array() === $kept ) {
        return array();
    }
    $uploads = function_exists( 'wp_upload_dir' ) ? wp_upload_dir( null, false ) : array();
    if ( ! empty( $uploads['error'] ) || empty( $uploads['basedir'] ) || empty( $uploads['baseurl'] ) ) {
        $css = easy_svg_kept_icon_css( $kept );
        return '' === $css ? array() : array( 'css' => $css );
    }
    $folder = rtrim( (string) $uploads['basedir'], '/\\' ) . '/' . EASY_SVG_KEPT_CSS_FOLDER;
    $name   = 'kept-' . substr( md5( serialize( $kept ) . '|' . EASY_SVG_KEPT_CSS_FORMAT . '|' . easy_svg_kept_css_build() ), 0, 16 ) . '.css';
    $file   = $folder . '/' . $name;
    $url    = rtrim( (string) $uploads['baseurl'], '/' ) . '/' . EASY_SVG_KEPT_CSS_FOLDER . '/' . $name;

    // An empty file is the answer "nothing to paint", so that is not worked out again on every page either.
    if ( is_file( $file ) ) {
        return 0 === (int) filesize( $file ) ? array() : array( 'url' => $url );
    }
    $css = easy_svg_kept_icon_css( $kept );
    if ( ! wp_mkdir_p( $folder ) ) {
        return '' === $css ? array() : array( 'css' => $css );
    }
    // Written aside and renamed, so no request serves half a file; silenced, as the inline fallback still draws.
    $part    = $file . '.' . uniqid( '', true ) . '.part';
    $written = @file_put_contents( $part, $css ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents,WordPress.PHP.NoSilencedErrors.Discouraged -- one file in this plugin's own uploads folder, on the front end where WP_Filesystem may ask for credentials.
    // A short write (a full disk) would be kept for good, and an empty file means "nothing to paint".
    if ( strlen( $css ) !== $written || ! @rename( $part, $file ) ) { // phpcs:ignore WordPress.WP.AlternativeFunctions.rename_rename,WordPress.PHP.NoSilencedErrors.Discouraged -- as above.
        if ( is_file( $part ) ) {
            wp_delete_file( $part );
        }
        return '' === $css ? array() : array( 'css' => $css );
    }
    easy_svg_retire_kept_files( $folder, $file );
    return '' === $css ? array() : array( 'url' => $url );
}

function easy_svg_print_kept_icon_css() {
    $sheet = easy_svg_kept_icon_stylesheet( get_option( EASY_SVG_KEPT_ICONS_OPTION, array() ) );
    if ( isset( $sheet['url'] ) ) {
        wp_enqueue_style( 'easy-svg-kept-icons', $sheet['url'], array(), (string) filemtime( __FILE__ ) );
        return;
    }
    if ( isset( $sheet['css'] ) ) {
        wp_register_style( 'easy-svg-kept-icons', false, array(), (string) filemtime( __FILE__ ) );
        wp_enqueue_style( 'easy-svg-kept-icons' );
        wp_add_inline_style( 'easy-svg-kept-icons', $sheet['css'] );
    }
}

// Only when the add-on is not loaded: its own template tags carry the same names.
function easy_svg_load_kept_fallbacks() {
    if ( defined( 'EASY_SVG_PRO_FILE' ) ) {
        return false;
    }
    require_once __DIR__ . '/kept-fallbacks.php';
    return true;
}

// Declares the classes easy_svg_core_icon() sets: core keeps only `class` on the root.
function easy_svg_stroke_css() {
    // Aimed at the shapes, not the root: an inherited fill loses to core's `.wp-block-icon svg` rule. No `!important`.
    $shapes = '.esvg-stroke path,.esvg-stroke polygon';

    $css    = $shapes . '{fill:none;stroke:currentColor;stroke-width:1}';
    // From the table easy_svg_core_icon() reads, so a width it emits always has a rule.
    foreach ( EASY_SVG_STROKE_WIDTHS as $width => $suffix ) {
        $class = '.esvg-stroke.esvg-sw-' . $suffix;
        $css  .= $class . ' path,' . $class . ' polygon{stroke-width:' . $width . '}';
    }

    return $css
        . '.esvg-stroke.esvg-cap-round path,.esvg-stroke.esvg-cap-round polygon{stroke-linecap:round}'
        . '.esvg-stroke.esvg-join-round path,.esvg-stroke.esvg-join-round polygon{stroke-linejoin:round}';
}

// A latch, not an option: registration runs on every request, so the answer is always current.
/** @param bool|null $set */
function easy_svg_stroke_stylesheet_needed( $set = null ) {
    static $needed = false;
    if ( null !== $set ) {
        $needed = (bool) $set;
    }
    return $needed;
}
