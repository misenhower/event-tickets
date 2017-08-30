var ticketHeaderImage = window.ticketHeaderImage || {};

(function( window, $, undefined ) {
	'use strict';

	// base elements
	var $body                            = $( 'html, body' );
	var $tribe_tickets                   = $( document.getElementById( 'tribetickets' ) );
	var $tickets_container               = $( document.getElementById( 'event_tickets' ) );
	var $post_id                         = $( document.getElementById( 'post_ID' ) );
	// panels
	var $panels                          = $( document.getElementById( 'event_tickets' ) ).find( '.ticket_panel' );
	var $base_panel                      = $( document.getElementById( 'tribe_panel_base' ) );
	var $edit_panel                      = $( document.getElementById( 'tribe_panel_edit' ) );
	var $settings_panel                  = $( document.getElementById( 'tribe_panel_settings' ) );
	// stock elements
	var $enable_global_stock             = $( document.getElementById( 'tribe-tickets-enable-global-stock' ) );
	var $global_stock_level              = $( document.getElementById( 'tribe-tickets-global-stock-level' ) );
	var $global_capacity_edit            = $( document.getElementById('settings_global_capacity_edit') );
	var global_capacity_setting_changed  = false;
	// date elements
	var $event_pickers                   = $( document.getElementById( 'tribe-event-datepickers' ) );
	var $ticket_start_date               = $( document.getElementById( 'ticket_start_date' ) );
	var $ticket_end_date                 = $( document.getElementById( 'ticket_end_date' ) );
	var $ticket_start_time               = $( document.getElementById( 'ticket_start_time' ) );
	var $ticket_end_time                 = $( document.getElementById( 'ticket_end_time' ) );
	var startofweek                      = 0;
	// misc ticket elements
	var $ticket_image_preview            = $( document.getElementById( 'tribe_ticket_header_preview' ) );
	var $ticket_show_description         = $( document.getElementById( 'tribe_tickets_show_description' ) );

	ticketHeaderImage = {
		// Call this from the upload button to initiate the upload frame.
		uploader: function() {

			var frame = wp.media( {
				title   : HeaderImageData.title,
				multiple: false,
				library : { type: 'image' },
				button  : { text: HeaderImageData.button }
			} );

			// Handle results from media manager.
			frame.on( 'close', function() {
				var attachments = frame.state().get( 'selection' ).toJSON();
				if ( attachments.length ) {
					ticketHeaderImage.render( attachments[0] );
				}
			} );

			frame.open();
			return false;
		},
		// Output Image preview and populate widget form.
		render  : function( attachment ) {
			$ticket_image_preview.html( ticketHeaderImage.imgHTML( attachment ) );
			$( document.getElementById( 'tribe_ticket_header_image_id' ) ).val( attachment.id );
			$( document.getElementById( 'tribe_ticket_header_remove' ) ).show();
			$( document.getElementById( 'tribe_tickets_image_preview_filename' ) ).find( '.filename' ).text( attachment.filename ).show();
		},
		// Render html for the image.
		imgHTML : function( attachment ) {
			var img_html = '<img src="' + attachment.url + '" ';
			img_html += 'width="' + attachment.width + '" ';
			img_html += 'height="' + attachment.height + '" ';
			img_html += '/>';
			return img_html;
		}
	};

	$( document ).ready( function() {
		$tribe_tickets.on( {
			/**
			 * Makes a Visual Spinning thingy appear on the Tickets metabox.
			 * Also prevents user Action on the metabox elements.
			 *
			 * @param  {jQuery.event} event  The jQuery event
			 * @param  {string} action You can use `start` or `stop`
			 * @return {void}
			 */
			'spin.tribe': function( event, action ) {
				if ( typeof action === 'undefined' || $.inArray( action, [ 'start', 'stop' ] ) ){
					action = 'stop';
				}

				if ( 'stop' === action ) {
					$tickets_container.css( 'opacity', '1' )
						.find( '#tribe-loading' ).hide();
				} else {
					$tickets_container.css( 'opacity', '0.5' )
						.find( '#tribe-loading' ).show();
				}
			},

			/**
			 * Clears the Form fields the correct way
			 *
			 * @return {void}
			 */
			'clear.tribe': function() {
				$edit_panel.find( 'input:not(:button):not(:radio):not(:checkbox):not([type="hidden"]), textarea' ).val( '' );
				$edit_panel.find( 'input:checkbox, input:radio' ).prop( 'checked', false );
				$edit_panel.find( '#ticket_id' ).val( '' );

				// some fields may have a default value we don't want to lose after clearing the form
				$edit_panel.find( 'input[data-default-value]' ).each( function() {
					var $current_field = $( this );
					$current_field.val( $current_field.data( 'default-value' ) );
				} );

				// Reset the min/max datepicker settings so that they aren't inherited by the next ticket that is edited
				// today, now
				$ticket_start_date.datepicker( 'option', 'maxDate', null ).val( $.datepicker.formatDate( 'mm/dd/yy', new Date() ) ).trigger( 'change' );
				$ticket_start_time.val( new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' } ).format( new Date() ) ).trigger( 'change' );
				// event end date, time
				$ticket_end_date.datepicker( 'option', 'minDate', null ).val(  $( document.getElementById( 'EventStartDate' ) ).val() ).trigger( 'change' );
				$ticket_end_time.val( $( document.getElementById( 'EventEndTime' ) ).val() ).trigger( 'change' );

				$edit_panel.find( '#ticket_price' ).removeProp( 'disabled' )
					.siblings( '.no-update-message' ).html( '' ).hide()
					.end().siblings( '.description' ).show();

				$( document.getElementById( 'tribe-tickets-attendee-sortables' ) ).empty();

				$( '.accordion-content.is-active' ).removeClass( 'is-active' );

				$( document.getElementById( 'ticket_bottom_right' ) ).empty();

				$edit_panel.find( '.accordion-header, .accordion-content' ).removeClass( 'is-active' );
			},

			/**
			 * Scrolls to the Tickets container once the ticket form receives the focus.
			 *
			 * @return {void}
			 */
			'focus.tribe': function() {
				$body.animate( {
					scrollTop: $tickets_container.offset().top - 50
				}, 500 );
			},

			/**
			 * When the edit ticket form fields have completed loading we can setup
			 * other UI features as needed.
			 */
			'edit-tickets-complete.tribe': function() {
				show_hide_ticket_type_history();
			},

			/**
			 * Sets/Swaps out the name & id attributes on Advanced ticket meta fields so we don't have (or submit)
			 * duplicate fields
			 *
			 * We now load these via ajax and there is no need to change field names/IDs
			 *
			 * @deprecated TBD
			 *
			 * @return {void}
			 */
			'set-advanced-fields.tribe': function() {
				var $this            = $( this );
				var $ticket_form     = $this.find( '#ticket_form' );
				var $ticket_advanced = $ticket_form.find( 'tr.ticket_advanced:not(.ticket_advanced_meta)' ).find( 'input, select, textarea' );
				var provider = $ticket_form.find( '.ticket_provider:checked' ).val();

				// for each advanced ticket input, select, and textarea, relocate the name and id fields a bit
				$ticket_advanced.each( function() {
					var $el = $( this );

					// if there's a value in the name attribute, move it to the data attribute then clear out the id as well
					if ( $el.attr( 'name' ) ) {
						$el.data( 'name', $el.attr( 'name' ) ).attr( {
							'name': '',
							'id': ''
						} );
					}

					// if the field is for the currently selected provider, make sure the name and id fields are populated
					if (
						$el.closest( 'tr' ).hasClass( 'ticket_advanced_' + provider ) && $el.data( 'name' ) && 0 === $el.attr( 'name' ).length ) {
						$el.attr( {
							'name': $el.data( 'name' ),
							'id': $el.data( 'name' )
						} );
					}
				} );
			}
		} );

		if ( $event_pickers.length ) {
			startofweek = $event_pickers.data( 'startofweek' );
		}

		var datepickerOpts = {
			dateFormat     : 'yy-mm-dd',
			showAnim       : 'fadeIn',
			changeMonth    : true,
			changeYear     : true,
			numberOfMonths : 3,
			firstDay       : startofweek,
			showButtonPanel: false,
			onChange       : function() {
			},
			onSelect       : function( dateText, inst ) {
				var the_date = $.datepicker.parseDate( 'yy-mm-dd', dateText );
				if ( inst.id === 'ticket_start_date' ) {
					$ticket_end_date.datepicker( 'option', 'minDate', the_date );
				}
				else {
					$ticket_start_date.datepicker( 'option', 'maxDate', the_date );
				}
			}
		};

		$.extend( datepickerOpts, tribe_l10n_datatables.datepicker );

		var $timepickers = $tribe_tickets.find( '.tribe-timepicker:not(.ui-timepicker-input)' );
		tribe_timepickers.setup_timepickers( $timepickers );

		$ticket_start_date.datepicker( datepickerOpts ).datepicker( "option", "defaultDate", $( document.getElementById( 'EventStartDate' ) ).val() ).keyup( function( e ) {
			if ( e.keyCode === 8 || e.keyCode === 46 ) {
				$.datepicker._clearDate( this );
			}
		} );
		$ticket_end_date.datepicker( datepickerOpts ).datepicker( "option", "defaultDate", $( document.getElementById( 'EventEndDate' ) ).val() ).keyup( function( e ) {
			if ( e.keyCode === 8 || e.keyCode === 46 ) {
				$.datepicker._clearDate( this );
			}
		} );

		/**
		 * Returns the currently selected default ticketing provider.
		 * Defaults to RSVP if something fails
		 *
		 * @since TBD
		 *
		 * @return string
		 */
		function get_default_provider() {
			var $checked_provider = $( 'input[name=default_ticket_provider]', '#tribe_panel_settings' ).filter( ':checked' );
			return ( $checked_provider.length > 0 ) ? $checked_provider.val() : 'Tribe__Tickets__RSVP';
		}

		/**
		 * Sets the ticket edit form provider to the currently selected default ticketing provider.
		 * Defaults to RSVP if something fails
		 *
		 * @since TBD
		 *
		 * @return void
		 */
		function set_default_provider_radio() {
			var $checked_provider = $( 'input[name="default_ticket_provider"]', '#tribe_panel_settings' ).filter( ':checked' );
			var provider_id = 'Tribe__Tickets__RSVP_radio';

			if ( $checked_provider.length > 0 ) {
				provider_id = $checked_provider.val() + '_radio';
			 }

			$( document.getElementById( provider_id ) ).prop( 'checked', true ).trigger('change');
		}

		/**
		 * Returns the current global capacity (via the settings panel.
		 *
		 * @since TBD
		 *
		 * @return string
		 */
		function get_global_cap() {
			return ( $global_capacity_edit.length > 0 ) ? $global_capacity_edit.val() : '';
		}

		/**
		 * When a ticket type is edited we should (re-)establish the UI for showing
		 * and hiding its history, if it has one.
		 */
		function show_hide_ticket_type_history() {
			var $history = $tribe_tickets.find( '.ticket_advanced.history' );

			if ( ! $history.length ) {
				return;
			}

			var $toggle_link      = $history.find( 'a.toggle-history' );
			var $toggle_link_text = $toggle_link.find( 'span' );
			var $history_list     = $history.find( 'ul' );

			$history.on( 'click', '.toggle-history', function( e ) {
				e.preventDefault();
				if ( $history.hasClass( '_show' ) ) {
					$history.removeClass( '_show' );
				} else {
					$history.addClass( '_show' );
				}

			} );
		}

		function show_panel( e, $panel ) {
			if ( e ) {
				e.preventDefault();
			}

			// this way if we don't pass a panel, it works like a 'reset'
			if ( undefined == $panel ) {
				$panel = $base_panel;
			}

			// First, hide them all!
			$panels.each( function() {
				$(this).attr( 'aria-hidden', true );
			} );

			// then show the one we want
			$panel.attr( 'aria-hidden', false );
		}

		/**
		 * Refreshes the base and settings panels when we've changed something
		 *
		 * @since TBD
		 *
		 * @param string optional notice to prepend to the ticket table
		 * @param bool (true) flag for panel swap
		 * @return void
		 */
		function refresh_panels( notice, swap ) {
			// make sure we have this for later (default to true)
			swap = undefined === swap ? true : false;

			var params = {
				action  : 'tribe-ticket-refresh-panels',
				notice: notice,
				post_ID : $post_id.val(),
				nonce   : TribeTickets.add_ticket_nonce
			};

			$.post(
				ajaxurl,
				params,
				function( response ) {
					// Ticket table
					if ( response.data.ticket_table && '' != response.data.ticket_table ) {
						// remove old ticket table
						var $ticket_table = $( document.getElementById( 'ticket_list_wrapper' ) );

						if ( 0 === $ticket_table.length ) {
							// if it's not there, create it :(
							var $container = $( '.tribe_sectionheader.ticket_list_container' );
							$ticket_table = $( '<div>', {id: "ticket_list_wrapper"});
							$container.append( $ticket_table );

							if ( $container.hasClass( 'tribe_no_capacity' ) ) {
								$container.removeClass( 'tribe_no_capacity' );
							}
						}

						$ticket_table.empty();
						// create new ticket table (and notice)
						var $new_table = $( '<div>' );
						$new_table.html( response.data.ticket_table );

						// insert new ticket table
						$ticket_table.append( $new_table );
					}

					// Settings table
					if ( 'undefined' !== response.data.capacity_table ) {
						$( document.getElementById( 'tribe_expanded_capacity_table' ) ).replaceWith( response.data.capacity_table );
					}

					// Total Capacity line
					if ( 'undefined' !== response.data.total_capacity ) {
						var $current_cap_line = $( document.getElementById( 'ticket_form_total_capacity' ) );
						if ( 0 < $current_cap_line.length ) {
							console.log('found');
							$current_cap_line.replaceWith( response.data.total_capacity );
						} else {
							console.log('insert');
							var $wrap = $( '<div class="ticket_table_intro">' );
							$wrap.append( response.data.total_capacity );
							$( '.ticket_list_container' ).removeClass( 'tribe_no_capacity' ).prepend( $wrap );
						}

					}

					// Set Provider radio on ticket form
					set_default_provider_radio();

					$tribe_tickets.trigger( 'tribe-tickets-refresh-tables', response.data );
				} ).complete( function( response ) {
					if ( swap ) {
						show_panel();
					}
				} );
		}

		/* "Settings" button action */
		$( document.getElementById( 'settings_form_toggle' ) ).on( 'click', function( e ) {
			show_panel( e, $settings_panel);
		} );

		/* Settings "Cancel" button action */
		$( document.getElementById( 'tribe_settings_form_cancel' ) ).on( 'click', function( e ) {
			show_panel( e );
		} );

		/* "Save Settings" button action */
		$( document.getElementById( 'tribe_settings_form_save' ) ).on( 'click', function( e ) {
			e.preventDefault();

			// Do this first to prevent weirdness with global capacity
			if ( false === $global_capacity_edit.prop( 'disabled' ) ) {
				$global_capacity_edit.blur();
				$global_capacity_edit.prop( 'disabled', true );
			}

			var form_data = $settings_panel.find( '.settings_field' ).serialize();
			var params    = {
				action  : 'tribe-ticket-save-settings',
				formdata: form_data,
				post_ID : $post_id.val(),
				nonce   : TribeTickets.add_ticket_nonce
			};

			$.post(
				ajaxurl,
				params,
				function( response ) {
					$tribe_tickets.trigger( 'saved-image.tribe', response );
					if ( response.success ) {
						refresh_panels( 'settings' );
					}
				},
				'json'
			);
		} );

		/* "Add ticket" button action */
		$( '.ticket_form_toggle' ).on( 'click', function( e ) {
			e.preventDefault();
			var $default_provider = get_default_provider();
			var global_cap = get_global_cap();

			$tribe_tickets
				.trigger( 'clear.tribe' )
				.trigger( 'focus.tribe' );

			set_default_provider_radio();

			if ( 'rsvp_form_toggle' !== $( this ).closest( 'button' ).attr( 'id' ) ) {
				// Only want to do this if we're setting up a ticket - as opposed to an RSVP
				$( document.getElementById( $default_provider + '_global' ) ).prop( 'checked', true );
				$( document.getElementById( $default_provider + '_global_capacity' ) ).val( global_cap );
				$( document.getElementById( $default_provider + '_global_stock_cap' ) ).attr( 'placeholder', global_cap );
			}

			$edit_panel.find( '.tribe-dependency' ).trigger( 'verify.dependency' );

			$ticket_show_description.prop( 'checked', true );


			// We have to trigger this after verify.dependency, as it enables this field and we want it disabled
			if ( 'ticket_form_toggle' === $( this ).attr( 'id' ) && undefined !== global_cap && 0 < global_cap ) {
				$( document.getElementById( $default_provider + '_global_capacity' ) ).prop( 'disabled', true );
			}

			$( $ticket_start_date, $ticket_end_date, $ticket_start_time, $ticket_end_time ).trigger( 'change' );

			show_panel( e, $edit_panel );
		} );

		/* Ticket "Cancel" button action */
		$( document.getElementById( 'ticket_form_cancel' ) ).on( 'click', function( e ) {
			show_panel( e );

			$tribe_tickets
				.trigger( 'clear.tribe' )
				.trigger( 'focus.tribe' );
		} );

		/* Change global stock type if we've put a value in global_stock_cap */
		$( document ).on( 'blur', '[name="global_stock_cap"]', function( e ) {
			var $this = $( this );
			var $global_field = $this.closest( 'fieldset' ).find( '[name="ticket_global_stock"]' );
			var global_field_val = 'global';

			if ( 0 < $this.val() ) {
				global_field_val = 'capped';
			}

			$global_field.val( global_field_val );
		} );

		/* Change stock cap placeholder (or value) if we change the value in ticket_global_stock */
		$( document ).on( 'blur', '[name="ticket_global_stock"]', function( e ) {
			var $this = $( this );
			var global_cap = $this.val();

			// if we haven't actually changed the value, don't do anything
			if ( $this.prop( 'disabled' ) || 0 === global_cap ) {
				return;
			}

			var $cap_field = $this.closest( 'fieldset' ).find( '[name="global_stock_cap"]' );
			var cap_val = $cap_field.val();

			if ( 'undefined' === cap_val ) {
				$cap_field.val( global_cap );
			} else if ( 0 < cap_val ) {
				var new_val = Math.max( global_cap, cap_val );
			}
		} );

		/* "Save Ticket" button action */
		$( document.getElementById( 'ticket_form_save' ) ).add( $( document.getElementById( 'rsvp_form_save' ) ) ).on( 'click', function( e ) {
			var $form = $( document.getElementById( 'ticket_form_table' ) );
			var type  = $form.find( '.ticket_provider:checked' ).val();

			$tribe_tickets.trigger( 'save-ticket.tribe', e ).trigger( 'spin.tribe', 'start' );

			var form_data = $form.find( '.ticket_field' ).serialize();

			var params = {
				action  : 'tribe-ticket-add-' + $( 'input[name=ticket_provider]:checked' ).val(),
				formdata: form_data,
				post_ID : $post_id.val(),
				nonce   : TribeTickets.add_ticket_nonce
			};

			$.post(
				ajaxurl,
				params,
				function( response ) {
					$tribe_tickets.trigger( 'saved-ticket.tribe', response );

					if ( response.success ) {
						refresh_panels( 'ticket' );
					}
				},
				'json'
			).complete( function() {
				$tribe_tickets.trigger( 'spin.tribe', 'stop' ).trigger( 'focus.tribe' );
			} );

		} );

		/* "Delete Ticket" link action */
		$tribe_tickets.on( 'click', '.ticket_delete', function( e ) {
			if ( ! confirm( tribe_ticket_notices.confirm_alert ) ) {
				return false;
			}

			e.preventDefault();

			$tribe_tickets.trigger( 'delete-ticket.tribe', e ).trigger( 'spin.tribe', 'start' );

			var deleted_ticket_id = $( this ).attr( 'attr-ticket-id' );

			var params = {
				action   : 'tribe-ticket-delete-' + $( this ).attr( 'attr-provider' ),
				post_ID  : $post_id.val(),
				ticket_id: deleted_ticket_id,
				nonce    : TribeTickets.remove_ticket_nonce
			};

			$.post(
				ajaxurl,
				params,
				function( response ) {
					$tribe_tickets.trigger( 'deleted-ticket.tribe', response );

					if ( response.success ) {
						// remove deleted ticket from table
						var $deleted_row = $( document.getElementById( 'tribe_ticket_list_table' ) ).find( '[data-ticket-order-id="order_' + deleted_ticket_id + '"]' );
						$deleted_row.remove();

						refresh_panels( 'delete' );

						show_panel( e );
					}
				},
				'json'
			).complete( function() {
				$tribe_tickets.trigger( 'spin.tribe', 'stop' );
			} );
		} );

		/* "Edit Ticket" link action */
		$tribe_tickets.on( 'click', '.ticket_edit_button', function( e ) {
				e.preventDefault();

				$tribe_tickets.trigger( 'spin.tribe', 'start' );

				var ticket_id = this.getAttribute( 'data-ticket-id' );

				var params = {
					action   : 'tribe-ticket-edit-' + this.getAttribute( 'data-provider' ),
					post_ID  : $post_id.val(),
					ticket_id: ticket_id,
					nonce    : TribeTickets.edit_ticket_nonce
				};

				$.post(
					ajaxurl,
					params,
					function( response ) {

						if ( ! response ) {
							return;
						}

						var regularPrice = response.data.price;
						var salePrice    = regularPrice;
						var onSale       = false;
						var start_date;
						var start_time;
						var end_date;
						var end_time;

						if ( 'undefined' !== typeof response.data.on_sale && response.data.on_sale ) {
							onSale       = true;
							regularPrice = response.data.regular_price;
						}

						// trigger a change event on the provider radio input so the advanced fields can be re-initialized
						$( 'input:radio[name=ticket_provider]' ).filter( '[value=' + response.data.provider_class + ']' ).click();
						$( 'input[name=ticket_provider]:radio' ).change();

						// Capacity/Stock
						if ( response.data.global_stock_mode ) {
							switch ( response.data.global_stock_mode ) {
								case 'global':
								case 'capped':
									$( document.getElementById( response.data.provider_class + '_global' ) ).prop( 'checked', true );
									$( document.getElementById( response.data.provider_class + '_global_capacity' ) ).val( response.data.total_global_stock ).prop( 'disabled', true);
									$( document.getElementById( response.data.provider_class + '_global_stock_cap' ) ).attr( 'placeholder', response.data.total_global_stock);

									if ( undefined !== response.data.global_stock_cap && $.isNumeric( response.data.global_stock_cap ) && 0 < response.data.global_stock_cap ) {
										$( document.getElementById( response.data.provider_class + '_global' ) ).val( 'capped' );
										$( document.getElementById( response.data.provider_class + '_global_stock_cap' ) ).val( response.data.global_stock_cap );
									} else {
										$( document.getElementById( response.data.provider_class + '_global' ) ).val( 'global' );
										$( document.getElementById( response.data.provider_class + '_global_stock_cap' ) ).val( '' );
									}
									break;
								case 'own':
									$( document.getElementById( response.data.provider_class + '_own' ) ).prop( 'checked', true );
									$( document.getElementById( response.data.provider_class + '_capacity' ) ).val( response.data.stock );
									break;
								default:
									// Just in case
									$( document.getElementById( response.data.provider_class + '_unlimited' ) ).prop( 'checked', true );
									$( document.getElementById( response.data.provider_class + '_global_stock_cap' ) ).val( '' );
							}
						} else {
							$( document.getElementById( response.data.provider_class + '_unlimited' ) ).prop( 'checked', true );
							$( document.querySelectorAll( '.ticket_stock' ) ).val( response.data.original_stock );
						}

						$( 'input[name=ticket_global_stock]:radio' ).change();

						$( document.getElementById( 'ticket_id' ) ).val( response.data.ID );
						$( document.getElementById( 'ticket_name' ) ).val( response.data.name );
						$( document.getElementById( 'ticket_description' ) ).val( response.data.description );

						// Compare against 0 for backwards compatibility.
						if ( 0 === parseInt( response.data.show_description ) ) {
							$ticket_show_description.prop( 'checked', true );
						} else {
							$ticket_show_description.removeAttr( 'checked' );
						}

						// handle all the date stuff
						if ( response.data.start_date ) {
							start_date = response.data.start_date;
							start_time = response.data.start_time;
						} else {
							start_date = $( document.getElementById( 'EventStartDate' ) ).val();
							start_time = $( document.getElementById( 'EventStartTime' ) ).val();
						}

						$ticket_start_date.val( start_date ).trigger( 'change' );
						$ticket_start_time.val( start_time ).trigger( 'change' );

						if ( response.data.end_date ) {
							end_date = response.data.end_date;
							end_time = response.data.end_time;
						} else {
							end_date = $( document.getElementById( 'EventEndDate' ) ).val();
							end_time = $( document.getElementById( 'EventEndTime' ) ).val();
						}

						$ticket_end_date.val( end_date ).trigger( 'change' );
						$ticket_end_time.val( end_time ).trigger( 'change' );

						$( document.getElementById( response.data.provider_class + '_advanced' ) ).replaceWith( response.data.advanced_fields );

						// set the prices
						var $ticket_price = $tribe_tickets.find( '#ticket_price' );
						$ticket_price.val( regularPrice );

						if ( 'undefined' !== typeof response.data.disallow_update_price_message ) {
							$ticket_price.siblings( '.no-update-message' ).html( response.data.disallow_update_price_message );
						} else {
							$ticket_price.siblings( '.no-update-message' ).html( '' );
						}

						if ( 'undefined' !== typeof response.data.can_update_price && ! response.data.can_update_price ) {
							$ticket_price.prop( 'disabled', 'disabled' );
							$ticket_price.siblings( '.description' ).hide();
							$ticket_price.siblings( '.no-update-message' ).show();
						} else {
							$ticket_price.removeProp( 'disabled' );
							$ticket_price.siblings( '.description' ).show();
							$ticket_price.siblings( '.no-update-message' ).hide();
						}

						var $sale_field     = $( document.getElementById( 'ticket_sale_price' ) );
						var $sale_container = $sale_field.closest( '.input_block' )

						if ( onSale ) {
							$sale_field.prop( 'readonly', false ).val( salePrice ).prop( 'readonly', true );
							$sale_container.show();
						} else {
							$sale_container.hide();
						}

						if ( 'undefined' !== typeof response.data.purchase_limit && response.data.purchase_limit ) {
							$( document.getElementById( 'ticket_purchase_limit' ) ).val( response.data.purchase_limit );
						}

						if ( response.data.sku ) {
							$( document.querySelectorAll( '.sku_input' ) ).val( response.data.sku );
						}

						if ( 'undefined' !== typeof response.data.controls && response.data.controls ) {
							$( document.getElementById( 'ticket_bottom_right' ) ).html( response.data.controls );
						}

						$tribe_tickets.find( '.tribe-bumpdown-trigger' ).bumpdown();

						$( 'a#ticket_form_toggle' ).hide();

						$edit_panel.find( '.tribe-dependency' ).trigger( 'verify.dependency' );
					},
					'json'
				).always( function( response ) {
					$tribe_tickets
						.trigger( 'spin.tribe', 'stop' )
						.trigger( 'focus.tribe' )
						.trigger( 'edit-tickets-complete.tribe' );

					// re-trigger all dependencies
					$edit_panel.find( '.tribe-dependency' ).trigger( 'verify.dependency' );

					if ( response.data.total_global_stock ) {
						$( document.getElementById( response.data.provider_class + '_global_capacity' ) ).prop( 'disabled', true);
					}

					show_panel( e, $edit_panel );
				} );

			} )
			.on( 'keyup', '#ticket_price', function ( e ) {
				e.preventDefault();

				var decimal_point = price_format.decimal;
				var regex         = new RegExp( '[^\-0-9\%\\' + decimal_point + ']+', 'gi' );
				var value         = $( this ).val();
				var newvalue      = value.replace( regex, '' );

				// @todo add info message or tooltip to let people know we are removing the comma or period
				if ( value !== newvalue ) {
					$( this ).val( newvalue );
				}
			} )
			.on( 'click', '#tribe_ticket_header_image, #tribe_ticket_header_preview', function( e ) {
				e.preventDefault();
				ticketHeaderImage.uploader( '', '' );
			} );

		if ( $ticket_image_preview.find( 'img' ).length ) {
			$( document.getElementById( 'tribe_ticket_header_remove' ) ).show();
		}

		/**
		 * Track changes to the global stock level. Changes to the global stock
		 * checkbox itself is handled elsewhere.
		 */
		$global_stock_level.change( function() {
			global_capacity_setting_changed = true;
		} );

		/**
		 * Unset the global stock settings changed flag if the post is being
		 * saved/updated (no need to trigger a confirmation dialog in these
		 * cases).
		 */
		$( 'input[type="submit"]' ).click( function() {
			global_capacity_setting_changed = false;
		} );

		/**
		 * If the user attempts to nav away without saving global stock setting
		 * changes then try to bring this to their attention!
		 */
		$( window ).on( 'beforeunload', function() {
			// If the global stock settings have not changed, do not interfere
			if ( ! global_capacity_setting_changed ) {
				return;
			}

			// We can't trigger a confirm() dialog from within this action but returning
			// a string should achieve effectively the same result
			return tribe_global_stock_admin_ui.nav_away_msg;

		} );

		/* Handle editing global capacity from the settings panel */
		$( document ).on( 'click', '.global_capacity_edit_button', function( e ) {
			e.preventDefault();
			$global_capacity_edit.prop( 'disabled', false ).focus();
		} );

		$( document ).on( 'blur', '#settings_global_capacity_edit', function() {
			var capacity = $( this ).val();

			var params = {
				action   : 'tribe-events-edit-global-capacity',
				post_ID  : $post_id.val(),
				capacity : capacity,
				nonce    : TribeTickets.edit_ticket_nonce
			};

			$.post(
				ajaxurl,
				params,
				function( response ) {
					refresh_panels( null, false );
				} );
		} );

		$( document ).on( 'click', '#tribe_ticket_header_remove', function( e ) {
			e.preventDefault();
			$preview.html( '' );
			$remove.hide();
			$( document.getElementById( 'tribe_ticket_header_image_id' ) ).val( '' );

		} );

		if ( $ticket_image_preview.find( 'img' ).length ) {

			var $tiximg = $ticket_image_preview.find( 'img' );
			$tiximg.removeAttr( 'width' ).removeAttr( 'height' );

			if ( $tribe_tickets.width() < $tiximg.width() ) {
				$tiximg.css( 'width', '95%' );
			}
		}
	} );

} )( window, jQuery );
