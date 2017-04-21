// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt

frappe.query_reports["Stock Ledger"] = {
	"filters": [
		{
			"fieldname":"company",
			"label": __("Company"),
			"fieldtype": "Link",
			"options": "Company",
			"default": frappe.defaults.get_user_default("Company"),
			"reqd": 1
		},
		{
			"fieldname":"from_date",
			"label": __("From Date"),
			"fieldtype": "Date",
			"default": frappe.datetime.add_months(frappe.datetime.get_today(), -1),
			"reqd": 1
		},
		{
			"fieldname":"to_date",
			"label": __("To Date"),
			"fieldtype": "Date",
			"default": frappe.datetime.get_today(),
			"reqd": 1
		},
		{
			"fieldname":"warehouse",
			"label": __("Warehouse"),
			"fieldtype": "Link",
			"options": "Warehouse"
		},
		{
			"fieldname":"item_code",
			"label": __("Item"),
			"fieldtype": "Link",
			"options": "Item"
		},
		{
			"fieldname":"brand",
			"label": __("Category"),
			"fieldtype": "Link",
			"options": "Brand"
		},
		{
			"fieldname":"voucher_no",
			"label": __("Voucher #"),
			"fieldtype": "Data"
		},
				{
			"fieldname":"sub_category",
			"label": __("Sub Category"),
			"fieldtype": "Link",
			"options": "Sub Category",
			/*Added the Sub Category Filter in Stock Ledger*/ 
			"get_query": function() {
				var brand = frappe.query_report_filters_by_name.brand.get_value();
				return {
					"doctype": "Sub Category",
					"filters": {
						"category": brand,
					}
				}
			}
		}
		
	]
}

