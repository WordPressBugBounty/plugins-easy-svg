<?php
// wp_register_icon() is WordPress 7.1 and this plugin declares 6.6, so nothing here may assume it exists.

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

require_once __DIR__ . '/icons.php';
require_once __DIR__ . '/core-icon.php';
require_once __DIR__ . '/icon-listing.php';

// Icons are site-wide, so every route into the store must clear this cap, not upload_files.
const EASY_SVG_ICON_CAP = 'edit_theme_options';

const EASY_SVG_ICON_PAGE_SIZE = 100;

const EASY_SVG_ICON_CACHE = 'easy_svg_icons';

const EASY_SVG_ICON_VERSION = 'easy_svg_icons_version';

// Private in every direction: an icon is editor markup, and the Icons panel is its only interface.
function easy_svg_icon_store_args( $cap ) {
    $caps = array( 'edit_post', 'read_post', 'delete_post', 'edit_posts', 'edit_others_posts', 'delete_posts', 'publish_posts', 'read_private_posts', 'create_posts', 'read', 'delete_private_posts', 'delete_published_posts', 'delete_others_posts', 'edit_private_posts', 'edit_published_posts' );

    return array(
        'labels'              => array( 'name' => __( 'SVG icons', 'easy-svg' ) ),
        'public'              => false,
        'publicly_queryable'  => false,
        'exclude_from_search' => true,
        'show_ui'             => false,
        'show_in_menu'        => false,
        'show_in_rest'        => false,
        'has_archive'         => false,
        'rewrite'             => false,
        'query_var'           => false,
        // The post defaults would let an Author create icons through XML-RPC; map_meta_cap is off so these apply as written.
        'capabilities'        => array_fill_keys( $caps, $cap ),
        'map_meta_cap'        => false,
    );
}

function easy_svg_register_icon_store() {
    if ( ! easy_svg_feature_enabled( 'icons' ) || ! easy_svg_icons_supported() ) {
        easy_svg_register_locked_icon_store();
        return;
    }

    register_post_type(
        EASY_SVG_ICON_POST_TYPE,
        array_merge(
            easy_svg_icon_store_args( EASY_SVG_ICON_CAP ),
            array( 'supports' => array( 'title', 'editor' ) )
        )
    );
}

// Icons outlive the switch and an older WordPress; unregistered, core falls back to the post rules and an Editor reads and deletes them over XML-RPC.
function easy_svg_register_locked_icon_store() {
    register_post_type(
        EASY_SVG_ICON_POST_TYPE,
        array_merge(
            easy_svg_icon_store_args( 'manage_options' ),
            array(
                'show_in_nav_menus' => false,
                // An export never carried these while the type was unregistered.
                'can_export'        => false,
                'supports'          => false,
            )
        )
    );
}

// Cached because core builds its icon registry on every init; the expiry heals a write that bypassed us.
/** @return array<int, array{id:int, slug:string, label:string, content:string}> */
function easy_svg_icons_get() {
    // Read the version BEFORE the icons, so a list stored during a concurrent add carries the older version.
    $version = (int) get_option( EASY_SVG_ICON_VERSION, 0 );
    $cached  = get_transient( EASY_SVG_ICON_CACHE );

    if ( is_array( $cached ) && isset( $cached['version'], $cached['icons'] ) && $version === $cached['version'] && is_array( $cached['icons'] ) ) {
        return $cached['icons'];
    }

    $icons = easy_svg_collect_icons( 'easy_svg_icon_page', EASY_SVG_ICON_PAGE_SIZE );

    set_transient(
        EASY_SVG_ICON_CACHE,
        array(
            'version' => $version,
            'icons'   => $icons,
        ),
        DAY_IN_SECONDS
    );

    return $icons;
}

// One prepared WHERE over title and slug: a plugin rewriting WP_Query can split the matches from the count.
/**
 * @param string $search
 * @return array{0:string,1:array<int,string>}|null The WHERE as a template of placeholders and its values, or null with nothing to search.
 */
