/**
 * A link for core's Icon block: a toolbar button opens WordPress's own link field, as on Button and Image.
 * Plain wp.element, no build step: every dependency is already on the page.
 */
( function ( wp ) {
	if ( ! wp || ! wp.hooks || ! wp.element || ! wp.compose || ! wp.blockEditor || ! wp.components ) {
		return;
	}

	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var be = wp.blockEditor;
	var co = wp.components;
	var LinkControl = be.LinkControl || be.__experimentalLinkControl;

	// Prefixed, so a link core adds to the block one day cannot collide with ours.
	wp.hooks.addFilter( 'blocks.registerBlockType', 'easy-svg/icon-link/attributes', function ( settings, name ) {
		if ( 'core/icon' !== name ) {
			return settings;
		}
		var attributes = Object.assign( {}, settings.attributes, {
			easySvgUrl: { type: 'string' },
			easySvgNewTab: { type: 'boolean', default: false },
		} );
		return Object.assign( {}, settings, { attributes: attributes } );
	} );

	// Its own component, so its hooks run on every render of an Icon block and never for other blocks.
	function IconWithLink( outer ) {
		var BlockEdit = outer.edit;
		var props = outer.blockProps;
		var open = wp.element.useState( false );
		var anchor = wp.element.useState( null );
		// Deselected, the field closes, so it does not open again on its own when the block is picked next time.
		wp.element.useEffect( function () {
			if ( ! props.isSelected ) {
				open[ 1 ]( false );
			}
		}, [ props.isSelected ] );
		var close = function () {
			open[ 1 ]( false );
			if ( anchor[ 0 ] ) {
				anchor[ 0 ].focus();
			}
		};
		var url = props.attributes.easySvgUrl || '';

		var controls = props.isSelected
			? el(
				be.BlockControls,
				{ group: 'block' },
				el( co.ToolbarButton, {
					ref: anchor[ 1 ],
					icon: 'admin-links',
					label: url ? __( 'Edit link', 'easy-svg' ) : __( 'Link', 'easy-svg' ),
					isPressed: !! url,
					onClick: function () {
						open[ 1 ]( ! open[ 0 ] );
					},
				} )
			)
			: null;

		var popover = props.isSelected && open[ 0 ]
			? el(
				co.Popover,
				{
					anchor: anchor[ 0 ],
					placement: 'bottom',
					focusOnMount: 'firstElement',
					onClose: function () {
						open[ 1 ]( false );
					},
				},
				el( LinkControl, {
					value: { url: url, opensInNewTab: !! props.attributes.easySvgNewTab },
					onChange: function ( next ) {
						props.setAttributes( {
							easySvgUrl: next && next.url ? next.url : undefined,
							easySvgNewTab: !! ( next && next.opensInNewTab ),
						} );
					},
					onRemove: function () {
						props.setAttributes( { easySvgUrl: undefined, easySvgNewTab: false } );
						open[ 1 ]( false );
					},
				} )
			)
			: null;

		return el( wp.element.Fragment, null, el( BlockEdit, props ), controls, popover );
}

	var withLink = wp.compose.createHigherOrderComponent( function ( BlockEdit ) {
		return function ( props ) {
			if ( 'core/icon' !== props.name || ! LinkControl ) {
				return el( BlockEdit, props );
			}
			return el( IconWithLink, { edit: BlockEdit, blockProps: props } );
		};
	}, 'withEasySvgIconLink' );

	wp.hooks.addFilter( 'editor.BlockEdit', 'easy-svg/icon-link/edit', withLink );
} )( window.wp );
