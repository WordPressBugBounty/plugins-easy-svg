<?php
// GET /wp/v2/icons reads and sanitises every registered icon file before it filters or pages, so this library answers from a prepared list.

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Core's row fields, with what one of our icons has for each beyond the four.
const EASY_SVG_ICON_LISTING_FIELDS = array(
    'name'       => null,
    'label'      => null,
    'content'    => null,
    'collection' => null,
    'keywords'   => array(),
);

const EASY_SVG_ICON_LISTING_ROUTE = '#^/wp/v2/icons(?:/easy-svg)?/?$#';

// Core's own sanitiser, so a row reads exactly as the controller would print it; a changed core lists every registered icon itself.
function easy_svg_icon_listing_sanitizer() {
    static $sanitize = false;
    if ( false !== $sanitize ) {
        return $sanitize;
    }
    $sanitize = null;
    $registry = easy_svg_core_icon_registry();
    if ( null === $registry || ! method_exists( $registry, 'sanitize_icon_content' ) ) {
        return $sanitize;
    }
    try {
        $method = new ReflectionMethod( $registry, 'sanitize_icon_content' );
        // PHP 8.0 refuses a private method without this; 8.1 allows it and 8.5 deprecates the call.
        if ( PHP_VERSION_ID < 80100 ) {
            $method->setAccessible( true );
        }
        if ( ! is_string( $method->invoke( $registry, '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>' ) ) ) {
            return $sanitize;
        }
    } catch ( \Throwable $e ) {
        return $sanitize;
    }
    $sanitize = static function ( $svg ) use ( $method, $registry ) {
        try {
            return (string) $method->invoke( $registry, (string) $svg );
        } catch ( \Throwable $e ) {
            return '';
        }
    };
    return $sanitize;
}

// The library version names the icons; core's version and the rewrite's source name how each drawing was made.
function easy_svg_icon_listing_key() {
    return (int) get_option( EASY_SVG_ICON_VERSION, 0 ) . '|' . easy_svg_icon_listing_build_key();
}

function easy_svg_icon_listing_build_key() {
    return ( isset( $GLOBALS['wp_version'] ) ? (string) $GLOBALS['wp_version'] : '' ) . '|' . md5_file( __DIR__ . '/core-icon.php' );
}

// Beside the drawings, under a name nobody can guess, since uploads may be served directly.
function easy_svg_icon_listing_path() {
    $dir = easy_svg_icon_file_dir();
    return '' === $dir ? '' : $dir . '/listing-' . substr( wp_hash( 'easy-svg-icon-listing|' . get_current_blog_id() ), 0, 16 ) . '.json';
}

/** @return array{key:string, rows:array<int, array{0:int,1:string,2:string,3:string,4:string}>}|null */
function easy_svg_read_icon_listing( $path, $key = '' ) {
    // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a file this plugin wrote.
    $kept = is_file( $path ) ? json_decode( (string) file_get_contents( $path ), true ) : null;
    // A list the folder refused to take sits in the transient, and a current one there beats an old file.
    if ( ! is_array( $kept ) || ( '' !== $key && ( $kept['key'] ?? null ) !== $key ) ) {
        $held = get_transient( 'easy_svg_icon_listing' );
        if ( is_array( $held ) && ( ! is_array( $kept ) || ( $held['key'] ?? null ) === $key ) ) {
            $kept = $held;
        }
    }
    return is_array( $kept ) && is_string( $kept['key'] ?? null ) && is_array( $kept['rows'] ?? null ) ? $kept : null;
}

