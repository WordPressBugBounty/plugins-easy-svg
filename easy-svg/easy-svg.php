<?php
/*
Plugin Name:  Easy SVG
Plugin URI:   https://wordpress.org/plugins/easy-svg/
Description:  Add SVG support for WordPress.
Version:      5.0.1
Author:       UnleashWP
Author URI:   https://www.unleash-wp.com
Requires PHP: 8.0
Requires at least: 6.6
Text Domain:  easy-svg
Domain Path:  /languages
License:      GPL-3.0-or-later
License URI:  https://www.gnu.org/licenses/gpl-3.0.html

Easy SVG is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Easy SVG is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Easy SVG. If not, see license.txt or
https://www.gnu.org/licenses/gpl-3.0.html.

Copyright (C) 2017-2026 UnleashWP.
*/

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// No variable here: this file runs in the global scope.
if ( file_exists( __DIR__ . '/vendor/autoload.php' ) ) {
    require __DIR__ . '/vendor/autoload.php';
}

// Site snippets still call methods on this 4.1 global; never replace one that already exists.
if ( class_exists( '\enshrined\svgSanitize\Sanitizer' ) && ! isset( $GLOBALS['sanitizer'] ) ) {
    // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound -- the 4.1 name, kept for site snippets.
    $GLOBALS['sanitizer'] = new \enshrined\svgSanitize\Sanitizer();
}

// Without vendor/ the parent classes are missing; easy_svg_sanitizer() then answers null instead of a fatal.
if ( class_exists( '\enshrined\svgSanitize\data\AllowedTags' ) && class_exists( '\enshrined\svgSanitize\data\AllowedAttributes' ) ) {
    class esw_svg_tags extends \enshrined\svgSanitize\data\AllowedTags {

        /** @return array */
        public static function getTags() {
            // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- a public filter for years; renaming it would silently drop every site's own rules.
            $tags = apply_filters( 'esw_svg_allowed_tags', parent::getTags() );
            // A filter that returns no list must not take down every upload.
            return is_array( $tags ) ? array_values( array_filter( $tags, 'is_string' ) ) : parent::getTags();
        }
    }

    class esw_svg_attributes extends \enshrined\svgSanitize\data\AllowedAttributes {

        /** @return array */
        public static function getAttributes() {
            // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- a public filter for years; renaming it would silently drop every site's own rules.
            $attributes = apply_filters( 'esw_svg_allowed_attributes', parent::getAttributes() );
            return is_array( $attributes ) ? array_values( array_filter( $attributes, 'is_string' ) ) : parent::getAttributes();
        }
    }
}

// Add-on contract for easy_svg_sanitizer() and the full inline hardening; 1 is the first released shape, bump it only when either changes.
define( 'EASY_SVG_API', 1 );

// Panel contract; a number of its own because a filter cannot be probed for.
define( 'EASY_SVG_PANEL_API', 1 );

// Icon contract: easy_svg_registrable_icons, easy_svg_rename_icon() and easy_svg_update_icon_markup().
define( 'EASY_SVG_ICONS_API', 1 );

// UI kit contract: the easy-svg-ui script and its window.EasySvgUi, whose `api` says the same number.
define( 'EASY_SVG_UI_API', 1 );

require_once __DIR__ . '/includes/settings.php';
require_once __DIR__ . '/includes/icons-hint.php';
require_once __DIR__ . '/includes/review-stars.php';
require_once __DIR__ . '/includes/details-banner.php';

// A fixed DoS bound on DOM parsing, not an upload policy; easy_svg_svg_too_complex() bounds the work.
function easy_svg_max_bytes() {
    $bytes = min( 2 * MB_IN_BYTES, (int) wp_max_upload_size() );
    // Zero or less read as "no limit" in some callers and "refuse all" in others.
    return max( 1, (int) apply_filters( 'easy_svg_max_bytes', $bytes ) );
}

// The library's cost grows with nested PHP tags and <use>, so a small file can tie up a worker for minutes.
function easy_svg_svg_too_complex( $markup ) {
    $markup   = (string) $markup;
    $php_tags = substr_count( $markup, '<' . '?' );
    $use_tags = substr_count( strtolower( $markup ), '<use' );
    $max_php  = (int) apply_filters( 'easy_svg_max_php_tags', 10 );
    $max_use  = (int) apply_filters( 'easy_svg_max_use_tags', 1000 );
    return $php_tags > $max_php || $use_tags > $max_use;
}

