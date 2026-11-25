<?php
// Core's icon registry keeps only svg, path and polygon with a few attributes, so shapes become paths and strokes become classes; what cannot be carried is reported, never silently lost.

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

const EASY_SVG_STROKE_CLASS = 'esvg-stroke';

// Fixed because the stylesheet ships with the plugin: any other width is reported.
const EASY_SVG_STROKE_WIDTHS = array(
    '1'    => '1',
    '1.25' => '125',
    '1.5'  => '15',
    '1.75' => '175',
    '2'    => '2',
    '2.5'  => '25',
    '3'    => '3',
);

function easy_svg_path_number( $value ) {
    $number = round( (float) $value, 4 );
    $text   = rtrim( rtrim( number_format( $number, 4, '.', '' ), '0' ), '.' );
    return '' === $text ? '0' : $text;
}

// Two half arcs: the one form that closes exactly without a curve approximation.
function easy_svg_ellipse_path( $cx, $cy, $rx, $ry ) {
    $cx = (float) $cx;
    $cy = (float) $cy;
    $rx = abs( (float) $rx );
    $ry = abs( (float) $ry );
    if ( 0.0 === $rx || 0.0 === $ry ) {
        return '';
    }
    $n = 'easy_svg_path_number';
    return 'M' . $n( $cx - $rx ) . ' ' . $n( $cy )
        . 'a' . $n( $rx ) . ' ' . $n( $ry ) . ' 0 1 0 ' . $n( 2 * $rx ) . ' 0'
        . 'a' . $n( $rx ) . ' ' . $n( $ry ) . ' 0 1 0 ' . $n( -2 * $rx ) . ' 0z';
}

// SVG's rx/ry rules: one given means both, each clamped to half the side.
function easy_svg_rect_path( $x, $y, $width, $height, $rx = '', $ry = '' ) {
    $x = (float) $x;
    $y = (float) $y;
    $w = (float) $width;
    $h = (float) $height;
    if ( $w <= 0.0 || $h <= 0.0 ) {
        return '';
    }

    $has_rx = '' !== (string) $rx;
    $has_ry = '' !== (string) $ry;
    $r_x    = $has_rx ? abs( (float) $rx ) : ( $has_ry ? abs( (float) $ry ) : 0.0 );
    $r_y    = $has_ry ? abs( (float) $ry ) : ( $has_rx ? abs( (float) $rx ) : 0.0 );
    $r_x    = min( $r_x, $w / 2 );
    $r_y    = min( $r_y, $h / 2 );

    $n = 'easy_svg_path_number';
    if ( 0.0 === $r_x || 0.0 === $r_y ) {
        return 'M' . $n( $x ) . ' ' . $n( $y ) . 'h' . $n( $w ) . 'v' . $n( $h ) . 'h' . $n( -$w ) . 'z';
    }

    return 'M' . $n( $x + $r_x ) . ' ' . $n( $y )
        . 'h' . $n( $w - 2 * $r_x )
        . 'a' . $n( $r_x ) . ' ' . $n( $r_y ) . ' 0 0 1 ' . $n( $r_x ) . ' ' . $n( $r_y )
        . 'v' . $n( $h - 2 * $r_y )
        . 'a' . $n( $r_x ) . ' ' . $n( $r_y ) . ' 0 0 1 ' . $n( -$r_x ) . ' ' . $n( $r_y )
        . 'h' . $n( -( $w - 2 * $r_x ) )
        . 'a' . $n( $r_x ) . ' ' . $n( $r_y ) . ' 0 0 1 ' . $n( -$r_x ) . ' ' . $n( -$r_y )
        . 'v' . $n( -( $h - 2 * $r_y ) )
        . 'a' . $n( $r_x ) . ' ' . $n( $r_y ) . ' 0 0 1 ' . $n( $r_x ) . ' ' . $n( -$r_y )
        . 'z';
}

function easy_svg_points_path( $points, $close ) {
    $numbers = preg_split( '/[\s,]+/', trim( (string) $points ), -1, PREG_SPLIT_NO_EMPTY );
    if ( ! is_array( $numbers ) || count( $numbers ) < 4 ) {
        return '';
    }
    $pairs = array();
    for ( $i = 0; $i + 1 < count( $numbers ); $i += 2 ) {
        $pairs[] = easy_svg_path_number( $numbers[ $i ] ) . ' ' . easy_svg_path_number( $numbers[ $i + 1 ] );
    }
    return 'M' . implode( 'L', $pairs ) . ( $close ? 'z' : '' );
}

