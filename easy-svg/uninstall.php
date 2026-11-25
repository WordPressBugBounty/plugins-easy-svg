<?php
// Uploaded SVGs stay: deleting a plugin must not take a site's images with it.

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

function easy_svg_uninstall_site() {
    $ids = array();
    // Bounded: a delete that keeps failing must end the loop, not the request.
    for ( $round = 0; $round < 1000; $round++ ) {
        $ids = get_posts(
            array(
                'post_type'              => 'esw_icon',
                // Every registered status: 'any' skips trash and auto-draft.
                'post_status'            => array_keys( get_post_stati() ),
                'fields'                 => 'ids',
                'posts_per_page'         => 100,
                'no_found_rows'          => true,
                'update_post_meta_cache' => false,
                'update_post_term_cache' => false,
            )
        );

        if ( array() === $ids ) {
            break;
        }

        $deleted = 0;
        foreach ( $ids as $id ) {
            if ( wp_delete_post( (int) $id, true ) ) {
                $deleted++;
            }
        }

        if ( 0 === $deleted ) {
            break;
        }
    }

    if ( array() !== $ids ) {
        // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- an uninstall has no screen; the log says what is left to remove by hand.
        error_log( sprintf( 'Easy SVG: uninstall left %d icon(s) on site %d; delete the esw_icon posts by hand', count( $ids ), get_current_blog_id() ) );
    }

    delete_transient( 'easy_svg_icons' );
    delete_transient( 'easy_svg_core_icons' );
    delete_transient( 'easy_svg_icon_listing' );
    delete_option( 'easy_svg_kept_icons' );
    delete_option( 'easy_svg_icons_version' );
    delete_option( 'easy_svg_settings' );
    delete_option( 'easy_svg_schema' );
    delete_option( 'easy_svg_icons_stroked' );
    delete_option( 'easy_svg_icon_files_guarded' );
    delete_option( 'easy_svg_blocked_swept' );
    delete_option( 'easy_svg_kept_css_retired' );

    // The drawings handed to core as files; nothing else lives in these folders.
    $uploads = wp_upload_dir( null, false );
    if ( empty( $uploads['error'] ) && ! empty( $uploads['basedir'] ) ) {
        easy_svg_uninstall_files( rtrim( (string) $uploads['basedir'], '/\\' ) . '/easy-svg-icon-files' );
        easy_svg_uninstall_files( rtrim( (string) $uploads['basedir'], '/\\' ) . '/easy-svg-kept-icons' );
    }
    if ( function_exists( 'get_temp_dir' ) && function_exists( 'wp_hash' ) ) {
        easy_svg_uninstall_files( get_temp_dir() . 'easy-svg-icon-files-' . substr( wp_hash( 'easy-svg-icon-files|' . get_current_blog_id() ), 0, 12 ) );
        // The one folder every site shared before the site id joined the name.
        easy_svg_uninstall_files( get_temp_dir() . 'easy-svg-icon-files-' . substr( wp_hash( 'easy-svg-icon-files' ), 0, 12 ) );
    }
}

function easy_svg_uninstall_files( $dir ) {
    if ( ! is_dir( $dir ) ) {
        return;
    }
    // Drawings, guards and the prepared list; the root's .htaccess by name, as glob() skips dot files.
    foreach ( array_merge( (array) glob( $dir . '/*/*' ), (array) glob( $dir . '/*' ), array( $dir . '/.htaccess' ) ) as $file ) {
        if ( is_string( $file ) && is_file( $file ) ) {
            wp_delete_file( $file );
        }
    }
    foreach ( array_merge( (array) glob( $dir . '/*', GLOB_ONLYDIR ), array( $dir ) ) as $folder ) {
        if ( is_string( $folder ) && is_dir( $folder ) ) {
            rmdir( $folder ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_rmdir -- an emptied folder of this plugin's own, at uninstall.
        }
    }
}

if ( is_multisite() ) {
    foreach ( get_sites( array( 'fields' => 'ids', 'number' => 0 ) ) as $easy_svg_site_id ) {
        switch_to_blog( (int) $easy_svg_site_id );
        try {
            easy_svg_uninstall_site();
        } catch ( \Throwable $easy_svg_error ) {
            // One site's failing hook must not keep every later site behind.
            // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- an uninstall has no screen; the log names the site to clean by hand.
            error_log( sprintf( 'Easy SVG: uninstall on site %d failed: %s', (int) $easy_svg_site_id, $easy_svg_error->getMessage() ) );
        } finally {
            restore_current_blog();
        }
    }
} else {
    easy_svg_uninstall_site();
}

// User meta and site options are the whole network's: cleared once, not per site.
delete_metadata( 'user', 0, 'easy_svg_icons_hint_dismissed', '', true );
delete_site_option( 'easy_svg_shared_icon_folder_cleaned' );
