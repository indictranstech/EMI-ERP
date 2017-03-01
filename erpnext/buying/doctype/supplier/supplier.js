// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt

frappe.ui.form.on("Supplier", {
	setup: function(frm) {
		frm.set_query('default_price_list', { 'buying': 1});
		frm.set_query('account', 'accounts', function(doc, cdt, cdn) {
			var d  = locals[cdt][cdn];
			return {
				filters: {
					'account_type': 'Payable',
					'company': d.company,
					"is_group": 0
				}
			}
		});
	},
	refresh: function(frm) {
		if(frappe.defaults.get_default("supp_master_name")!="Naming Series") {
			frm.toggle_display("naming_series", false);
		} else {
			erpnext.toggle_naming_series();
		}

		if(frm.doc.__islocal){
	    	hide_field(['address_html','contact_html']);
			erpnext.utils.clear_address_and_contact(frm);
		}
		else {
		  	unhide_field(['address_html','contact_html']);
			erpnext.utils.render_address_and_contact(frm);

			// custom buttons
			frm.add_custom_button(__('Accounting Ledger'), function() {
				frappe.set_route('query-report', 'General Ledger',
					{party_type:'Supplier', party:frm.doc.name});
			});
			frm.add_custom_button(__('Accounts Payable'), function() {
				frappe.set_route('query-report', 'Accounts Payable', {supplier:frm.doc.name});
			});
			frm.add_custom_button(__('Vendor Evaluation'), function() {
				if(!frm.is_new())
				{
					frappe.set_route("List", "Vendor Evaluation", {"supplier": frm.doc.name});
				}
				else
				{
				frappe.new_doc("Vendor Evaluation", true);
				}
			});
			// indicators
			erpnext.utils.set_party_dashboard_indicators(frm);
		}
	},
});
