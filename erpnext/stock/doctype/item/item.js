// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt

frappe.provide("erpnext.item");

frappe.ui.form.on("Item", {
	setup: function(frm) {
		frm.add_fetch('attribute', 'numeric_values', 'numeric_values');
		frm.add_fetch('attribute', 'from_range', 'from_range');
		frm.add_fetch('attribute', 'to_range', 'to_range');
		frm.add_fetch('attribute', 'increment', 'increment');
		frm.add_fetch('tax_type', 'tax_rate', 'tax_rate');
	},
	onload: function(frm) {
		erpnext.item.setup_queries(frm);
		if (frm.doc.variant_of){
			frm.fields_dict["attributes"].grid.set_column_disp("attribute_value", true);
		}

		// should never check Private
		frm.fields_dict["website_image"].df.is_private = 0;

	},

	refresh: function(frm) {
		if(frm.doc.is_stock_item) {
			frm.add_custom_button(__("Balance"), function() {
				frappe.route_options = {
					"item_code": frm.doc.name
				}
				frappe.set_route("query-report", "Stock Balance");
			}, __("View"));
			frm.add_custom_button(__("Ledger"), function() {
				frappe.route_options = {
					"item_code": frm.doc.name
				}
				frappe.set_route("query-report", "Stock Ledger");
			}, __("View"));
			frm.add_custom_button(__("Projected"), function() {
				frappe.route_options = {
					"item_code": frm.doc.name
				}
				frappe.set_route("query-report", "Stock Projected Qty");
			}, __("View"));
		}

		// make sensitive fields(has_serial_no, is_stock_item, valuation_method)
		// read only if any stock ledger entry exists
		if(!frm.doc.is_fixed_asset) {
			erpnext.item.make_dashboard(frm);
		}

		// clear intro
		frm.set_intro();

		if (frm.doc.has_variants) {
			frm.set_intro(__("This Item is a Template and cannot be used in transactions. Item attributes will be copied over into the variants unless 'No Copy' is set"), true);
			frm.add_custom_button(__("Show Variants"), function() {
				frappe.set_route("List", "Item", {"variant_of": frm.doc.name});
			}, __("View"));

			frm.add_custom_button(__("Variant"), function() {
				erpnext.item.make_variant(frm);
			}, __("Make"));
			frm.page.set_inner_btn_group_as_primary(__("Make"));
		}
		if (frm.doc.variant_of) {
			frm.set_intro(__("This Item is a Variant of {0} (Template). Attributes will be copied over from the template unless 'No Copy' is set", [frm.doc.variant_of]), true);
		}

		if (frappe.defaults.get_default("item_naming_by")!="Naming Series") {
			frm.toggle_display("naming_series", false);
		} else {
			erpnext.toggle_naming_series();
		}

		erpnext.item.edit_prices_button(frm);

		if (!frm.doc.__islocal && frm.doc.is_stock_item) {
			frm.toggle_enable(['has_serial_no', 'is_stock_item', 'valuation_method', 'has_batch_no'],
				(frm.doc.__onload && frm.doc.__onload.sle_exists=="exists") ? false : true);
		}

		erpnext.item.toggle_attributes(frm);

		frm.toggle_enable("is_fixed_asset", (frm.doc.__islocal || (!frm.doc.is_stock_item &&
			((frm.doc.__onload && frm.doc.__onload.asset_exists) ? false : true))));

		frm.add_custom_button(__('Duplicate'), function() {
			var new_item = frappe.model.copy_doc(frm.doc);
			if(new_item.item_name===new_item.item_code) {
				new_item.item_name = null;
			}
			if(new_item.description===new_item.description) {
				new_item.description = null;
			}
			frappe.set_route('Form', 'Item', new_item.name);
		});
	},

	validate: function(frm){
		erpnext.item.weight_to_validate(frm);
	},

	image: function(frm) {
		refresh_field("image_view");
	},

	is_fixed_asset: function(frm) {
		if (frm.doc.is_fixed_asset) {
			frm.set_value("is_stock_item", 0);
		}
	},

	page_name: frappe.utils.warn_page_name_change,

	item_code: function(frm) {
		if(!frm.doc.item_name)
			frm.set_value("item_name", frm.doc.item_code);
		if(!frm.doc.description)
			frm.set_value("description", frm.doc.item_code);
	},

	copy_from_item_group: function(frm) {
		return frm.call({
			doc: frm.doc,
			method: "copy_specification_from_item_group"
		});
	},

	has_variants: function(frm) {
		erpnext.item.toggle_attributes(frm);
	}
});

