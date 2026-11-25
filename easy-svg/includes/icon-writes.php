<?php
// Its own file so a test can load the writes without icon-manager.php, whose easy_svg_icon_page() the suite stubs.

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// kses knows no SVG and would empty an icon that already met the sanitiser; finally, so a throwing write never leaves kses off.
function easy_svg_without_kses( callable $write ) {
    $kses_was_on = false !== has_filter( 'content_save_pre', 'wp_filter_post_kses' );
    if ( $kses_was_on ) {
        kses_remove_filters();
    }

    try {
        return $write();
    } finally {
        if ( $kses_was_on ) {
            kses_init_filters();
        }
    }
}

// Null unless the id names a stored icon; every write and delete asks here first.
function easy_svg_icon_post( $id ) {
    $id   = max( 0, (int) $id );
    $post = $id > 0 ? get_post( $id ) : null;
    if ( ! $post || ! defined( 'EASY_SVG_ICON_POST_TYPE' ) || EASY_SVG_ICON_POST_TYPE !== $post->post_type ) {
        return null;
    }

    return $post;
}

// The save_post hook that drops the cache exists only while the icons feature is on; a second call is a no-op.
function easy_svg_icon_saved( $updated ) {
    if ( is_wp_error( $updated ) || ! $updated ) {
        return false;
    }

    if ( function_exists( 'easy_svg_forget_icons' ) ) {
        easy_svg_forget_icons();
    }

    return true;
}

// Never touches the slug or the title: this changes the drawing, not which icon it is.
function easy_svg_update_icon_markup( $id, $markup ) {
    $post = easy_svg_icon_post( $id );
    if ( null === $post ) {
        return 'not_found';
    }

    $markup = (string) $markup;
    if ( '' === trim( $markup ) ) {
        return 'no_markup';
    }

    $sanitizer = function_exists( 'easy_svg_sanitizer' ) ? easy_svg_sanitizer() : null;
    if ( null === $sanitizer ) {
        return 'refused';
    }

    // New bytes must meet the same sanitiser and bounds as an upload, or this becomes the way around them.
    $decision = easy_svg_accept_icon(
        (string) $post->post_title,
        $markup,
        array( $sanitizer, 'sanitize' ),
        null,
        function_exists( 'easy_svg_max_bytes' ) ? easy_svg_max_bytes() : 0,
        'easy_svg_svg_too_complex'
    );
    if ( 'ok' !== $decision['state'] ) {
        return 'refused';
    }

    $updated = easy_svg_without_kses(
        static fn() => wp_update_post(
            array(
                'ID'           => (int) $id,
                'post_content' => wp_slash( (string) $decision['content'] ),
            ),
            true
        )
    );

    return easy_svg_icon_saved( $updated ) ? 'updated' : 'failed';
}

// Never change the slug: themes and saved Icon blocks point at it, and core renders a missing icon as nothing.
function easy_svg_rename_icon( $id, $label ) {
    if ( null === easy_svg_icon_post( $id ) ) {
        return 'not_found';
    }

    // Sanitized here, not only in the REST route: kses is off below, so title_save_pre would not strip markup.
    $label = trim( sanitize_text_field( is_scalar( $label ) ? (string) $label : '' ) );
    if ( '' === $label ) {
        return 'no_label';
    }

    // wp_update_post() re-saves the whole row, and kses would strip the SVG for users without unfiltered_html.
    $updated = easy_svg_without_kses(
        static fn() => wp_update_post(
            array(
                'ID'         => (int) $id,
                'post_title' => wp_slash( $label ),
            ),
            true
        )
    );

    return easy_svg_icon_saved( $updated ) ? 'renamed' : 'failed';
}

// Where an added icon notes the transient that answers a retry of its add, so a final delete can drop that too.
const EASY_SVG_ADD_REPLAY_META = '_easy_svg_add_replay';

// Trash, restore and final delete all change what pages draw: the cached list and the file handed to core go each time.
function easy_svg_icon_left( $id ) {
    if ( function_exists( 'easy_svg_forget_icons' ) ) {
        easy_svg_forget_icons();
    }
    if ( function_exists( 'easy_svg_forget_icon_file' ) ) {
        easy_svg_forget_icon_file( (int) $id );
    }
    // WordPress does not drop its cached counts on a final delete; with a persistent cache the trash count would stay.
    if ( function_exists( 'wp_cache_delete' ) && function_exists( '_count_posts_cache_key' ) && defined( 'EASY_SVG_ICON_POST_TYPE' ) ) {
        wp_cache_delete( _count_posts_cache_key( EASY_SVG_ICON_POST_TYPE ), 'counts' );
    }
}

// WordPress renames a trashed post and parks the address it had in meta.
function easy_svg_trashed_icon_slug( $post ) {
    $wanted = (string) get_post_meta( (int) $post->ID, '_wp_desired_post_slug', true );
    return '' !== $wanted ? $wanted : (string) preg_replace( '/__trashed$/', '', (string) $post->post_name );
}