// Never throws: it runs in media listings and metadata, where a fatal breaks the screen.
/** @return array{width:int,height:int}|array{} */
function easy_svg_read_svg_dimensions( $path ) {
    if ( ! is_string( $path ) || '' === $path || ! is_file( $path ) || ! class_exists( 'SimpleXMLElement' ) ) {
        return array();
    }
    if ( filesize( $path ) > easy_svg_max_bytes() ) {
        return array();
    }
    $internal = libxml_use_internal_errors( true );
    try {
        $svg    = new SimpleXMLElement( (string) file_get_contents( $path ) );
        $width  = str_contains( (string) $svg['width'], '%' ) ? 0 : (int) round( (float) $svg['width'] );
        $height = str_contains( (string) $svg['height'], '%' ) ? 0 : (int) round( (float) $svg['height'] );

        // Most icon exports carry only a viewBox; a 0x0 size breaks the Image block.
        if ( $width < 1 || $height < 1 ) {
            $box = preg_split( '/[\s,]+/', trim( (string) $svg['viewBox'] ) );
            if ( is_array( $box ) && 4 === count( $box ) ) {
                $width  = (int) round( (float) $box[2] );
                $height = (int) round( (float) $box[3] );
            }
        }

        if ( $width < 1 || $height < 1 ) {
            return array();
        }
        return array( 'width' => $width, 'height' => $height );
    } catch ( \Throwable $e ) {
        return array();
    } finally {
        libxml_clear_errors();
        libxml_use_internal_errors( $internal );
    }
}

// The sanitiser never reads attributeName, so a widened allow-list lets animate set an href; its name is matched in any case or prefix.
function easy_svg_neutralize_href_animation( $markup ) {
    static $animation = array( 'animate', 'set', 'animatecolor', 'animatemotion', 'animatetransform' );

    $doc      = new DOMDocument();
    $internal = libxml_use_internal_errors( true );
    $loaded   = $doc->loadXML( (string) $markup, LIBXML_NONET );
    libxml_clear_errors();
    libxml_use_internal_errors( $internal );

    if ( ! $loaded || null === $doc->documentElement ) {
        return '';
    }

    $xpath  = new DOMXPath( $doc );
    $doomed = array();
    foreach ( $xpath->query( '//*' ) as $element ) {
        // DOMXPath types its results as DOMNode only.
        if ( ! $element instanceof DOMElement ) {
            continue;
        }
        if ( ! in_array( strtolower( $element->localName ), $animation, true ) ) {
            continue;
        }
        foreach ( $element->attributes as $attr ) {
            if ( 'attributename' !== strtolower( (string) $attr->localName ) ) {
                continue;
            }
            $target = strtolower( trim( (string) $attr->value ) );
            $target = substr( $target, (int) strrpos( ':' . $target, ':' ) );
            if ( 'href' === $target || 0 === strpos( $target, 'on' ) ) {
                $doomed[] = $element;
                break;
            }
        }
    }
    foreach ( $doomed as $element ) {
        if ( $element->parentNode ) {
            $element->parentNode->removeChild( $element );
        }
    }

    return (string) $doc->saveXML( $doc->documentElement );
}

// Old IE's behavior, expression() and Firefox's -moz-binding run code, a url() may name a script or data; a CSS escape or a comment may hide any.
function easy_svg_strip_css_bindings( $css ) {
    $css = (string) preg_replace( '#/\*.*?\*/#s', '', (string) $css );
    $out = '';
    $len = strlen( $css );
    $at  = 0;
    // Split at ; { } outside quotes and brackets, at any depth; an unclosed one runs to the end and is judged whole.
    while ( $at < $len ) {
        $depth = 0;
        $quote = '';
        for ( $end = $at; $end < $len; $end++ ) {
            $c = $css[ $end ];
            if ( '\\' === $c ) {
                ++$end;
            } elseif ( '' !== $quote ) {
                $quote = $c === $quote ? '' : $quote;
            } elseif ( '"' === $c || "'" === $c ) {
                $quote = $c;
            } elseif ( '(' === $c ) {
                ++$depth;
            } elseif ( ')' === $c ) {
                $depth = max( 0, $depth - 1 );
            } elseif ( 0 === $depth && false !== strpos( ';{}', $c ) ) {
                break;
            }
        }
        $part  = substr( $css, $at, min( $end, $len ) - $at );
        $delim = $end < $len ? $css[ $end ] : '';
        $at    = $end + 1;
        // A selector or at-rule prelude ends in {; everything else is a declaration.
        if ( '{' === $delim || easy_svg_css_declaration_is_safe( $part ) ) {
            $out .= $part . $delim;
        } elseif ( '}' === $delim ) {
            $out .= $delim;
        }
    }
    return $out;
}