// One loader for every pass: no network, and libxml's error state is left as it was found.
function easy_svg_load_svg( $markup ): ?DOMDocument {
    $doc      = new DOMDocument();
    $internal = libxml_use_internal_errors( true );
    $loaded   = $doc->loadXML( (string) $markup, LIBXML_NONET );
    libxml_clear_errors();
    libxml_use_internal_errors( $internal );

    return $loaded && null !== $doc->documentElement ? $doc : null;
}

// DOM, not a regular expression: this rewrites structure, and a pattern is how a <g> ends up half unwrapped.
/** @return array{content:string,classes:array<int,string>,lost:array<int,string>} */
function easy_svg_core_icon( $markup ) {
    $empty = array(
        'content' => '',
        'classes' => array(),
        'lost'    => array(),
    );

    $doc = easy_svg_load_svg( $markup );
    if ( null === $doc ) {
        return $empty;
    }

    $root = $doc->documentElement;
    if ( 'svg' !== strtolower( $root->localName ) ) {
        return $empty;
    }

    $lost  = array();
    $xpath = new DOMXPath( $doc );

    // Read before anything is rewritten.
    $stroke = easy_svg_stroke_presentation( $xpath, $root, $lost );

    // Innermost groups first, so a nested one is flattened before its parent.
    $groups = array();
    foreach ( $xpath->query( '//*[local-name()="g"]' ) as $group ) {
        // DOMXPath promises only DOMNode, and easy_svg_flatten_group reads attributes.
        if ( $group instanceof DOMElement ) {
            $groups[] = $group;
        }
    }
    foreach ( array_reverse( $groups ) as $group ) {
        easy_svg_flatten_group( $group );
    }

    foreach ( $xpath->query( '//*' ) as $element ) {
        if ( ! $element instanceof DOMElement ) {
            continue;
        }
        $name = strtolower( $element->localName );
        if ( in_array( $name, array( 'svg', 'path', 'polygon' ), true ) ) {
            continue;
        }

        $path = easy_svg_shape_as_path( $doc, $element );
        if ( null !== $path ) {
            $element->parentNode->replaceChild( $path, $element );
            continue;
        }

        // Gradients, masks, <use>, <text>: core would drop them anyway, so they are reported.
        $lost[] = $name;
        if ( $element->parentNode ) {
            $element->parentNode->removeChild( $element );
        }
    }

    $classes = $stroke['classes'];
    if ( array() !== $classes ) {
        $existing = trim( (string) $root->getAttribute( 'class' ) );
        $root->setAttribute( 'class', trim( $existing . ' ' . implode( ' ', $classes ) ) );
    }

    return array(
        'content' => (string) $doc->saveXML( $root ),
        'classes' => $classes,
        'lost'    => array_values( array_unique( $lost ) ),
    );
}

/**
 * @param DOMXPath   $xpath
 * @param DOMElement $root
 * @param array      $lost
 * @return array{classes:array<int,string>}
 */
function easy_svg_stroke_presentation( $xpath, $root, &$lost ) {
    $drawing = array();
    foreach ( $xpath->query( '//*[local-name()!="svg"]' ) as $element ) {
        if ( $element instanceof DOMElement ) {
            $drawing[] = $element;
        }
    }
    if ( array() === $drawing ) {
        return array( 'classes' => array() );
    }

    $root_fill   = strtolower( trim( (string) $root->getAttribute( 'fill' ) ) );
    $root_stroke = trim( (string) $root->getAttribute( 'stroke' ) );

    $width   = '';
    $cap     = '';
    $join    = '';
    $stroked = false;
    $filled  = false;
    $colour  = '';

    foreach ( $drawing as $element ) {
        $fill        = strtolower( trim( (string) $element->getAttribute( 'fill' ) ) );
        $own_stroke  = trim( (string) $element->getAttribute( 'stroke' ) );
        $this_stroke = '' !== $own_stroke ? $own_stroke : $root_stroke;
        $this_fill   = '' !== $fill ? $fill : $root_fill;

        if ( '' !== $this_stroke && 'none' !== strtolower( $this_stroke ) ) {
            $stroked = true;
            if ( '' === $colour ) {
                $colour = $this_stroke;
            }
            $width = '' !== $width ? $width : trim( (string) $element->getAttribute( 'stroke-width' ) );
            $cap   = '' !== $cap ? $cap : strtolower( trim( (string) $element->getAttribute( 'stroke-linecap' ) ) );
            $join  = '' !== $join ? $join : strtolower( trim( (string) $element->getAttribute( 'stroke-linejoin' ) ) );
        }
        if ( 'none' !== $this_fill ) {
            $filled = true;
        }
    }

    if ( ! $stroked ) {
        return array( 'classes' => array() );
    }

    // Mixed: one class cannot say "stroke these and fill those", so the stroke is reported, never forced on.
    if ( $filled ) {
        $lost[] = 'stroke';
        return array( 'classes' => array() );
    }

    $classes = array( EASY_SVG_STROKE_CLASS );

    $width = '' !== $width ? $width : trim( (string) $root->getAttribute( 'stroke-width' ) );
    $width = '' === $width ? '1' : $width;
    if ( isset( EASY_SVG_STROKE_WIDTHS[ $width ] ) ) {
        $classes[] = 'esvg-sw-' . EASY_SVG_STROKE_WIDTHS[ $width ];
    } else {
        // The icon stays visible with the default width, and the difference is reported.
        $lost[] = 'stroke-width';
    }

    $cap  = '' !== $cap ? $cap : strtolower( trim( (string) $root->getAttribute( 'stroke-linecap' ) ) );
    $join = '' !== $join ? $join : strtolower( trim( (string) $root->getAttribute( 'stroke-linejoin' ) ) );
    if ( 'round' === $cap ) {
        $classes[] = 'esvg-cap-round';
    }
    if ( 'round' === $join ) {
        $classes[] = 'esvg-join-round';
    }

    // A fixed stroke colour becomes currentColor, so the change is reported.
    $colour = strtolower( $colour );
    if ( '' !== $colour && 'currentcolor' !== $colour && 'inherit' !== $colour ) {
        $lost[] = 'stroke-colour';
    }

    return array( 'classes' => $classes );
}