frappe.ui.form.on('Item Reorder', {
	reorder_levels_add: function(frm, cdt, cdn) {
		var row = frappe.get_doc(cdt, cdn);
		type = frm.doc.default_material_request_type
		row.material_request_type = (type == 'Material Transfer')? 'Transfer' : type;
	}
})

$.extend(erpnext.item, {
	setup_queries: function(frm) {
		frm.fields_dict['expense_account'].get_query = function(doc) {
			return {
				query: "erpnext.controllers.queries.get_expense_account",
			}
		}

		frm.fields_dict['income_account'].get_query = function(doc) {
			return {
				query: "erpnext.controllers.queries.get_income_account"
			}
		}

		frm.fields_dict['buying_cost_center'].get_query = function(doc) {
			return {
				filters: { "is_group": 0 }
			}
		}

		frm.fields_dict['selling_cost_center'].get_query = function(doc) {
			return {
				filters: { "is_group": 0 }
			}
		}


		frm.fields_dict['taxes'].grid.get_field("tax_type").get_query = function(doc, cdt, cdn) {
			return {
				filters: [
					['Account', 'account_type', 'in',
						'Tax, Chargeable, Income Account, Expense Account'],
					['Account', 'docstatus', '!=', 2]
				]
			}
		}

		frm.fields_dict['item_group'].get_query = function(doc, cdt, cdn) {
			return {
				filters: [
					['Item Group', 'docstatus', '!=', 2]
				]
			}
		}

		frm.fields_dict.customer_items.grid.get_field("customer_name").get_query = function(doc, cdt, cdn) {
			return { query: "erpnext.controllers.queries.customer_query" }
		}

		frm.fields_dict.supplier_items.grid.get_field("supplier").get_query = function(doc, cdt, cdn) {
			return { query: "erpnext.controllers.queries.supplier_query" }
		}

		frm.fields_dict['default_warehouse'].get_query = function(doc) {
			return {
				filters: { "is_group": 0 }
			}
		}

		frm.fields_dict.reorder_levels.grid.get_field("warehouse_group").get_query = function(doc, cdt, cdn) {
			return {
				filters: { "is_group": 1 }
			}
		}

		frm.fields_dict.reorder_levels.grid.get_field("warehouse").get_query = function(doc, cdt, cdn) {
			var d = locals[cdt][cdn];

			var filters = {
				"is_group": 0
			}

			if (d.parent_warehouse) {
				filters.extend({"parent_warehouse": d.warehouse_group})
			}

			return {
				filters: filters
			}
		}

	},

	make_dashboard: function(frm) {
		if(frm.doc.__islocal)
			return;

		frappe.require('assets/js/item-dashboard.min.js', function() {
			var section = frm.dashboard.add_section('<h5 style="margin-top: 0px;">\
				<a href="#stock-balance">Stock Levels</a></h5>');
			erpnext.item.item_dashboard = new erpnext.stock.ItemDashboard({
				parent: section,
				item_code: frm.doc.name
			});
			erpnext.item.item_dashboard.refresh();
		});
	},

	edit_prices_button: function(frm) {
		frm.add_custom_button(__("Add / Edit Prices"), function() {
			frappe.set_route("List", "Item Price", {"item_code": frm.doc.name});
		}, __("View"));
	},

	weight_to_validate: function(frm){
		if((frm.doc.nett_weight || frm.doc.gross_weight) && !frm.doc.weight_uom) {
			msgprint(__('Weight is mentioned,\nPlease mention "Weight UOM" too'));
			validated = 0;
		}
	},

	make_variant: function(frm) {
		var fields = []

		for(var i=0;i< frm.doc.attributes.length;i++){
			var fieldtype, desc;
			var row = frm.doc.attributes[i];
			if (row.numeric_values){
				fieldtype = "Float";
				desc = "Min Value: "+ row.from_range +" , Max Value: "+ row.to_range +", in Increments of: "+ row.increment
			}
			else {
				fieldtype = "Data";
				desc = ""
			}
			fields = fields.concat({
				"label": row.attribute,
				"fieldname": row.attribute,
				"fieldtype": fieldtype,
				"reqd": 1,
				"description": desc
			})
		}

		var d = new frappe.ui.Dialog({
			title: __("Make Variant"),
			fields: fields
		});

		d.set_primary_action(__("Make"), function() {
			args = d.get_values();
			if(!args) return;
			frappe.call({
				method:"erpnext.controllers.item_variant.get_variant",
				args: {
					"template": frm.doc.name,
					"args": d.get_values()
				},
				callback: function(r) {
					// returns variant item
					if (r.message) {
						var variant = r.message;
						var msgprint_dialog = frappe.msgprint(__("Item Variant {0} already exists with same attributes",
							[repl('<a href="#Form/Item/%(item_encoded)s" class="strong variant-click">%(item)s</a>', {
								item_encoded: encodeURIComponent(variant),
								item: variant
							})]
						));
						msgprint_dialog.hide_on_page_refresh = true;
						msgprint_dialog.$wrapper.find(".variant-click").on("click", function() {
							d.hide();
						});
					} else {
						d.hide();
						frappe.call({
							method:"erpnext.controllers.item_variant.create_variant",
							args: {
								"item": frm.doc.name,
								"args": d.get_values()
							},
							callback: function(r) {
								var doclist = frappe.model.sync(r.message);
								frappe.set_route("Form", doclist[0].doctype, doclist[0].name);
							}
						});
					}
				}
			});
		});

		d.show();

		$.each(d.fields_dict, function(i, field) {

			if(field.df.fieldtype !== "Data") {
				return;
			}

			$(field.input_area).addClass("ui-front");

			field.$input.autocomplete({
				minLength: 0,
				minChars: 0,
				autoFocus: true,
				source: function(request, response) {
					frappe.call({
						method:"frappe.client.get_list",
						args:{
							doctype:"Item Attribute Value",
							filters: [
								["parent","=", i],
								["attribute_value", "like", request.term + "%"]
							],
							fields: ["attribute_value"]
						},
						callback: function(r) {
							if (r.message) {
								response($.map(r.message, function(d) { return d.attribute_value; }));
							}
						}
					});
				},
				select: function(event, ui) {
					field.$input.val(ui.item.value);
					field.$input.trigger("change");
				},
			}).on("focus", function(){
				setTimeout(function() {
					if(!field.$input.val()) {
						field.$input.autocomplete("search", "");
					}
				}, 500);
			});
		});
	},
	toggle_attributes: function(frm) {
		frm.toggle_display("attributes", frm.doc.has_variants || frm.doc.variant_of);
		frm.fields_dict.attributes.grid.toggle_reqd("attribute_value", frm.doc.variant_of ? 1 : 0);
		frm.fields_dict.attributes.grid.set_column_disp("attribute_value", frm.doc.variant_of ? 1 : 0);

		frm.toggle_enable("attributes", !frm.doc.variant_of);
		frm.fields_dict.attributes.grid.toggle_enable("attribute", !frm.doc.variant_of);
		frm.fields_dict.attributes.grid.toggle_enable("attribute_value", !frm.doc.variant_of);
	}
});
cur_frm.fields_dict["sub_category"].get_query = function(doc) {
	return {
		filters: {
			"category": cur_frm.doc.brand
		}
	}
}