function easy_svg_icon_search_where( $search ) {
    global $wpdb;
    $search = trim( (string) $search );
    if ( '' === $search || ! isset( $wpdb ) ) {
        return null;
    }

    // Terms as WP_Query::parse_search() splits them: quoted phrases, no stopwords, at most nine.
    $terms = array();
    if ( preg_match_all( '/".*?("|$)|((?<=[\t ",+])|^)[^\t ",+]+/', $search, $m ) ) {
        $stop  = function_exists( '_x' )
            ? _x( 'about,an,are,as,at,be,by,com,for,from,how,in,is,it,of,on,or,that,the,this,to,was,what,when,where,who,will,with,www', 'Comma-separated list of search stopwords in your language' ) // phpcs:ignore WordPress.WP.I18n.MissingArgDomain -- core's own string, so it carries core's translation.
            : 'about,an,are,as,at,be,by,com,for,from,how,in,is,it,of,on,or,that,the,this,to,was,what,when,where,who,will,with,www';
        $stop  = array_filter( array_map( 'trim', explode( ',', (string) $stop ) ), static fn( $t ) => '' !== $t );
        // Core's hook, not ours: a site that tuned its stopwords gets them here too.
        $stop  = (array) apply_filters( 'wp_search_stopwords', $stop ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- core's hook.
        $lower = function_exists( 'mb_strtolower' ) ? 'mb_strtolower' : 'strtolower';
        foreach ( $m[0] as $term ) {
            $term = preg_match( '/^".+"$/', $term ) ? trim( $term, "\"'" ) : trim( $term, "\"' " );
            if ( '' === $term || ( 1 === strlen( $term ) && preg_match( '/^[a-z\-]$/i', $term ) ) || in_array( $lower( $term ), $stop, true ) ) {
                continue;
            }
            $terms[] = $term;
        }
    }
    if ( array() === $terms || count( $terms ) > 9 ) {
        $terms = array( $search );
    }

    // Only the table name, fixed operators and %s go into the template; every value goes to $args.
    $args  = array( EASY_SVG_ICON_POST_TYPE );
    $title = array();
    foreach ( $terms as $term ) {
        // A leading "-" excludes, as in core.
        $op = 'LIKE';
        if ( strlen( $term ) > 1 && '-' === $term[0] ) {
            $op   = 'NOT LIKE';
            $term = substr( $term, 1 );
        }
        $title[] = "{$wpdb->posts}.post_title {$op} %s";
        $args[]  = '%' . $wpdb->esc_like( $term ) . '%';
    }
    $args[] = '%' . $wpdb->esc_like( $search ) . '%';

    $sql = "{$wpdb->posts}.post_type = %s AND {$wpdb->posts}.post_status = 'publish' AND ( ( " . implode( ' AND ', $title ) . " ) OR {$wpdb->posts}.post_name LIKE %s )";
    // Core hides protected posts from a visitor; here that covers the slug match too.
    if ( function_exists( 'is_user_logged_in' ) && ! is_user_logged_in() ) {
        $sql .= " AND {$wpdb->posts}.post_password = ''";
    }
    return array( $sql, $args );
}

// Counted by the database with the same WHERE a page runs.
/** @param string $search */
function easy_svg_icon_search_count( $search ) {
    global $wpdb;
    $where = easy_svg_icon_search_where( $search );
    if ( null === $where ) {
        return 0;
    }
    list( $sql, $args ) = $where;
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber,PluginCheck.Security.DirectDB.UnescapedDBParameter -- $sql holds placeholders only (easy_svg_icon_search_where()); every value is bound here.
    return (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE {$sql}", $args ) );
}

/**
 * @param string $search
 * @param int    $page     1-based.
 * @param int    $per_page
 * @return array<int, object>
 */
function easy_svg_icon_search_rows( $search, $page, $per_page ) {
    global $wpdb;
    $where = easy_svg_icon_search_where( $search );
    if ( null === $where || $per_page < 1 ) {
        return array();
    }
    list( $sql, $args ) = $where;
    $args[]             = (int) $per_page;
    $args[]             = ( max( 1, (int) $page ) - 1 ) * (int) $per_page;
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber,PluginCheck.Security.DirectDB.UnescapedDBParameter -- $sql holds placeholders only (easy_svg_icon_search_where()); every value is bound here.
    $rows = (array) $wpdb->get_results( $wpdb->prepare( "SELECT ID, post_name, post_title, post_content FROM {$wpdb->posts} WHERE {$sql} ORDER BY {$wpdb->posts}.ID DESC LIMIT %d OFFSET %d", $args ) );
    // The off switch is a post meta: one query primes it for the page.
    if ( array() !== $rows && function_exists( 'update_meta_cache' ) ) {
        update_meta_cache( 'post', array_map( static fn( $r ) => (int) $r->ID, $rows ) );
    }
    return $rows;
}

/**
 * @param int    $page     1-based.
 * @param int    $per_page
 * @param string $search
 * @return array<int, array{id:int, slug:string, label:string, content:string}>
 */
function easy_svg_icon_page( $page, $per_page, $search = '' ) {
    $args = array(
        'post_type'              => EASY_SVG_ICON_POST_TYPE,
        'post_status'            => 'publish',
        'posts_per_page'         => (int) $per_page,
        'paged'                  => (int) $page,
        // Newest first, as the media library lists its files.
        'orderby'                => 'ID',
        'order'                  => 'DESC',
        'no_found_rows'          => true,
        'update_post_meta_cache' => true,
        'update_post_term_cache' => false,
    );

    // Searched on the server, title plus slug: one response cannot filter a library, and SVG markup is never searched.
    $search = trim( (string) $search );
    if ( '' === $search ) {
        $posts = get_posts( $args );
    } else {
        $posts = easy_svg_icon_search_rows( $search, (int) $page, (int) $per_page );
    }

    $icons = array();

    foreach ( $posts as $post ) {
        $icons[] = array(
            'id'      => (int) $post->ID,
            'slug'    => (string) $post->post_name,
            'label'   => (string) $post->post_title,
            'content' => (string) $post->post_content,
            'off'     => '1' === (string) get_post_meta( $post->ID, EASY_SVG_ICON_OFF_META, true ),
        );
    }

    return $icons;
}

// The trash, last trashed first; every drawing hardened here, because the panel prints it.
/**
 * @param int $page     1-based.
 * @param int $per_page
 * @return array<int, array{id:int, slug:string, label:string, content:string, trashed:int}>
 */
function easy_svg_trashed_icon_page( $page, $per_page ) {
    $posts = get_posts(
        array(
            'post_type'              => EASY_SVG_ICON_POST_TYPE,
            'post_status'            => 'trash',
            'posts_per_page'         => (int) $per_page,
            'paged'                  => (int) $page,
            'orderby'                => array(
                'modified' => 'DESC',
                'ID'       => 'DESC',
            ),
            'no_found_rows'          => true,
            'update_post_meta_cache' => true,
            'update_post_term_cache' => false,
        )
    );

    $icons = array();
    foreach ( $posts as $post ) {
        $icons[] = array(
            'id'      => (int) $post->ID,
            'slug'    => easy_svg_trashed_icon_slug( $post ),
            'label'   => (string) $post->post_title,
            'content' => easy_svg_hardened_once( (string) $post->post_content ),
            'trashed' => (int) get_post_meta( $post->ID, '_wp_trash_meta_time', true ),
        );
    }

    return $icons;
}

// Hooked on save_post_esw_icon, not only the REST handlers, so WP-CLI and importer writes show up too.
function easy_svg_forget_icons() {
    // A small autoloaded number: reading it costs nothing on any request.
    update_option( EASY_SVG_ICON_VERSION, (int) get_option( EASY_SVG_ICON_VERSION, 0 ) + 1, true );
    delete_transient( EASY_SVG_ICON_CACHE );
}

// Not a list registers nothing, as the FAQ says; a list with gaps, as array_filter() leaves one, is still a list.
function easy_svg_icon_list( $icons ) {
    if ( ! is_array( $icons ) || array() !== array_filter( array_keys( $icons ), 'is_string' ) ) {
        return array();
    }
    return array_values( $icons );
}

// On init at 10, after core registers its own collections at 0. Where nothing lists icons, a page registers the ones it draws.
function easy_svg_boot_icons() {
    if ( ! easy_svg_icons_supported() ) {
        return;
    }

    // An add-on on the filter is promised the whole library, so it is handed over on every request.
    if ( has_filter( 'easy_svg_registrable_icons' ) ) {
        easy_svg_icons_all_registered( true );
        // Core's registry has no filter, so add-ons change markup here.
        $icons = easy_svg_icon_list( apply_filters( 'easy_svg_registrable_icons', easy_svg_icons_get() ) );
        easy_svg_register_icons( $icons, 'easy_svg_register_collection_once', 'easy_svg_register_icon_once' );
        return;
    }

    if ( easy_svg_lists_icons() ) {
        easy_svg_register_every_icon();
    }
}

// Query keys of the page builders' editing views: they may offer the Icon block's picker beside the page.
const EASY_SVG_BUILDER_PREVIEW_KEYS = array( 'elementor-preview', 'fl_builder', 'et_fb', 'bricks', 'ct_builder', 'breakdance_iframe', 'vc_editable', 'vcv-editable', 'brizy-edit-iframe', 'fb-edit', 'tve', 'uxb_iframe', 'customize_changeset_uuid' );

// wp-admin (not its AJAX calls), WP-CLI and a builder's editing view list icons; a visitor's page does not.
function easy_svg_lists_icons() {
    $listed = ( function_exists( 'is_admin' ) && is_admin() && ! ( function_exists( 'wp_doing_ajax' ) && wp_doing_ajax() ) )
        || ( defined( 'WP_CLI' ) && WP_CLI );
    foreach ( EASY_SVG_BUILDER_PREVIEW_KEYS as $key ) {
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- only whether the key is there; nothing is read from it.
        $listed = $listed || isset( $_GET[ $key ] );
    }
    return (bool) apply_filters( 'easy_svg_register_every_icon', $listed );
}

/** @param bool|null $set */
function easy_svg_icons_all_registered( $set = null ) {
    static $all = false;
    if ( null !== $set ) {
        $all = (bool) $set;
    }
    return $all;
}

// Every name once: a page that drew an icon before a REST list asked for all of them must not register it twice.
function easy_svg_register_every_icon() {
    if ( easy_svg_icons_all_registered() || ! easy_svg_icons_supported() ) {
        return 0;
    }
    easy_svg_icons_all_registered( true );
    if ( '' !== easy_svg_icon_file_dir() ) {
        return easy_svg_register_icon_files( 'easy_svg_register_collection_once', 'easy_svg_register_icon_once' );
    }
    return easy_svg_register_icons( easy_svg_icon_list( easy_svg_icons_get() ), 'easy_svg_register_collection_once', 'easy_svg_register_icon_once' );
}

/** @return array<string, true> The names this plugin handed core, so a REST list can take them out and put them back. */
function &easy_svg_registered_icon_names() {
    static $names = array();
    return $names;
}

// Named as a string: the class is WordPress 7.1, and this plugin loads on 6.6.
function easy_svg_core_icon_registry() {
    $class = 'WP_Icons_Registry';
    return class_exists( $class ) ? call_user_func( array( $class, 'get_instance' ) ) : null;
}

function easy_svg_register_collection_once( $slug, $args ) {
    if ( class_exists( 'WP_Icon_Collections_Registry' ) && WP_Icon_Collections_Registry::get_instance()->is_registered( (string) $slug ) ) {
        return true;
    }
    return (bool) call_user_func( 'wp_register_icon_collection', $slug, $args );
}

function easy_svg_register_icon_once( $name, $args ) {
    $registry = easy_svg_core_icon_registry();
    if ( null !== $registry && $registry->is_registered( (string) $name ) ) {
        return false;
    }
    if ( ! call_user_func( 'wp_register_icon', $name, $args ) ) {
        return false;
    }
    $names                    = &easy_svg_registered_icon_names();
    $names[ (string) $name ] = true;
    return true;
}

/** @return array<int, array<string, true>> The slugs each site already looked up this request. */
function &easy_svg_icons_asked() {
    static $asked = array();
    return $asked;
}

// Core's icon registry is one per request, not per site: our names leave it on a switch, and each site registers its own.
function easy_svg_icons_forget_site( $new_blog = 0, $old_blog = 0 ) {
    if ( (int) $new_blog === (int) $old_blog ) {
        return;
    }
    $registry = easy_svg_core_icon_registry();
    $names    = &easy_svg_registered_icon_names();
    foreach ( array_keys( $names ) as $name ) {
        if ( null !== $registry && $registry->is_registered( $name ) ) {
            $registry->unregister( $name );
        }
    }
    $names = array();
    $asked = &easy_svg_icons_asked();
    $asked = array();
    // Lazily: an Icon block or an icon route registers what it needs, so a loop over sites registers nothing.
    easy_svg_icons_all_registered( false );
    // An add-on on the filter is promised the whole library of the site it runs on.
    if ( has_filter( 'easy_svg_registrable_icons' ) ) {
        easy_svg_boot_icons();
    }
}

// The icons a page draws, in one query for every name not seen yet; a slug that is no published icon stays unregistered.
/** @param string[] $slugs */
function easy_svg_register_icons_on_demand( array $slugs ) {
    $asked = &easy_svg_icons_asked();
    if ( easy_svg_icons_all_registered() || ! easy_svg_icons_supported() ) {
        return 0;
    }
    // Per site: after switch_to_blog() the same slug is another site's icon.
    $blog = function_exists( 'get_current_blog_id' ) ? get_current_blog_id() : 0;
    $want = array();
    foreach ( $slugs as $slug ) {
        $slug = (string) $slug;
        if ( isset( $asked[ $blog ][ $slug ] ) || '' === easy_svg_icon_name( $slug ) ) {
            continue;
        }
        $asked[ $blog ][ $slug ] = true;
        $want[]                  = $slug;
    }
    return easy_svg_register_icon_slugs( $want );
}

/** @param string[] $want Valid slugs, each once. */
function easy_svg_register_icon_slugs( array $want ) {
    if ( array() === $want ) {
        return 0;
    }
    global $wpdb;
    $dir = easy_svg_icon_file_dir();
    // The drawing comes along only when there is no folder to keep it in; otherwise core reads the file when it draws.
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare -- one %s per slug, all bound by this prepare().
    $rows = (array) $wpdb->get_results(
        $wpdb->prepare(
            "SELECT ID, post_name, post_title, post_modified_gmt, CASE WHEN %d = 1 THEN post_content ELSE '' END AS post_content FROM {$wpdb->posts} WHERE post_type = %s AND post_status = 'publish' AND post_name IN (" . implode( ',', array_fill( 0, count( $want ), '%s' ) ) . ') ORDER BY ID DESC',
            array_merge( array( '' === $dir ? 1 : 0, EASY_SVG_ICON_POST_TYPE ), $want )
        )
    );
    if ( '' === $dir ) {
        $icons = array();
        foreach ( $rows as $row ) {
            $icons[] = array(
                'slug'    => (string) $row->post_name,
                'label'   => (string) $row->post_title,
                'content' => (string) $row->post_content,
            );
        }
        return easy_svg_register_icons( $icons, 'easy_svg_register_collection_once', 'easy_svg_register_icon_once' );
    }
    $stamps = array();
    foreach ( $rows as $row ) {
        $stamps[ (int) $row->ID ] = (string) $row->post_modified_gmt;
    }
    easy_svg_icon_file_stamps( $stamps );
    $taken = 0;
    foreach ( $rows as $row ) {
        $name = easy_svg_icon_name( (string) $row->post_name );
        if ( '' === $name || ! easy_svg_register_collection_once( EASY_SVG_ICON_COLLECTION, array( 'label' => __( 'Easy SVG', 'easy-svg' ) ) ) ) {
            continue;
        }
        $args = array(
            'label'     => (string) $row->post_title,
            'file_path' => new Easy_Svg_Icon_File( (int) $row->ID ),
        );
        if ( easy_svg_register_icon_once( $name, $args ) ) {
            $taken++;
        }
    }
    return $taken;
}

// Our names in a block tree: the block itself, and below a top-level block every block it holds, so a page asks once per top-level block.
/**
 * @param array<string,mixed> $block
 * @param string[]            $into
 * @return string[]
 */
function easy_svg_block_icon_slugs( array $block, $deep, array $into = array() ) {
    $icon = $block['attrs']['icon'] ?? null;
    if ( 'core/icon' === ( $block['blockName'] ?? null ) && is_string( $icon ) && 0 === strpos( $icon, EASY_SVG_ICON_COLLECTION . '/' ) ) {
        $into[] = substr( $icon, strlen( EASY_SVG_ICON_COLLECTION ) + 1 );
    }
    if ( $deep ) {
        foreach ( (array) ( $block['innerBlocks'] ?? array() ) as $inner ) {
            if ( is_array( $inner ) ) {
                $into = easy_svg_block_icon_slugs( $inner, true, $into );
            }
        }
    }
    return $into;
}

// render_block_data runs for every block, nested ones, template parts and synced patterns too, before core draws it.
/** @param array<string,mixed> $parsed_block */
function easy_svg_icon_block_data( $parsed_block, $source_block = null, $parent_block = null ) {
    if ( is_array( $parsed_block ) && ! easy_svg_icons_all_registered() ) {
        $slugs = easy_svg_block_icon_slugs( $parsed_block, null === $parent_block );
        if ( array() !== $slugs ) {
            easy_svg_register_icons_on_demand( $slugs );
        }
    }
    return $parsed_block;
}

// An icon a block binding supplies is only known while the block renders.
function easy_svg_bound_icon( $value, $source = '', $source_args = array(), $block_instance = null, $attribute_name = '' ) {
    if ( 'icon' === $attribute_name && is_string( $value ) && 0 === strpos( $value, EASY_SVG_ICON_COLLECTION . '/' ) && is_object( $block_instance ) && 'core/icon' === ( $block_instance->name ?? '' ) ) {
        easy_svg_register_icons_on_demand( array( substr( $value, strlen( EASY_SVG_ICON_COLLECTION ) + 1 ) ) );
    }
    return $value;
}

const EASY_SVG_ICON_INDEX_PAGE = 2000;

const EASY_SVG_ICON_FILE_BATCH = 100;

const EASY_SVG_ICON_STROKED = 'easy_svg_icons_stroked';

const EASY_SVG_ICON_FILES_GUARDED = 'easy_svg_icon_files_guarded';

// Core reads a file_path only when it draws the icon, and casts it to a string first; that cast writes the file.
final class Easy_Svg_Icon_File {
    /** @var int */
    private $id;

    /** @param int $id */
    public function __construct( $id ) {
        $this->id = (int) $id;
    }

    public function __toString(): string {
        return easy_svg_icon_file( $this->id );
    }
}

// Every folder a drawing may lie in: a site whose uploads took no file for a while has some in the temporary one.
/** @return string[] */
function easy_svg_icon_file_places() {
    $places = array();
    if ( ! function_exists( 'wp_hash' ) ) {
        return $places;
    }
    $uploads = function_exists( 'wp_upload_dir' ) ? wp_upload_dir( null, false ) : array();
    if ( empty( $uploads['error'] ) && ! empty( $uploads['basedir'] ) ) {
        $places[] = rtrim( (string) $uploads['basedir'], '/\\' ) . '/easy-svg-icon-files';
    }
    // The salts are network-wide, so the site id keeps one site from purging or drawing another's files.
    if ( function_exists( 'get_temp_dir' ) && function_exists( 'get_current_blog_id' ) ) {
        $places[] = get_temp_dir() . 'easy-svg-icon-files-' . substr( wp_hash( 'easy-svg-icon-files|' . get_current_blog_id() ), 0, 12 );
    }
    return $places;
}

// Uploads first, the temporary folder second; empty when neither takes a file, and boot then hands over markup.
function easy_svg_icon_file_dir( $refresh = false ) {
    static $dirs = array();
    // Per site: after switch_to_blog() the drawings belong in that site's uploads.
    $blog = function_exists( 'get_current_blog_id' ) ? get_current_blog_id() : 0;
    if ( isset( $dirs[ $blog ] ) && ! $refresh ) {
        return $dirs[ $blog ];
    }
    $dirs[ $blog ] = '';
    $dir           = &$dirs[ $blog ];
    if ( ! function_exists( 'wp_mkdir_p' ) ) {
        return $dir;
    }
    foreach ( easy_svg_icon_file_places() as $place ) {
        // A network that does not allow SVG files gets none in uploads, where the web server would serve them.
        if ( easy_svg_icon_files_in_uploads_refused( $place ) ) {
            continue;
        }
        if ( ( is_dir( $place ) || wp_mkdir_p( $place ) ) && wp_is_writable( $place ) ) {
            // Once per folder and guard version ("|2" added .htaccess and index.html), shards included.
            if ( ! is_file( $place . '/index.php' ) || get_option( EASY_SVG_ICON_FILES_GUARDED ) !== $place . '|2' ) {
                foreach ( array_merge( array( $place ), (array) glob( $place . '/[0-9][0-9]', GLOB_ONLYDIR ) ) as $folder ) {
                    if ( is_string( $folder ) ) {
                        easy_svg_guard_folder( $folder );
                    }
                }
                // Marked only once the .htaccess is there, so a failed write is tried again.
                if ( easy_svg_deny_folder( $place ) ) {
                    update_option( EASY_SVG_ICON_FILES_GUARDED, $place . '|2', true );
                }
            }
            $dir = $place;
            break;
        }
    }
    return $dir;
}

function easy_svg_icon_files_in_uploads_refused( $place ) {
    return str_ends_with( (string) $place, '/easy-svg-icon-files' ) && function_exists( 'easy_svg_network_allows_svg' ) && ! easy_svg_network_allows_svg();
}

// Each shard too: a host that lists directories would show every file name. Nginx's default index is index.html, not index.php.
function easy_svg_guard_folder( $folder ) {
    if ( ! is_file( $folder . '/index.php' ) ) {
        file_put_contents( $folder . '/index.php', "<?php\n// Silence is golden.\n" );
    }
    if ( ! is_file( $folder . '/index.html' ) ) {
        file_put_contents( $folder . '/index.html', '' );
    }
}

// WordPress reads these drawings from disk; no page links to them, so Apache serves none. Nginx ignores this file: see the hosting docs.
function easy_svg_deny_folder( $folder ) {
    if ( is_file( $folder . '/.htaccess' ) ) {
        return true;
    }
    // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- a failed write is reported by the return value and tried again.
    return false !== @file_put_contents( $folder . '/.htaccess', "# Easy SVG: read by WordPress from disk; Apache serves none of these files. On nginx, see the FAQ for a deny rule.\n<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n" );
}

// The stamp and the rewrite's source are in the name, so a changed icon or an updated rewrite gets a new file; the hash keeps a drawing nobody published unguessable.
function easy_svg_icon_file_name( $dir, $id, $stamp ) {
    static $salt = null;
    if ( null === $salt ) {
        $salt = (string) md5_file( __DIR__ . '/core-icon.php' );
    }
    return $dir . '/' . easy_svg_icon_shard( $id ) . '/' . $id . '-' . substr( wp_hash( $id . '|' . $stamp . '|' . $salt ), 0, 16 ) . '.svg';
}

/**
 * @param array<int, string>|null $add
 * @return array<int, string>
 */
function easy_svg_icon_file_stamps( $add = null ) {
    static $stamps = array();
    foreach ( (array) $add as $id => $stamp ) {
        $stamps[ (int) $id ] = (string) $stamp;
    }
    return $stamps;
}

// Ids, labels and slugs only; the drawings stay in the database until an icon is drawn.
/** @return array<int, object> */
function easy_svg_icon_index_page( $before, $limit ) {
    global $wpdb;
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- WP_Query returns ids or whole posts with their SVG, and the SVG is what this read must leave behind.
    return (array) $wpdb->get_results(
        $wpdb->prepare(
            "SELECT ID, post_name, post_title, post_modified_gmt FROM {$wpdb->posts} WHERE post_type = %s AND post_status = 'publish' AND ( %d = 0 OR ID < %d ) ORDER BY ID DESC LIMIT %d",
            EASY_SVG_ICON_POST_TYPE,
            (int) $before,
            (int) $before,
            (int) $limit
        )
    );
}

/**
 * @param callable(string, array): bool $register_collection
 * @param callable(string, array): bool $register_icon
 */
function easy_svg_register_icon_files( $register_collection, $register_icon ) {
    // Read before the names, as in easy_svg_icons_get(), so the outline answer below is never newer than they are.
    $version = (int) get_option( EASY_SVG_ICON_VERSION, 0 );
    $ready   = null;
    $taken   = 0;
    $before  = 0;

    do {
        $rows   = easy_svg_icon_index_page( $before, EASY_SVG_ICON_INDEX_PAGE );
        $stamps = array();
        foreach ( $rows as $row ) {
            // Not the library version: one added icon must not send every other one back to the database.
            $stamps[ (int) $row->ID ] = (string) $row->post_modified_gmt;
        }
        easy_svg_icon_file_stamps( $stamps );

        foreach ( $rows as $row ) {
            $before = (int) $row->ID;
            $name   = easy_svg_icon_name( (string) $row->post_name );
            if ( '' === $name ) {
                continue;
            }
            // Only once an icon is ready: an empty collection looks broken in the picker.
            if ( null === $ready ) {
                $ready = (bool) call_user_func( $register_collection, EASY_SVG_ICON_COLLECTION, array( 'label' => __( 'Easy SVG', 'easy-svg' ) ) );
            }
            if ( ! $ready ) {
                return 0;
            }
            $args = array(
                'label'     => (string) $row->post_title,
                'file_path' => new Easy_Svg_Icon_File( $before ),
            );
            if ( call_user_func( $register_icon, $name, $args ) ) {
                $taken++;
            }
        }
    } while ( count( $rows ) === EASY_SVG_ICON_INDEX_PAGE );

    if ( $taken > 0 && easy_svg_icons_stroked( $version ) ) {
        easy_svg_stroke_stylesheet_needed( true );
    }

    return $taken;
}

// The stroke rule is printed in the head, before any icon is drawn, so whether one is outlined is asked of the database once per version.
function easy_svg_icons_stroked( $version ) {
    $known = get_option( EASY_SVG_ICON_STROKED );
    if ( is_array( $known ) && isset( $known['version'], $known['stroked'] ) && (int) $version === (int) $known['version'] ) {
        return (bool) $known['stroked'];
    }
    global $wpdb;
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- one row is enough, and the answer is kept per version below.
    $stroked = null !== $wpdb->get_var(
        $wpdb->prepare(
            "SELECT ID FROM {$wpdb->posts} WHERE post_type = %s AND post_status = 'publish' AND post_content LIKE %s LIMIT 1",
            EASY_SVG_ICON_POST_TYPE,
            '%' . $wpdb->esc_like( 'stroke' ) . '%'
        )
    );
    update_option(
        EASY_SVG_ICON_STROKED,
        array(
            'version' => (int) $version,
            'stroked' => $stroked,
        ),
        true
    );
    return $stroked;
}

// The picker draws every icon in order, so a missing file brings the next ones' drawings in the same query.
function easy_svg_icon_file( $id ) {
    static $keys = array(), $position = array();
    $id     = (int) $id;
    $stamps = easy_svg_icon_file_stamps();
    $dir    = easy_svg_icon_file_dir();
    if ( '' === $dir || ! isset( $stamps[ $id ] ) ) {
        return '';
    }
    $path = easy_svg_icon_file_name( $dir, $id, $stamps[ $id ] );
    if ( is_file( $path ) ) {
        return $path;
    }

    if ( ! isset( $position[ $id ] ) || count( $keys ) !== count( $stamps ) ) {
        $keys     = array_keys( $stamps );
        $position = array_flip( $keys );
    }
    $want = array( $id => $path );
    $last = min( count( $keys ), $position[ $id ] + EASY_SVG_ICON_FILE_BATCH );
    for ( $i = $position[ $id ] + 1; $i < $last; $i++ ) {
        $next = easy_svg_icon_file_name( $dir, $keys[ $i ], $stamps[ $keys[ $i ] ] );
        if ( ! is_file( $next ) ) {
            $want[ $keys[ $i ] ] = $next;
        }
    }

    global $wpdb;
    $ids = array_keys( $want );
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare -- one %d per id, all bound by this prepare(); each row is written to its file once and then read from disk.
    $rows = (array) $wpdb->get_results(
        $wpdb->prepare(
            "SELECT ID, post_content FROM {$wpdb->posts} WHERE post_type = %s AND post_status = 'publish' AND ID IN (" . implode( ',', array_fill( 0, count( $ids ), '%d' ) ) . ')',
            array_merge( array( EASY_SVG_ICON_POST_TYPE ), $ids )
        )
    );
    foreach ( $rows as $row ) {
        $file = $want[ (int) $row->ID ] ?? '';
        if ( '' !== $file ) {
            easy_svg_write_icon_file( $file, (int) $row->ID, (string) $row->post_content );
        }
    }

    return is_file( $path ) ? $path : '';
}

// Core gets the drawing after its rewrite, hardened again: uploads may be served directly.
function easy_svg_write_icon_file( $file, $id, $content ) {
    $for_core = easy_svg_core_icon( $content );
    $svg    = easy_svg_harden_icon_markup( '' !== $for_core['content'] ? $for_core['content'] : $content );
    $folder = dirname( $file );
    if ( '' === $svg ) {
        return;
    }
    if ( ! is_dir( $folder ) && ! wp_mkdir_p( $folder ) ) {
        return;
    }
    easy_svg_guard_folder( $folder );
    // Written aside and moved, so a request drawing the icon meanwhile never reads half a file.
    $part = $file . '.' . uniqid( '', true ) . '.part';
    if ( false === file_put_contents( $part, $svg ) || ! rename( $part, $file ) ) { // phpcs:ignore WordPress.WP.AlternativeFunctions.rename_rename -- WP_Filesystem has no atomic move.
        wp_delete_file( $part );
        return;
    }
    easy_svg_forget_icon_file( $id, $file );
}

// An older drawing of the icon, or all of them when it is saved or gone: two saves in one second keep one stamp.
function easy_svg_forget_icon_file( $id, $keep = '' ) {
    $dir = easy_svg_icon_file_dir();
    if ( '' === $dir ) {
        return;
    }
    foreach ( (array) glob( $dir . '/' . easy_svg_icon_shard( $id ) . '/' . (int) $id . '-*.svg' ) as $old ) {
        if ( is_string( $old ) && $old !== $keep ) {
            wp_delete_file( $old );
        }
    }
}

// A hundred folders, so no folder holds every icon file of a large library.
function easy_svg_icon_shard( $id ): string {
    return sprintf( '%02d', (int) $id % 100 );
}

// For good: every drawing and half-written part of the icon, in either folder, and its folder once that is empty.
function easy_svg_purge_icon_files( $id ) {
    foreach ( easy_svg_icon_file_places() as $place ) {
        $shard = $place . '/' . easy_svg_icon_shard( $id );
        if ( ! is_dir( $shard ) ) {
            continue;
        }
        foreach ( (array) glob( $shard . '/' . (int) $id . '-*' ) as $file ) {
            if ( is_string( $file ) && is_file( $file ) ) {
                wp_delete_file( $file );
            }
        }
        $left = @scandir( $shard ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- another request may have removed the folder since is_dir().
        if ( is_array( $left ) && array() === array_diff( $left, array( '.', '..', 'index.php', 'index.html' ) ) ) {
            wp_delete_file( $shard . '/index.php' );
            wp_delete_file( $shard . '/index.html' );
            // Quiet: a second purge or a new drawing can win the race, and a folder that stays gets its guard back.
            if ( ! @rmdir( $shard ) ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged,WordPress.WP.AlternativeFunctions.file_system_operations_rmdir -- an emptied folder of this plugin's own.
                // The is_dir() above is cached, and the folder may be gone by now.
                clearstatcache( true, $shard );
                if ( is_dir( $shard ) ) {
                    easy_svg_guard_folder( $shard );
                }
            }
        }
    }
}

// Before the site id joined the name, every site of a network drew into one temporary folder that nothing reads any more.
const EASY_SVG_SHARED_FOLDER_CLEANED = 'easy_svg_shared_icon_folder_cleaned';

const EASY_SVG_SHARED_FOLDER_BATCH = 500;

// Once per network, a bounded batch per admin request, and silent: another site may be emptying the same folder.
function easy_svg_clean_shared_icon_folder() {
    if ( ! function_exists( 'get_site_option' ) || ! function_exists( 'get_temp_dir' ) || ! function_exists( 'wp_hash' ) ) {
        return;
    }
    if ( ! get_site_option( EASY_SVG_SHARED_FOLDER_CLEANED ) && easy_svg_empty_icon_folder( get_temp_dir() . 'easy-svg-icon-files-' . substr( wp_hash( 'easy-svg-icon-files' ), 0, 12 ) ) ) {
        update_site_option( EASY_SVG_SHARED_FOLDER_CLEANED, 1 );
    }
    // Drawings left in uploads from before the network took svg off its upload file types.
    $uploads = easy_svg_icon_file_places()[0] ?? '';
    if ( easy_svg_icon_files_in_uploads_refused( $uploads ) && is_dir( $uploads ) ) {
        easy_svg_empty_icon_folder( $uploads );
    }
}

// True once the folder is gone; each call removes at most one batch of files.
function easy_svg_empty_icon_folder( $dir ) {
    $left = EASY_SVG_SHARED_FOLDER_BATCH;
    if ( is_dir( $dir ) ) {
        foreach ( (array) glob( $dir . '/*' ) as $entry ) {
            if ( ! is_string( $entry ) ) {
                continue;
            }
            foreach ( is_dir( $entry ) ? (array) glob( $entry . '/*' ) : array( $entry ) as $file ) {
                if ( $left < 1 ) {
                    return false;
                }
                if ( is_string( $file ) && is_file( $file ) ) {
                    @unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged,WordPress.WP.AlternativeFunctions.unlink_unlink -- a file of this plugin's own, which another request may have taken first.
                    $left--;
                }
            }
            if ( is_dir( $entry ) ) {
                @rmdir( $entry ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged,WordPress.WP.AlternativeFunctions.file_system_operations_rmdir -- as above.
            }
        }
        // glob() skips dot files, and the root's .htaccess would keep the folder.
        if ( is_file( $dir . '/.htaccess' ) ) {
            @unlink( $dir . '/.htaccess' ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged,WordPress.WP.AlternativeFunctions.unlink_unlink -- as above.
        }
        @rmdir( $dir ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged,WordPress.WP.AlternativeFunctions.file_system_operations_rmdir -- as above.
        clearstatcache( true, $dir );
    }
    return ! is_dir( $dir );
}

// The editor and its canvas get the rule up front; a page only once it draws an icon, through easy_svg_icon_styles_for().
function easy_svg_print_stroke_css() {
    if ( ! easy_svg_stroke_stylesheet_needed() || ! easy_svg_icon_styles_up_front() ) {
        return;
    }
    easy_svg_enqueue_stroke_css();
}

function easy_svg_print_size_css() {
    if ( ! easy_svg_icon_styles_up_front() ) {
        return;
    }
    easy_svg_enqueue_size_css();
}

// enqueue_block_assets fires on the front end as well, where a page without an icon must not get either rule.
function easy_svg_icon_styles_up_front() {
    return ! function_exists( 'is_admin' ) || is_admin();
}

// Front end and editor both, or the editor and the page disagree about what an icon looks like.
function easy_svg_enqueue_stroke_css() {
    $handle = 'easy-svg-stroke-icons';
    if ( ! function_exists( 'wp_style_is' ) || wp_style_is( $handle, 'enqueued' ) ) {
        return;
    }
    // The canvas shares the editor's registrations, so a second inline add would print the rule twice.
    if ( ! wp_style_is( $handle, 'registered' ) ) {
        // Inline rule, so it is versioned by the file it lives in.
        wp_register_style( $handle, false, array(), (string) filemtime( __FILE__ ) );
        wp_add_inline_style( $handle, easy_svg_stroke_css() );
    }
    wp_enqueue_style( $handle );
}

function easy_svg_enqueue_size_css() {
    $handle = 'easy-svg-icon-size';
    if ( ! function_exists( 'wp_style_is' ) || wp_style_is( $handle, 'enqueued' ) ) {
        return;
    }
    if ( ! wp_style_is( $handle, 'registered' ) ) {
        wp_register_style( $handle, false, array(), (string) filemtime( __FILE__ ) );
        wp_add_inline_style( $handle, easy_svg_icon_size_css() );
    }
    wp_enqueue_style( $handle );
}

// $label must already be sanitised as text. Returns a state word so each caller phrases it; the slug comes from easy_svg_add_icon_result().
/**
 * @param string $label
 * @param string $markup
 * @return string
 */
function easy_svg_add_icon( $label, $markup ) {
    return easy_svg_add_icon_result( $label, $markup )['state'];
}

// wp_insert_post() appends -2 to a taken slug, so the slug must be read off the stored post, never derived from the label.
/** @return array{state:string, id:int, slug:string, wanted?:string} */
function easy_svg_add_icon_result( $label, $markup ) {
    $refused = static function ( string $state ): array {
        return array(
            'state' => $state,
            'id'    => 0,
            'slug'  => '',
        );
    };

    $sanitizer = easy_svg_sanitizer();
    if ( null === $sanitizer ) {
        return $refused( 'no_sanitizer' );
    }

    $decision = easy_svg_accept_icon(
        $label,
        $markup,
        array( $sanitizer, 'sanitize' ),
        null,
        easy_svg_max_bytes(),
        'easy_svg_svg_too_complex'
    );

    if ( 'ok' !== $decision['state'] ) {
        return $refused( $decision['state'] );
    }

    // Slashed, because wp_insert_post() unslashes; WP_Error asked for so "Icon added." is never said about no icon.
    $id = easy_svg_without_kses(
        static fn() => wp_insert_post(
            wp_slash(
                array(
                    'post_type'    => EASY_SVG_ICON_POST_TYPE,
                    'post_status'  => 'publish',
                    'post_title'   => $label,
                    'post_name'    => $decision['slug'],
                    'post_content' => $decision['content'],
                )
            ),
            true
        )
    );

    if ( is_wp_error( $id ) || ! $id ) {
        return $refused( 'not_saved' );
    }

    // What was STORED is what the block shows: an icon stored without a drawing is not kept.
    $stored = get_post( $id );
    if ( ! $stored || false === stripos( (string) $stored->post_content, '<svg' ) ) {
        wp_delete_post( $id, true );
        return $refused( 'not_saved' );
    }

    // `wanted` beside `slug`, so a caller can say the name was taken.
    return array(
        'state'  => 'added',
        'id'     => (int) $id,
        'slug'   => (string) $stored->post_name,
        'wanted' => (string) $decision['slug'],
    );
}

// An icon switched off is kept and still drawn, only no longer offered in the editor.
const EASY_SVG_ICON_OFF_META = '_easy_svg_off';

/**
 * @param int[] $ids
 * @param bool  $off
 */
function easy_svg_switch_icons( array $ids, $off ) {
    $changed = 0;
    foreach ( array_unique( array_map( 'intval', $ids ) ) as $id ) {
        $post = $id > 0 ? get_post( $id ) : null;
        if ( ! $post || EASY_SVG_ICON_POST_TYPE !== $post->post_type ) {
            continue;
        }
        $was = '1' === (string) get_post_meta( $id, EASY_SVG_ICON_OFF_META, true );
        if ( $was === (bool) $off ) {
            continue;
        }
        if ( $off ) {
            update_post_meta( $id, EASY_SVG_ICON_OFF_META, '1' );
        } else {
            delete_post_meta( $id, EASY_SVG_ICON_OFF_META );
        }
        ++$changed;
    }
    if ( $changed ) {
        easy_svg_forget_icons();
    }
    return $changed;
}

// Filters core's listing route only: the icons stay registered, so a page already using one still renders.
function easy_svg_hide_off_icons( $response, $server = null, $request = null ) {
    if ( ! $response instanceof WP_REST_Response || ! is_object( $request ) || ! method_exists( $request, 'get_route' ) ) {
        return $response;
    }
    if ( ! preg_match( '#^/wp/v2/icons/?$#', (string) $request->get_route() ) ) {
        return $response;
    }
    $data = $response->get_data();
    if ( ! is_array( $data ) || array() === $data || array_keys( $data ) !== range( 0, count( $data ) - 1 ) ) {
        return $response;
    }
    global $wpdb;
    if ( ! isset( $wpdb ) ) {
        return $response;
    }
    // One query for the slugs: reading them per icon costs a SELECT each on a cold cache.
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- WP_Query returns IDs or whole posts with their SVG, not slugs; only on this one route.
    $off = (array) $wpdb->get_col(
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- as above; where an older checker reports the call.
        $wpdb->prepare(
            "SELECT DISTINCT p.post_name FROM {$wpdb->posts} p INNER JOIN {$wpdb->postmeta} m ON m.post_id = p.ID WHERE p.post_type = %s AND p.post_status = 'publish' AND m.meta_key = %s",
            EASY_SVG_ICON_POST_TYPE,
            EASY_SVG_ICON_OFF_META
        )
    );
    if ( array() === $off ) {
        return $response;
    }
    $names = array();
    foreach ( $off as $slug ) {
        $names[ EASY_SVG_ICON_COLLECTION . '/' . (string) $slug ] = true;
    }
    $response->set_data(
        array_values(
            array_filter(
                $data,
                static function ( $row ) use ( $names ) {
                    return ! ( is_array( $row ) && isset( $names[ (string) ( $row['name'] ?? '' ) ] ) );
                }
            )
        )
    );
    return $response;
}