function easy_svg_css_declaration_is_safe( $part ) {
    $plain = easy_svg_css_unescape( $part );
    $colon = strpos( $plain, ':' );
    $name  = false === $colon ? '' : strtolower( ltrim( trim( substr( $plain, 0, $colon ) ), '*_' ) );
    if ( in_array( $name, array( 'behavior', '-ms-behavior', '-moz-binding' ), true ) ) {
        return false;
    }
    // Quoted text is no call, so content:"expression(x)" stays.
    $calls = (string) preg_replace( '/"[^"]*"|\'[^\']*\'/', '', $plain );
    if ( preg_match( '/(?<![\w-])expression\s*(?:\(|$)/i', $calls ) ) {
        return false;
    }
    // A url() points into the file, at a relative path or over http(s); any other scheme goes. Browsers skip whitespace inside one.
    preg_match_all( '/url\s*\(\s*(?:"([^"]*)"|\'([^\']*)\'|([^)]*))/i', $plain, $urls, PREG_SET_ORDER );
    foreach ( $urls as $url ) {
        $target = (string) preg_replace( '/[\s\x00-\x1f]+/', '', implode( '', array_slice( $url, 1 ) ) );
        if ( preg_match( '/^[a-z][a-z0-9+.-]*:/i', $target ) && ! preg_match( '/^https?:/i', $target ) ) {
            return false;
        }
    }
    return true;
}

function easy_svg_css_unescape( $css ) {
    return (string) preg_replace_callback(
        '/\\\\([0-9a-f]{1,6})\s?|\\\\(.)/i',
        // Only ASCII spells what is looked for, so a site without mbstring loses nothing here.
        static fn( $e ) => '' !== $e[1] ? ( hexdec( $e[1] ) < 128 ? chr( (int) hexdec( $e[1] ) ) : '?' ) : $e[2],
        (string) $css
    );
}

// Every style attribute and style block of a cleaned file, through easy_svg_strip_css_bindings().
function easy_svg_strip_style_bindings( $markup ) {
    $doc      = new DOMDocument();
    $internal = libxml_use_internal_errors( true );
    $loaded   = $doc->loadXML( (string) $markup, LIBXML_NONET );
    libxml_clear_errors();
    libxml_use_internal_errors( $internal );
    if ( ! $loaded || null === $doc->documentElement ) {
        return '';
    }
    foreach ( ( new DOMXPath( $doc ) )->query( '//*' ) as $element ) {
        if ( ! $element instanceof DOMElement ) {
            continue;
        }
        foreach ( $element->attributes as $attr ) {
            if ( 'style' === strtolower( (string) $attr->localName ) ) {
                $attr->value = easy_svg_strip_css_bindings( (string) $attr->value );
            }
        }
        if ( 'style' === strtolower( (string) $element->localName ) ) {
            foreach ( iterator_to_array( $element->childNodes ) as $text ) {
                if ( $text instanceof DOMText ) {
                    $text->data = easy_svg_strip_css_bindings( $text->data );
                }
            }
        }
    }
    return (string) $doc->saveXML( $doc->documentElement );
}

// The public surface for add-ons, never the esw_svg_* classes: it carries this site's filtered allow-list.
/** @return \enshrined\svgSanitize\Sanitizer|null */
function easy_svg_sanitizer() {
    // An older copy another plugin loaded first lacks the advisory fixes: no sanitiser beats a weak one.
    if ( ! easy_svg_sanitizer_is_current() || ! class_exists( 'esw_svg_tags' ) ) {
        return null;
    }

    // A new copy per call, so one caller's settings never decide what another strips.
    $legacy    = isset( $GLOBALS['sanitizer'] ) ? $GLOBALS['sanitizer'] : null;
    $sanitizer = $legacy instanceof \enshrined\svgSanitize\Sanitizer
        ? clone $legacy
        : new \enshrined\svgSanitize\Sanitizer();

    $sanitizer->setAllowedTags( new esw_svg_tags() );
    $sanitizer->setAllowedAttrs( new esw_svg_attributes() );

    // The filter decides, not the copied global: the library cannot tell a deliberate false from its default.
    $sanitizer->removeRemoteReferences(
        // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- a public filter for years; renaming it would silently drop every site's own rules.
        (bool) apply_filters( 'esw_svg_remove_remote_references', true )
    );

    return $sanitizer;
}

// The first autoloader wins, so another plugin's older copy can answer; prepareForParsing() exists from 1.1.1.
function easy_svg_sanitizer_is_current( $class = '\\enshrined\\svgSanitize\\Sanitizer' ) {
    return class_exists( $class ) && method_exists( $class, 'prepareForParsing' );
}

function easy_svg_outdated_sanitizer_message( $class = '\\enshrined\\svgSanitize\\Sanitizer' ) {
    if ( ! class_exists( $class ) || easy_svg_sanitizer_is_current( $class ) ) {
        return '';
    }

    $reflection = new ReflectionClass( $class );
    $source     = (string) $reflection->getFileName();
    if ( defined( 'WP_CONTENT_DIR' ) && 0 === strpos( $source, WP_CONTENT_DIR ) ) {
        $source = 'wp-content' . substr( $source, strlen( WP_CONTENT_DIR ) );
    }

    return sprintf(
        /* translators: %s: path of the file the older sanitizer was loaded from */
        __( 'Easy SVG: another plugin loads an older SVG check (%s), so SVG uploads are blocked. Update or deactivate that plugin.', 'easy-svg' ),
        $source
    );
}