// The group's transform goes first, the order SVG reads a transform list in.
/** @param DOMElement $group */
function easy_svg_flatten_group( $group ) {
    if ( ! $group->parentNode ) {
        return;
    }

    $transform = trim( (string) $group->getAttribute( 'transform' ) );
    $fill      = trim( (string) $group->getAttribute( 'fill' ) );
    $fill_rule = trim( (string) $group->getAttribute( 'fill-rule' ) );

    $children = array();
    foreach ( $group->childNodes as $child ) {
        $children[] = $child;
    }

    foreach ( $children as $child ) {
        if ( $child instanceof DOMElement ) {
            if ( '' !== $transform ) {
                $own = trim( (string) $child->getAttribute( 'transform' ) );
                $child->setAttribute( 'transform', trim( $transform . ' ' . $own ) );
            }
            if ( '' !== $fill && '' === trim( (string) $child->getAttribute( 'fill' ) ) ) {
                $child->setAttribute( 'fill', $fill );
            }
            if ( '' !== $fill_rule && '' === trim( (string) $child->getAttribute( 'fill-rule' ) ) ) {
                $child->setAttribute( 'fill-rule', $fill_rule );
            }
        }
        $group->parentNode->insertBefore( $child, $group );
    }

    $group->parentNode->removeChild( $group );
}

/**
 * @param DOMDocument $doc
 * @param DOMElement  $element
 * @return DOMElement|null
 */
function easy_svg_shape_as_path( $doc, $element ) {
    $name = strtolower( $element->localName );
    $a    = array();
    foreach ( $element->attributes as $attribute ) {
        $a[ strtolower( $attribute->localName ) ] = (string) $attribute->nodeValue;
    }

    switch ( $name ) {
        case 'circle':
            $d = easy_svg_ellipse_path( $a['cx'] ?? 0, $a['cy'] ?? 0, $a['r'] ?? 0, $a['r'] ?? 0 );
            break;
        case 'ellipse':
            $d = easy_svg_ellipse_path( $a['cx'] ?? 0, $a['cy'] ?? 0, $a['rx'] ?? 0, $a['ry'] ?? 0 );
            break;
        case 'rect':
            $d = easy_svg_rect_path( $a['x'] ?? 0, $a['y'] ?? 0, $a['width'] ?? 0, $a['height'] ?? 0, $a['rx'] ?? '', $a['ry'] ?? '' );
            break;
        case 'line':
            $d = 'M' . easy_svg_path_number( $a['x1'] ?? 0 ) . ' ' . easy_svg_path_number( $a['y1'] ?? 0 )
                . 'L' . easy_svg_path_number( $a['x2'] ?? 0 ) . ' ' . easy_svg_path_number( $a['y2'] ?? 0 );
            break;
        case 'polyline':
            $d = easy_svg_points_path( $a['points'] ?? '', false );
            break;
        default:
            return null;
    }

    if ( '' === $d ) {
        return null;
    }

    $path = $doc->createElementNS( 'http://www.w3.org/2000/svg', 'path' );
    $path->setAttribute( 'd', $d );
    // The three attributes the registry keeps on a path.
    foreach ( array( 'fill', 'fill-rule', 'transform' ) as $keep ) {
        if ( isset( $a[ $keep ] ) && '' !== $a[ $keep ] ) {
            $path->setAttribute( $keep, $a[ $keep ] );
        }
    }

    return $path;
}