// Every published icon that is switched on, newest first as core holds them: [ id, stamp, slug, label, content ].
/** @return array<int, array{0:int,1:string,2:string,3:string,4:string}> */
function easy_svg_icon_listing() {
    $path     = easy_svg_icon_listing_path();
    $sanitize = easy_svg_icon_listing_sanitizer();
    if ( '' === $path || null === $sanitize ) {
        return array();
    }
    $key    = easy_svg_icon_listing_key();
    $stored = easy_svg_read_icon_listing( $path, $key );
    if ( null !== $stored && $key === $stored['key'] ) {
        return $stored['rows'];
    }

    // Only icons saved since the last list are drawn and sanitised again.
    $reuse = array();
    if ( null !== $stored && substr( $stored['key'], strpos( $stored['key'], '|' ) + 1 ) === easy_svg_icon_listing_build_key() ) {
        foreach ( $stored['rows'] as $row ) {
            $reuse[ (int) $row[0] ] = $row;
        }
    }

    global $wpdb;
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- the ids of switched-off icons, once per library version.
    $off = array_flip( array_map( 'intval', (array) $wpdb->get_col( $wpdb->prepare( "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = %s", EASY_SVG_ICON_OFF_META ) ) ) );

    $index  = array();
    $before = 0;
    do {
        $page = easy_svg_icon_index_page( $before, EASY_SVG_ICON_INDEX_PAGE );
        foreach ( $page as $row ) {
            $before = (int) $row->ID;
            if ( ! isset( $off[ $before ] ) && '' !== easy_svg_icon_name( (string) $row->post_name ) ) {
                $index[ $before ] = $row;
            }
        }
    } while ( count( $page ) === EASY_SVG_ICON_INDEX_PAGE );

    easy_svg_icon_file_stamps( array_map( static fn( $row ) => (string) $row->post_modified_gmt, $index ) );
    $dir  = easy_svg_icon_file_dir();
    $rows = array();
    foreach ( $index as $id => $row ) {
        $stamp = (string) $row->post_modified_gmt;
        // A save deletes the icon's file, and two saves in one second keep one stamp.
        if ( isset( $reuse[ $id ] ) && $stamp === (string) $reuse[ $id ][1] && is_file( easy_svg_icon_file_name( $dir, $id, $stamp ) ) ) {
            $content = (string) $reuse[ $id ][4];
        } else {
            $file = easy_svg_icon_file( $id );
            // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- the drawing this plugin wrote for core.
            $content = '' === $file ? '' : $sanitize( (string) file_get_contents( $file ) );
        }
        $rows[] = array( $id, $stamp, (string) $row->post_name, (string) $row->post_title, $content );
    }

    easy_svg_write_icon_listing( $path, array( 'key' => $key, 'rows' => $rows ) );
    return $rows;
}

