<?php
// Template tags an add-on offered, kept answering while it is switched off: the kept icon or nothing, never a fatal.

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( ! function_exists( 'easy_svg_pro_block_icon' ) ) {
    function easy_svg_pro_block_icon( $value, $args = array() ) {
        $value = is_string( $value ) ? trim( $value ) : '';
        $parts = explode( '/', $value, 2 );
        if ( 2 !== count( $parts ) || 1 !== preg_match( EASY_SVG_ICON_NAME_PATTERN, $parts[0] ) || 1 !== preg_match( EASY_SVG_ICON_NAME_PATTERN, $parts[1] ) ) {
            return '';
        }
        return easy_svg_icon( $value, is_array( $args ) ? $args : array() );
    }
}

// A theme registering its own folder must not stop the page; the icons its pages used are kept already.
if ( ! function_exists( 'easy_svg_register_icon_collection' ) ) {
    function easy_svg_register_icon_collection( $slug, $label, $dir_or_icons ) {
    }
}

function easy_svg_kept_twig_icon( $name = '', $args = array() ) {
    return is_string( $name ) && '' !== trim( $name ) ? easy_svg_icon( $name, is_array( $args ) ? $args : array() ) : '';
}

function easy_svg_kept_twig_icon_exists( $name = '' ) {
    return '' !== easy_svg_kept_twig_icon( $name );
}

// An unknown function stops a Twig template with an error, so the names stay registered.
function easy_svg_kept_twig( $twig ) {
    if ( ! is_object( $twig ) || ! method_exists( $twig, 'addFunction' ) || ! class_exists( '\\Twig\\TwigFunction' ) ) {
        return $twig;
    }
    $safe = array( 'is_safe' => array( 'html' ) );
    $twig->addFunction( new \Twig\TwigFunction( 'easy_svg_icon', 'easy_svg_kept_twig_icon', $safe ) );
    $twig->addFunction( new \Twig\TwigFunction( 'easy_svg_icon_exists', 'easy_svg_kept_twig_icon_exists' ) );
    if ( method_exists( $twig, 'addFilter' ) && class_exists( '\\Twig\\TwigFilter' ) ) {
        $twig->addFilter( new \Twig\TwigFilter( 'easy_svg_icon', 'easy_svg_kept_twig_icon', $safe ) );
    }
    return $twig;
}

// Lazy Blocks prints a control's raw value, so an icon control would show its collection/icon name as text.
function easy_svg_kept_lazyblocks_icon( $value ) {
    return is_string( $value ) && '' !== $value ? easy_svg_pro_block_icon( $value ) : $value;
}

// Lazy Blocks drops a control whose type nobody registers, and the filter above with it; kept as a type no new block can pick.
/** @param mixed $controls */
function easy_svg_kept_lazyblocks_control( $controls ) {
    if ( ! is_array( $controls ) || isset( $controls['easy_svg_icon'] ) ) {
        return $controls;
    }
    $controls['easy_svg_icon'] = array(
        'name'         => 'easy_svg_icon',
        'icon'         => '',
        'type'         => 'string',
        'label'        => __( 'Easy SVG icon', 'easy-svg' ),
        'category'     => 'easy_svg_off',
        'restrictions' => array(
            'once'                          => false,
            'as_child'                      => true,
            'hidden_from_select'            => true,
            'name_settings'                 => true,
            'label_settings'                => true,
            'default_settings'              => false,
            'help_settings'                 => true,
            'placement_settings'            => array( 'content', 'inspector' ),
            'group_settings'                => true,
            'width_settings'                => true,
            'required_settings'             => true,
            'hide_if_not_selected_settings' => true,
            'translate_settings'            => false,
            'save_in_meta_settings'         => true,
        ),
        'attributes'   => array(
            'type'                 => 'easy_svg_icon',
            'name'                 => '',
            'default'              => '',
            'label'                => '',
            'help'                 => '',
            'child_of'             => '',
            'placement'            => 'content',
            'group'                => 'settings',
            'width'                => '100',
            'hide_if_not_selected' => 'false',
            'required'             => 'false',
            'translate'            => 'false',
            'save_in_meta'         => 'false',
            'save_in_meta_name'    => '',
        ),
    );
    return $controls;
}

if ( function_exists( 'add_filter' ) ) {
    add_filter( 'timber/twig', 'easy_svg_kept_twig' );
    add_filter( 'lzb/controls/all', 'easy_svg_kept_lazyblocks_control' );
    add_filter( 'lzb/control_value/control_type=easy_svg_icon', 'easy_svg_kept_lazyblocks_icon' );
}