// wp_trash_post() saves the whole row again, so kses is off as for a rename; a site that keeps no trash deletes at once.
/** @return string trashed, deleted, not_found or failed. */
function easy_svg_trash_icon( $id ) {
    $post = easy_svg_icon_post( $id );
    if ( null === $post ) {
        return 'not_found';
    }
    if ( 'trash' === ( $post->post_status ?? '' ) ) {
        return 'trashed';
    }

    if ( ! easy_svg_without_kses( static fn() => wp_trash_post( (int) $id ) ) ) {
        return 'failed';
    }
    easy_svg_icon_left( $id );

    return null === easy_svg_icon_post( $id ) ? 'deleted' : 'trashed';
}

// `wanted` beside `slug`: the old address may be taken meanwhile, and WordPress then hands out the next free one.
/** @return array{state:string, id:int, slug:string, wanted:string} */
function easy_svg_restore_icon( $id ) {
    $post = easy_svg_icon_post( $id );
    // not_found: no such icon any more. not_trashed: it is there, and not in the trash.
    $out  = array(
        'state'  => null === $post ? 'not_found' : 'not_trashed',
        'id'     => max( 0, (int) $id ),
        'slug'   => '',
        'wanted' => '',
    );
    if ( null === $post || 'trash' !== ( $post->post_status ?? '' ) ) {
        return $out;
    }
    $out['wanted'] = easy_svg_trashed_icon_slug( $post );

    $done = easy_svg_without_kses( static fn() => wp_untrash_post( (int) $id ) );
    $back = easy_svg_icon_post( $id );
    if ( ! $done || null === $back || 'trash' === ( $back->post_status ?? '' ) ) {
        $out['state'] = 'failed';
        return $out;
    }
    easy_svg_icon_left( $id );

    $out['state'] = 'restored';
    $out['slug']  = (string) $back->post_name;
    return $out;
}

// Only out of the trash: a listed icon goes there first, so one wrong id never deletes for good.
/** @return string purged, not_found or failed. */
function easy_svg_purge_icon( $id ) {
    $post = easy_svg_icon_post( $id );
    if ( null === $post || 'trash' !== ( $post->post_status ?? '' ) ) {
        return 'not_found';
    }

    // Revisions and autosaves only, which hold the drawing; any other child is not this plugin's to delete.
    global $wpdb;
    if ( isset( $wpdb ) ) {
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- get_posts() leaves revisions out of 'any'; asked once per final delete.
        $revisions = (array) $wpdb->get_col( $wpdb->prepare( "SELECT ID FROM {$wpdb->posts} WHERE post_parent = %d AND post_type = 'revision' LIMIT 500", (int) $id ) );
        foreach ( $revisions as $revision ) {
            wp_delete_post( (int) $revision, true );
        }
    }

    // The row, its meta and its comments go with wp_delete_post(); everything else in easy_svg_forget_deleted_icon().
    return wp_delete_post( (int) $id, true ) ? 'purged' : 'failed';
}

// before_delete_post still sees the meta: which transient answers a retry of the icon's add is kept until the row is gone.
function easy_svg_note_deleted_icon( $post_id, $post = null ) {
    static $noted = array();
    if ( null === $post ) {
        $key = (string) ( $noted[ (int) $post_id ] ?? '' );
        unset( $noted[ (int) $post_id ] );
        return $key;
    }
    if ( null !== easy_svg_icon_post( $post_id ) ) {
        $noted[ (int) $post_id ] = (string) get_post_meta( (int) $post_id, EASY_SVG_ADD_REPLAY_META, true );
    }
    return '';
}

// Every final delete ends here, whoever asked: the purge route, WordPress emptying the trash, WP-CLI, a site without a trash.
/**
 * @param int         $post_id
 * @param object|null $post The hook hands over whatever it has, not always a WP_Post.
 */
function easy_svg_forget_deleted_icon( $post_id, $post = null ) {
    if ( ! is_object( $post ) || ! defined( 'EASY_SVG_ICON_POST_TYPE' ) || EASY_SVG_ICON_POST_TYPE !== ( $post->post_type ?? '' ) ) {
        return;
    }
    easy_svg_icon_left( $post_id );
    if ( function_exists( 'easy_svg_purge_icon_files' ) ) {
        easy_svg_purge_icon_files( $post_id );
    }
    if ( function_exists( 'easy_svg_forget_core_icon' ) ) {
        easy_svg_forget_core_icon( (string) ( $post->post_content ?? '' ) );
    }
    // The answer kept for a retried add names the icon.
    $replay = easy_svg_note_deleted_icon( $post_id );
    if ( 0 === strpos( $replay, 'easy_svg_add_' ) ) {
        delete_transient( $replay );
    }
}

// WordPress restores to draft, and a draft icon draws nothing; an icon comes back as what it was, and other post types keep core's answer.
function easy_svg_untrash_icon_status( $status, $post_id = 0, $previous = '' ) {
    if ( null === easy_svg_icon_post( $post_id ) || '' === (string) $previous ) {
        return $status;
    }
    return (string) $previous;
}