function easy_svg_outdated_sanitizer_notice() {
    if ( ! current_user_can( 'activate_plugins' ) ) {
        return;
    }

    $screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
    if ( ! $screen || ! in_array( $screen->id, array( 'dashboard', 'plugins', 'upload' ), true ) ) {
        return;
    }

    $message = easy_svg_outdated_sanitizer_message();
    if ( '' !== $message ) {
        echo '<div class="notice notice-warning"><p>' . esc_html( $message ) . '</p></div>';
    }
}
add_action( 'admin_notices', 'easy_svg_outdated_sanitizer_notice' );

// Every way bytes arrive meets the same bounds (size is not cost), the sanitiser and the href animation pass; '' is a refusal.
function easy_svg_clean_markup( $markup ) {
    $markup    = (string) $markup;
    $sanitizer = easy_svg_sanitizer();

    if ( null === $sanitizer || strlen( $markup ) > easy_svg_max_bytes() || easy_svg_svg_too_complex( $markup ) ) {
        return '';
    }

    // The library throws without exactly one <svg> root and returns '' for input like "0": a refusal, never a fatal or an empty file.
    try {
        $clean = $sanitizer->sanitize( $markup );
    } catch ( \Throwable $e ) {
        return '';
    }

    if ( ! is_string( $clean ) || '' === trim( $clean ) ) {
        return '';
    }

    // The quick match keeps ordinary uploads off the DOM round-trip; it allows a prefix so <s:animate> is caught too.
    if ( preg_match( '/<(?:[a-z][\w.-]*:)?(?:animate[a-z]*|set)[\s\/>]/i', $clean ) ) {
        $neutralized = easy_svg_neutralize_href_animation( $clean );
        if ( '' === trim( $neutralized ) ) {
            return '';
        }
        $clean = $neutralized;
    }

    // Only a file that names one of them, or escapes a character somewhere, takes the DOM round-trip.
    if ( preg_match( '/behavior|binding|expression|javascript|url\s*\(\s*(?![\'"]?\s*#)|\/\*|\\\\/i', $clean ) ) {
        $clean = easy_svg_strip_style_bindings( $clean );
        if ( '' === trim( $clean ) ) {
            return '';
        }
    }

    return $clean;
}

// The seven 4.1 esw_ functions: sites hook and call them, so never rename them.
// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- a public name for years; sites and other plugins call it.
function esw_svg_file_checker( $file ) {
    // Checked on disk first: reading a huge file is the cost the cap exists to refuse.
    if ( is_file( $file ) && filesize( $file ) > easy_svg_max_bytes() ) {
        return false;
    }

    $unclean = file_get_contents( $file );
    $clean   = false === $unclean ? '' : easy_svg_clean_markup( $unclean );
    if ( '' === $clean ) {
        return false;
    }

    // If the cleaned bytes cannot be written back, the file on disk is the one that came in and must not be stored.
    if ( false === file_put_contents( $file, $clean ) ) {
        return false;
    }

    return true;
}

function easy_svg_is_svg_name( $name ) {
    return 'svg' === strtolower( (string) pathinfo( (string) $name, PATHINFO_EXTENSION ) );
}

// Cheap and without reading image headers: name, mapped type, claimed type, or markup at the start of the file.
function easy_svg_may_be_svg( $file ) {
    if ( easy_svg_is_svg_name( $file['name'] ) ) {
        return true;
    }
    $by_name = wp_check_filetype( $file['name'], get_allowed_mime_types() );
    $claimed = isset( $file['type'] ) ? strtolower( trim( (string) $file['type'] ) ) : '';
    if ( 'image/svg+xml' === strtolower( (string) $by_name['type'] ) || 'image/svg+xml' === $claimed ) {
        return true;
    }
    if ( ! is_file( $file['tmp_name'] ) || ! is_readable( $file['tmp_name'] ) ) {
        return false;
    }
    $head = file_get_contents( $file['tmp_name'], false, null, 0, 4096 );
    return is_string( $head ) && 1 === preg_match( '/<svg|<\?xml|<!doctype/i', $head );
}

// The client's MIME header is never trusted: an SVG by extension or by wp_check_filetype_and_ext() is sanitised or refused, never kept as it came.
// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- a public name for years; sites and other plugins call it.
function esw_svg_upload_filter_check_init( $file ) {

    if ( empty( $file['tmp_name'] ) || empty( $file['name'] ) ) {
        return $file;
    }

    // Core checks every other file itself; checking it here too repeats its notices.
    if ( ! easy_svg_may_be_svg( $file ) ) {
        return $file;
    }

    $checked = wp_check_filetype_and_ext(
        $file['tmp_name'],
        $file['name'],
        get_allowed_mime_types()
    );

    $type = isset( $checked['type'] ) ? strtolower( (string) $checked['type'] ) : '';

    $name_is_svg = easy_svg_is_svg_name( $file['name'] );
    $type_is_svg = 'image/svg+xml' === $type;

    if ( ! $name_is_svg && ! $type_is_svg ) {
        return $file;
    }

    if ( ! $type_is_svg ) {
        $file['error'] = __( 'Sorry, this SVG file is not allowed for security reasons.', 'easy-svg' );
        return $file;
    }

    $file['type'] = 'image/svg+xml';

    if ( ! esw_svg_file_checker( $file['tmp_name'] ) ) {
        $file['error'] = __( 'This SVG could not be read. Open it in a graphics program and save it again.', 'easy-svg' );
    }

    return $file;
}
add_filter( 'wp_handle_upload_prefilter', 'esw_svg_upload_filter_check_init' );

