/**
 * Editor-only notice for an Icon block whose icon is gone; the front end stays silent so readers never see an internal problem.
 * Plain wp.element, no build step: every dependency is already on the page.
 */
( function ( wp ) {
	if ( ! wp || ! wp.hooks || ! wp.element || ! wp.data || ! wp.compose ) {
		return;
	}

	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var sprintf = wp.i18n.sprintf;

	// Two answers, because the remedies differ: a missing collection is usually a theme or plugin that left, a missing icon in a present one a rename.
	function problem( reference, icons, collections ) {
		if ( ! reference || ! Array.isArray( icons ) ) {
			return '';
		}
		for ( var i = 0; i < icons.length; i++ ) {
			if ( icons[ i ] && icons[ i ].name === reference ) {
				return '';
			}
		}
		var slash = reference.indexOf( '/' );
		var collection = slash > 0 ? reference.slice( 0, slash ) : '';
		var known = false;
		if ( collection && Array.isArray( collections ) ) {
			for ( var c = 0; c < collections.length; c++ ) {
				if ( collections[ c ] && collections[ c ].slug === collection ) {
					known = true;
				}
			}
		}
		return known
			? sprintf(
					/* translators: 1: the saved icon reference, 2: the collection it names. */
					__( 'This icon was renamed or removed: %1$s. Pick it again from %2$s.', 'easy-svg' ),
					reference,
					collection
			  )
			: sprintf(
					/* translators: 1: the saved icon reference, 2: the collection it names. */
					__( 'This icon is missing: %1$s. Visitors see no icon. Pick another one, or switch on the theme or plugin that provided %2$s.', 'easy-svg' ),
					reference,
					collection || reference
			  );
	}

	var withMissingIconNotice = wp.compose.createHigherOrderComponent( function ( BlockEdit ) {
		return function ( props ) {
			if ( 'core/icon' !== props.name ) {
				return el( BlockEdit, props );
			}

			var reference = props.attributes && props.attributes.icon ? String( props.attributes.icon ) : '';

			// Asked once and held in state: the icons arrive from a REST request, and a block rendered before them would never render again.
			var icons = wp.element.useState( null );
			var collections = wp.element.useState( null );

			wp.element.useEffect( function () {
				var alive = true;
				var core = wp.data.resolveSelect( 'core' );
				if ( ! core || ! core.getIcons ) {
					return undefined;
				}
				Promise.all( [ core.getIcons(), core.getIconCollections ? core.getIconCollections() : [] ] ).then(
					function ( answer ) {
						var list = Array.isArray( answer[ 0 ] ) ? answer[ 0 ] : [];
						var listed = ! reference || list.some( function ( icon ) {
							return icon && icon.name === reference;
						} );
						// The list leaves out icons switched off in the library, yet they still render; the single-icon route still answers for them.
						var single = listed || ! core.getEntityRecord
							? Promise.resolve( null )
							: Promise.resolve( core.getEntityRecord( 'root', 'icon', reference ) ).then( null, function () {
									return null;
							  } );
						return single.then( function ( record ) {
							if ( ! alive ) {
								return;
							}
							icons[ 1 ]( record && record.name === reference ? list.concat( [ record ] ) : list );
							collections[ 1 ]( Array.isArray( answer[ 1 ] ) ? answer[ 1 ] : [] );
						} );
					}
				);
				return function () {
					alive = false;
				};
			}, [] );

			// Until the list is here every reference looks missing; a warning that vanishes a moment later is worse than none.
			var message = null === icons[ 0 ] ? '' : problem( reference, icons[ 0 ], collections[ 0 ] );

			return el(
				wp.element.Fragment,
				null,
				message
					? el(
							wp.blockEditor.Warning,
							{ className: 'easy-svg-missing-icon' },
							message
					  )
					: null,
				el( BlockEdit, props )
			);
		};
	}, 'withMissingIconNotice' );

	wp.hooks.addFilter( 'editor.BlockEdit', 'easy-svg/missing-icon-notice', withMissingIconNotice );
} )( window.wp );