function easy_svg_write_icon_listing( $path, array $listing ) {
    // Written beside and moved, so a reader sees the whole list or the old one.
    $part    = $path . '.' . uniqid( '', true ) . '.part';
    $written = false !== @file_put_contents( $part, (string) wp_json_encode( $listing ) ) && @rename( $part, $path ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged,WordPress.WP.AlternativeFunctions.rename_rename -- a folder that refuses the file falls back below; WP_Filesystem has no atomic move.
    if ( $written ) {
        delete_transient( 'easy_svg_icon_listing' );
        return;
    }
    if ( is_file( $part ) ) {
        wp_delete_file( $part );
    }
    // Uploads that refuse the file would otherwise sanitise every icon on every list.
    set_transient( 'easy_svg_icon_listing', $listing, DAY_IN_SECONDS );
}

/** @return array<string,mixed>|null What our rows add to read as core's, or null for a field this plugin does not know. */
function easy_svg_icon_listing_extra() {
    $schema = class_exists( 'WP_REST_Icons_Controller' ) ? ( new WP_REST_Icons_Controller() )->get_item_schema() : array();
    $extra  = array();
    foreach ( array_keys( (array) ( $schema['properties'] ?? array() ) ) as $field ) {
        if ( ! array_key_exists( $field, EASY_SVG_ICON_LISTING_FIELDS ) ) {
            return null;
        }
        if ( null !== EASY_SVG_ICON_LISTING_FIELDS[ $field ] ) {
            $extra[ $field ] = EASY_SVG_ICON_LISTING_FIELDS[ $field ];
        }
    }
    return $extra;
}

function easy_svg_icon_listing_applies( $request ) {
    if ( ! is_object( $request ) || ! method_exists( $request, 'get_route' ) || ! method_exists( $request, 'get_method' ) ) {
        return false;
    }
    if ( 'GET' !== $request->get_method() || ! preg_match( EASY_SVG_ICON_LISTING_ROUTE, (string) $request->get_route() ) ) {
        return false;
    }
    // A filter on the library, or a field another plugin adds to each icon, is computed by core per icon.
    if ( has_filter( 'easy_svg_registrable_icons' ) || ! empty( $GLOBALS['wp_rest_additional_fields']['icon'] ) || null === easy_svg_icon_listing_extra() ) {
        return false;
    }
    return easy_svg_icons_supported() && '' !== easy_svg_icon_listing_path() && null !== easy_svg_icon_listing_sanitizer();
}

// Right before core's controller, whose after-hook always follows: our names leave the registry for this one list.
function easy_svg_icon_listing_before( $result, $handler = null, $request = null ) {
    if ( null !== $result || ! easy_svg_icon_listing_applies( $request ) ) {
        return $result;
    }
    $registry = easy_svg_core_icon_registry();
    $parked   = &easy_svg_icon_listing_parked();
    foreach ( array_keys( easy_svg_registered_icon_names() ) as $name ) {
        if ( $registry->is_registered( $name ) ) {
            $registry->unregister( $name );
            $parked[] = $name;
        }
    }
    $GLOBALS['easy_svg_icon_listing'] = $request;
    return $result;
}

/** @return string[] */
function &easy_svg_icon_listing_parked() {
    static $parked = array();
    return $parked;
}

// Back at once, whatever the answer, in one query: an Icon block later in the same request still draws them.
function easy_svg_icon_listing_restore() {
    $parked = &easy_svg_icon_listing_parked();
    $prefix = EASY_SVG_ICON_COLLECTION . '/';
    easy_svg_register_icon_slugs( array_map( static fn( $name ) => substr( $name, strlen( $prefix ) ), $parked ) );
    $parked = array();
}

// Inside dispatch and before anything that pages the list: our rows go where core keeps them, after its own collection.
function easy_svg_icon_listing_after( $response, $handler = null, $request = null ) {
    $asked = $GLOBALS['easy_svg_icon_listing'] ?? null;
    if ( null === $asked ) {
        return $response;
    }
    // Cleared first: a refused list must not leave it for the next request in the same process.
    unset( $GLOBALS['easy_svg_icon_listing'] );
    easy_svg_icon_listing_restore();
    if ( $asked !== $request || ! $response instanceof WP_REST_Response || 200 !== $response->get_status() ) {
        return $response;
    }
    $data = $response->get_data();
    if ( ! is_array( $data ) || ( array() !== $data && array_keys( $data ) !== range( 0, count( $data ) - 1 ) ) ) {
        return $response;
    }
    $collection = $request->get_param( 'collection' );
    if ( null !== $collection && EASY_SVG_ICON_COLLECTION !== (string) $collection ) {
        return $response;
    }

    $search = $request->get_param( 'search' );
    $extra  = (array) easy_svg_icon_listing_extra();
    $ours   = array();
    foreach ( easy_svg_icon_listing() as $row ) {
        $name  = EASY_SVG_ICON_COLLECTION . '/' . $row[2];
        $label = (string) $row[3];
        // Core's own test, empty() included: a search for "0" matches everything there too.
        if ( ! empty( $search ) && false === stripos( $name, (string) $search ) && false === stripos( $label, (string) $search ) ) {
            continue;
        }
        $icon = array(
            'name'  => $name,
            'label' => $label,
        );
        // Core leaves a drawing it could not read out of the row, and so does this list.
        if ( '' !== (string) $row[4] ) {
            $icon['content'] = (string) $row[4];
        }
        $ours[] = $icon + array( 'collection' => EASY_SVG_ICON_COLLECTION ) + $extra;
    }

    $at = 0;
    while ( $at < count( $data ) && 'core' === ( $data[ $at ]['collection'] ?? null ) ) {
        $at++;
    }
    array_splice( $data, $at, 0, $ours );
    $response->set_data( $data );
    $GLOBALS['easy_svg_icon_listed'] = $request;
    return $response;
}

// Core ignores per_page here; once our rows are in, a client that names a page gets it, unless another plugin paged already.
function easy_svg_icon_listing_page( $response, $handler = null, $request = null ) {
    $listed = $GLOBALS['easy_svg_icon_listed'] ?? null;
    unset( $GLOBALS['easy_svg_icon_listed'] );
    if ( null === $listed || $listed !== $request || ! $request instanceof WP_REST_Request || ! $response instanceof WP_REST_Response ) {
        return $response;
    }
    $query = (array) $request->get_query_params();
    if ( ( ! isset( $query['per_page'] ) && ! isset( $query['page'] ) ) || isset( $response->get_headers()['X-WP-Total'] ) ) {
        return $response;
    }
    $data     = (array) $response->get_data();
    $per_page = max( 1, (int) $request->get_param( 'per_page' ) );
    $page     = max( 1, (int) $request->get_param( 'page' ) );
    $total    = count( $data );
    $pages    = (int) ceil( $total / $per_page );
    $response->set_data( array_slice( $data, ( $page - 1 ) * $per_page, $per_page ) );
    $response->header( 'X-WP-Total', (string) $total );
    $response->header( 'X-WP-TotalPages', (string) $pages );
    // fetchAll in @wordpress/api-fetch follows Link, not the totals.
    if ( function_exists( 'rest_url' ) && function_exists( 'add_query_arg' ) ) {
        $base = add_query_arg( urlencode_deep( $query ), rest_url( ltrim( (string) $request->get_route(), '/' ) ) );
        if ( $page > 1 && $page <= $pages + 1 ) {
            $response->link_header( 'prev', add_query_arg( 'page', $page - 1, $base ) );
        }
        if ( $page < $pages ) {
            $response->link_header( 'next', add_query_arg( 'page', $page + 1, $base ) );
        }
    }
    return $response;
}

// Our names are not registered on a REST request; the routes that name our collection or one of our icons get what they need.
function easy_svg_icon_rest_route( $result, $server = null, $request = null ) {
    if ( null !== $result || ! is_object( $request ) || ! method_exists( $request, 'get_route' ) || easy_svg_icons_all_registered() || ! easy_svg_icons_supported() ) {
        return $result;
    }
    $route = (string) $request->get_route();
    if ( 0 !== strpos( $route, '/wp/v2/icon' ) ) {
        return $result;
    }
    // Without the prepared list core lists only what is registered, so it gets every icon, as in wp-admin.
    if ( preg_match( EASY_SVG_ICON_LISTING_ROUTE, $route ) && ! easy_svg_icon_listing_applies( $request ) ) {
        easy_svg_register_every_icon();
        return $result;
    }
    if ( preg_match( '#^/wp/v2/icons/' . preg_quote( EASY_SVG_ICON_COLLECTION, '#' ) . '/([a-z0-9](?:[a-z0-9_-]*[a-z0-9])?)/?$#', $route, $m ) ) {
        easy_svg_register_icons_on_demand( array( $m[1] ) );
        return $result;
    }
    // The collection only once it holds an icon: an empty one looks broken in the picker.
    global $wpdb;
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- one row, on the icon routes only.
    $any = $wpdb->get_var( $wpdb->prepare( "SELECT ID FROM {$wpdb->posts} WHERE post_type = %s AND post_status = 'publish' LIMIT 1", EASY_SVG_ICON_POST_TYPE ) );
    if ( null !== $any ) {
        easy_svg_register_collection_once( EASY_SVG_ICON_COLLECTION, array( 'label' => __( 'Easy SVG', 'easy-svg' ) ) );
    }
    return $result;
}