// Sideloads, WP-CLI and importers; tmp_name is always a temporary copy, so sanitising in place is safe.
add_filter( 'wp_handle_sideload_prefilter', 'esw_svg_upload_filter_check_init' );

// Compared by structure: the sanitiser re-serialises every file, so bytes never match even when nothing was removed.
function easy_svg_markup_is_clean( $markup ) {
    $markup = (string) $markup;

    // A doctype, control characters and trailing content are invisible to the structural comparison.
    if ( false !== stripos( $markup, '<!DOCTYPE' ) ) {
        return false;
    }
    if ( 1 === preg_match( '/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $markup ) ) {
        return false;
    }
    if ( '>' !== substr( rtrim( $markup ), -1 ) ) {
        return false;
    }

    // The upload path's own pipeline, since XML-RPC uploads reach this: what it would change or remove is not clean.
    $clean = easy_svg_clean_markup( $markup );
    if ( '' === $clean ) {
        return false;
    }

    $fingerprint = static function ( $xml ) {
        $doc = easy_svg_load_svg( $xml );
        if ( null === $doc || null !== $doc->doctype ) {
            return null;
        }
        $parts = array();
        $xpath = new DOMXPath( $doc );
        foreach ( $xpath->query( '//*' ) as $element ) {
            $attrs = array();
            foreach ( $element->attributes as $attr ) {
                $attrs[] = $attr->nodeName . '=' . $attr->nodeValue;
            }
            sort( $attrs );
            $parts[] = $element->nodeName . '[' . implode( ' ', $attrs ) . ']';
        }
        $parts[] = 'pi:' . $xpath->query( '//processing-instruction()' )->length;
        $parts[] = 'text:' . preg_replace( '/\s+/', ' ', trim( $doc->documentElement->textContent ) );
        return implode( "\n", $parts );
    };

    $before = $fingerprint( $markup );

    return null !== $before && $before === $fingerprint( $clean );
}

// This filter can only refuse bytes, so an SVG passes only when already clean; importers fill empty bits later.
/** @return array|string */
function easy_svg_upload_bits_check( $upload ) {
    if ( ! is_array( $upload ) || empty( $upload['name'] ) || ! easy_svg_is_svg_name( $upload['name'] ) ) {
        return $upload;
    }

    if ( ! isset( $upload['bits'] ) || '' === (string) $upload['bits'] ) {
        return $upload;
    }

    if ( easy_svg_markup_is_clean( (string) $upload['bits'] ) ) {
        return $upload;
    }

    return __( 'This SVG file contains content this site does not allow. Please upload it through the media library, which cleans it.', 'easy-svg' );
}
add_filter( 'wp_upload_bits', 'easy_svg_upload_bits_check' );

// A file nobody could clean must not stay reachable, so it is deleted; offloaded media has nothing here to clean.
function easy_svg_attachment_check( $attachment_id ) {
    $path = get_attached_file( $attachment_id );
    $mime = strtolower( (string) get_post_mime_type( $attachment_id ) );

    if ( ! is_string( $path ) || '' === $path ) {
        return;
    }

    if ( 'image/svg+xml' !== $mime && ! easy_svg_is_svg_name( $path ) ) {
        return;
    }

    if ( ! is_file( $path ) || ! is_readable( $path ) ) {
        return;
    }

    if ( ! easy_svg_path_in_uploads( $path ) ) {
        return;
    }

    if ( ! esw_svg_file_checker( $path ) ) {
        $reason = easy_svg_attachment_refusal( $path );
        // Any name left under uploads stays reachable and a browser may sniff it, so a refused file is never kept.
        wp_delete_attachment( $attachment_id, true );
        if ( file_exists( $path ) ) {
            wp_delete_file( $path );
        }
        $gone = ! file_exists( $path );
        // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- a background safety net has no screen to report to.
        error_log( sprintf( 'Easy SVG: removed attachment %d (%s): %s; %s', (int) $attachment_id, basename( $path ), $reason, $gone ? 'the file was deleted' : 'the file could not be deleted' ) );
    }
}

// Pre-release builds kept refused files as name.svg.blocked, which Apache still serves as SVG. A bounded walk per site, once.
const EASY_SVG_BLOCKED_SWEPT           = 'easy_svg_blocked_swept';
const EASY_SVG_BLOCKED_SWEEP_MAX_FILES = 50000;
const EASY_SVG_BLOCKED_SWEEP_SECONDS   = 5;

// Those builds ran in November 2026; its leftovers sit in the month folder of their upload, so recent months go first.
function easy_svg_sweep_blocked_roots( $base, $now ) {
    $roots = array();
    for ( $back = 0; $back < 3; $back++ ) {
        $roots[] = $base . '/' . gmdate( 'Y/m', (int) strtotime( "-{$back} month", (int) gmmktime( 0, 0, 0, (int) gmdate( 'n', $now ), 1, (int) gmdate( 'Y', $now ) ) ) );
    }
    $roots[] = $base;
    return $roots;
}

/**
 * @param string[] $roots
 * @return array{deleted:int,visited:int,complete:bool}
 */
function easy_svg_sweep_blocked_leftovers( $roots, $max, $deadline ) {
    $out = array( 'deleted' => 0, 'visited' => 0, 'complete' => true );
    // The main site of a network holds every other site's uploads under sites/; each site sweeps its own.
    $skip = is_multisite() && is_main_site() ? array( 'sites', 'blogs.dir' ) : array();
    foreach ( $roots as $root ) {
        if ( ! is_dir( $root ) ) {
            continue;
        }
        $top  = rtrim( $root, '/\\' );
        $tree = new RecursiveCallbackFilterIterator(
            new RecursiveDirectoryIterator( $top, FilesystemIterator::SKIP_DOTS ),
            static function ( $entry ) use ( $skip, $top ) {
                return ! ( $entry->isDir() && dirname( $entry->getPathname() ) === $top && in_array( $entry->getFilename(), $skip, true ) );
            }
        );
        foreach ( new RecursiveIteratorIterator( $tree, RecursiveIteratorIterator::LEAVES_ONLY, RecursiveIteratorIterator::CATCH_GET_CHILD ) as $file ) {
            if ( $out['visited'] >= $max || ( $deadline > 0 && microtime( true ) > $deadline ) ) {
                $out['complete'] = false;
                return $out;
            }
            ++$out['visited'];
            // The name first: on NFS or a stream wrapper every stat is a round trip.
            if ( ! str_ends_with( strtolower( $file->getFilename() ), '.svg.blocked' ) || ! $file->isFile() ) {
                continue;
            }
            wp_delete_file( $file->getPathname() );
            if ( ! file_exists( $file->getPathname() ) ) {
                ++$out['deleted'];
            }
        }
    }
    return $out;
}

function easy_svg_sweep_blocked_once() {
    // An admin's page load only: admin_init also runs for admin-ajax.php, the heartbeat of every open tab.
    if ( get_option( EASY_SVG_BLOCKED_SWEPT ) || ! current_user_can( 'manage_options' ) || wp_doing_ajax() ) {
        return null;
    }
    // add_option() inserts or fails, so two first requests do not both walk; marked before the walk, a timeout cannot repeat it.
    if ( ! add_option( EASY_SVG_BLOCKED_SWEPT, 1, '', false ) ) {
        return null;
    }
    $uploads = wp_upload_dir( null, false );
    $base    = empty( $uploads['error'] ) ? (string) ( $uploads['basedir'] ?? '' ) : '';
    if ( '' === $base || wp_is_stream( $base ) ) {
        return null;
    }
    $swept = easy_svg_sweep_blocked_leftovers( easy_svg_sweep_blocked_roots( $base, time() ), EASY_SVG_BLOCKED_SWEEP_MAX_FILES, microtime( true ) + EASY_SVG_BLOCKED_SWEEP_SECONDS );
    if ( $swept['deleted'] > 0 || ! $swept['complete'] ) {
        // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- a background safety net has no screen to report to.
        error_log( sprintf( 'Easy SVG: deleted %d file(s) named *.svg.blocked from uploads%s', $swept['deleted'], $swept['complete'] ? '' : '; stopped after ' . $swept['visited'] . ' files, search the rest by hand' ) );
    }
    return $swept;
}
add_action( 'admin_init', 'easy_svg_sweep_blocked_once' );

// Words for the log only, so a refusal is never mistaken for a too-large file.
function easy_svg_attachment_refusal( $path ) {
    if ( null === easy_svg_sanitizer() ) {
        return 'no current sanitizer is loaded';
    }
    if ( filesize( $path ) > easy_svg_max_bytes() ) {
        return 'too large to read safely';
    }
    return 'the sanitizer refused it, it is too complex, or the cleaned file could not be written';
}
add_action( 'add_attachment', 'easy_svg_attachment_check' );

// Core computes no SVG dimensions, so the Image block would render without width/height and jump on load.
function easy_svg_svg_attachment_metadata( $metadata, $attachment_id ) {
    $mime = strtolower( (string) get_post_mime_type( $attachment_id ) );
    $path = get_attached_file( $attachment_id );

    if ( 'image/svg+xml' !== $mime && ! easy_svg_is_svg_name( (string) $path ) ) {
        return $metadata;
    }

    $metadata = is_array( $metadata ) ? $metadata : array();
    $dim      = easy_svg_read_svg_dimensions( $path );
    if ( array() !== $dim ) {
        $metadata['width']  = $dim['width'];
        $metadata['height'] = $dim['height'];
    }

    // Core reads both keys after upload; missing ones print warnings into the REST JSON.
    return $metadata + array( 'width' => 0, 'height' => 0 );
}
add_filter( 'wp_generate_attachment_metadata', 'easy_svg_svg_attachment_metadata', 10, 2 );

// Not admin-only: the Icon block is server-rendered, so visitors need the icons registered too.
require_once __DIR__ . '/includes/icon-writes.php';
require_once __DIR__ . '/includes/icon-manager.php';

// Loaded last so the functions the panel wraps are defined.
require_once __DIR__ . '/includes/panel.php';
require_once __DIR__ . '/includes/support.php';

// The bundled /languages catalogue is read only if loaded here; ours goes second, so it sits under a wordpress.org pack.
function easy_svg_load_textdomain(): void {
    // phpcs:ignore PluginCheck.CodeAnalysis.DiscouragedFunctions.load_plugin_textdomainFound -- the bundled de_DE catalogue also stands in for the other German locales; see easy_svg_german_fallback().
    load_plugin_textdomain( 'easy-svg', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );

    $locale = determine_locale();
    $mofile = __DIR__ . '/languages/easy-svg-' . $locale . '.mo';
    if ( is_readable( $mofile ) ) {
        load_textdomain( 'easy-svg', $mofile, $locale );
    }
}
add_action( 'init', 'easy_svg_load_textdomain', 1 );

// Only de_DE ships; a de_AT, de_CH or formal site whose file is missing reads it instead of falling back to English.
function easy_svg_german_fallback( string $file, string $handle_or_domain, string $domain = '' ): string {
    $domain = '' === $domain ? $handle_or_domain : $domain;
    if ( 'easy-svg' !== $domain || is_readable( $file ) ) {
        return $file;
    }
    $german = preg_replace( '/(\/easy-svg-)de_[A-Za-z_]+((?:-[0-9a-f]{32}\.json|\.mo)$)/', '$1de_DE$2', $file );
    return is_string( $german ) && $german !== $file && is_readable( $german ) ? $german : $file;
}
add_filter( 'load_textdomain_mofile', 'easy_svg_german_fallback', 10, 2 );
add_filter( 'load_script_translation_file', 'easy_svg_german_fallback', 10, 3 );

add_action( 'enqueue_block_editor_assets', 'easy_svg_enqueue_icon_block_notice' );

add_action( 'enqueue_block_editor_assets', 'easy_svg_print_stroke_css', 20 );
// The editor canvas is an iframe, and only this hook reaches it; the Icon block draws through core, so its output is read.
add_action( 'enqueue_block_assets', 'easy_svg_print_stroke_css', 20 );
add_action( 'enqueue_block_assets', 'easy_svg_print_size_css', 20 );
add_filter( 'render_block', 'easy_svg_icon_styles_for', 20 );

// Outside the switch: a published page keeps what an add-on left, whatever this screen shows.
add_action( 'init', 'easy_svg_boot_kept_icons', 20 );
add_action( 'init', 'easy_svg_icon_shortcode_fallback', 20 );
add_action( 'wp_enqueue_scripts', 'easy_svg_print_kept_icon_css', 20 );
add_action( 'plugins_loaded', 'easy_svg_load_kept_fallbacks', 20 );

// Outside the switch: with the manager off it still registers the type, locked, so icons left behind are not plain posts.
add_action( 'init', 'easy_svg_register_icon_store', 5 );

add_action( 'admin_init', 'easy_svg_clean_shared_icon_folder' );

add_action( 'before_delete_post', 'easy_svg_note_deleted_icon', 10, 2 );
add_action( 'deleted_post', 'easy_svg_forget_deleted_icon', 10, 2 );
add_filter( 'wp_untrash_post_status', 'easy_svg_untrash_icon_status', 10, 3 );

if ( easy_svg_feature_enabled( 'icons' ) ) {
    add_action( 'init', 'easy_svg_boot_icons', 10 );
    add_action(
        'init',
        static function () {
            add_shortcode( 'easy_svg_icon', 'easy_svg_icon_shortcode' );
        }
    );
    // Before do_blocks and do_shortcode, so the icons a post names are read in one query.
    add_filter( 'the_content', 'easy_svg_prime_content_icons', 8 );
    // Where nothing lists icons, an Icon block registers its own before core draws it.
    add_filter( 'render_block_data', 'easy_svg_icon_block_data', 10, 3 );
    add_action( 'switch_blog', 'easy_svg_icons_forget_site', 10, 2 );
    add_filter( 'block_bindings_source_value', 'easy_svg_bound_icon', 10, 5 );
    add_filter( 'rest_pre_dispatch', 'easy_svg_icon_rest_route', 5, 3 );
    add_filter( 'rest_request_before_callbacks', 'easy_svg_icon_listing_before', 5, 3 );
    add_filter( 'rest_request_after_callbacks', 'easy_svg_icon_listing_after', 5, 3 );
    add_filter( 'rest_request_after_callbacks', 'easy_svg_icon_listing_page', 15, 3 );
}

// Hooked on the post type, not the screen: WP-CLI, importers and REST clients write icons too.
if ( easy_svg_feature_enabled( 'icons' ) ) {
    add_action( 'save_post_' . EASY_SVG_ICON_POST_TYPE, 'easy_svg_forget_icons' );
    add_action( 'save_post_' . EASY_SVG_ICON_POST_TYPE, 'easy_svg_forget_icon_file' );
    add_filter( 'rest_post_dispatch', 'easy_svg_hide_off_icons', 10, 3 );
}

// The network's upload_filetypes is policy: where the network admin left svg out, no SVG is uploaded or kept as an icon.
function easy_svg_network_allows_svg(): bool {
    if ( ! is_multisite() || ! apply_filters( 'easy_svg_respect_network_filetypes', true ) ) {
        return true;
    }
    return in_array( 'svg', preg_split( '/\s+/', strtolower( (string) get_site_option( 'upload_filetypes' ) ), -1, PREG_SPLIT_NO_EMPTY ), true );
}

if ( ! function_exists( 'esw_add_support' ) ) {
    // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- a public name for years; sites and other plugins call it.
    function esw_add_support( $mimes ) {
        if ( ! easy_svg_network_allows_svg() ) {
            return $mimes;
        }

        $mimes['svg'] = 'image/svg+xml';
        return $mimes;
    }
    add_filter( 'upload_mimes', 'esw_add_support' );
}

if ( ! function_exists( 'esw_upload_check' ) ) {

    // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- a public name for years; sites and other plugins call it.
    function esw_upload_check( $checked, $file, $filename, $mimes ) {

        // fileinfo often cannot name an SVG and core drops its type; giving it back lets the upload filter sanitise it.
        if ( ! easy_svg_is_svg_name( $filename ) || ! empty( $checked['type'] ) ) {
            return $checked;
        }

        $by_name = wp_check_filetype( $filename, $mimes );
        if ( 'image/svg+xml' !== strtolower( (string) $by_name['type'] ) ) {
            return $checked;
        }

        return array(
            'ext'             => 'svg',
            'type'            => 'image/svg+xml',
            'proper_filename' => isset( $checked['proper_filename'] ) ? $checked['proper_filename'] : false,
        );
    }
    add_filter( 'wp_check_filetype_and_ext', 'esw_upload_check', 10, 4 );
}

if ( ! function_exists( 'esw_display_svg_media' ) ) {

    // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- a public name for years; sites and other plugins call it.
    function esw_display_svg_media( $response, $attachment, $meta ) {

        if (
            isset( $response['type'], $response['subtype'] ) &&
            'image' === $response['type'] &&
            'svg+xml' === $response['subtype'] &&
            class_exists( 'SimpleXMLElement' )
        ) {
            $dim = easy_svg_read_svg_dimensions( get_attached_file( $attachment->ID ) );
            if ( array() !== $dim ) {
                $src    = $response['url'];
                $width  = $dim['width'];
                $height = $dim['height'];

                $response['image'] = compact( 'src', 'width', 'height' );
                $response['thumb'] = compact( 'src', 'width', 'height' );

                $response['sizes']['full'] = array(
                    'height'      => $height,
                    'width'       => $width,
                    'url'         => $src,
                    'orientation' => ( $height > $width ) ? 'portrait' : 'landscape',
                );
            }
        }

        return $response;
    }
    add_filter( 'wp_prepare_attachment_for_js', 'esw_display_svg_media', 10, 3 );
}

// A public name that no hook calls any more; it stays so sites calling it get a deprecation notice, not a fatal.
if ( ! function_exists( 'esw_display_svg_files_backend' ) ) {
    // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- a public name since 4.1.
    function esw_display_svg_files_backend() {
        _deprecated_function( __FUNCTION__, '4.9', 'wp_get_attachment_url()' );
    }
}

if ( ! function_exists( 'esw_svg_styles' ) ) {
    // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- a public name for years; sites and other plugins call it.
    function esw_svg_styles() {
        echo "<style>
                /* Media Library SVG styles */
                table.media .column-title .media-icon img[src*='.svg'] {
                    width: 100%;
                    height: auto;
                }

                /* Gutenberg editor SVG styles */
                .components-responsive-wrapper__content[src*='.svg'] {
                    position: relative;
                }
            </style>";
    }
    add_action( 'admin_head', 'esw_svg_styles' );
}
