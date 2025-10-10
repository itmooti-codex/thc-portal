<!-- 
Now after successfull purchase of product, we send one more request to create Dispense
https://api.ontraport.com/1/Dispenses
this is what data looks like
{
  "code": 0,
  "data": {
    "id": "604",
    "owner": "1",
    "date": "1760075276",
    "dla": "0",
    "dlm": "1760075276",
    "system_source": "3",
    "source_location": null,
    "ip_addy": null,
    "ip_addy_display": null,
    "import_id": "0",
    "contact_cat": "",
    "bulk_mail": "1",
    "bulk_sms": "0",
    "bindex": "1",
    "profile_image": null,
    "f2249": "0",
    "f2250": "",
    "f2251": "0",
    "f2261": "0",
    "f2262": "0",
    "f2290": "0",
    "page_108_url": "https://app.thehappy.clinic/pharmacy/dispense/3WDO7PX",
    "page_108_visits": "0",
    "page_108_template_id": "12",
    "page_108_uvisits": "0",
    "page_108_published": "1",
    "f2302": "0.00",
    "f2303": "0.00",
    "f2704": "",
    "f2708": "0",
    "f2709": "",
    "f2714": "0",
    "f2715": "0",
    "f2716": "0",
    "f2718": "0",
    "f2787": "0",
    "f2806": "0.00",
    "f2813": "0",
    "f2838": "0",
    "f2840": "",
    "f2841": "0",
    "f2842": "0.00",
    "f2843": "0.00",
    "f2844": "0.00",
    "f2880": "0",
    "f2897": "0",
    "f2898": "0",
    "f2899": "0",
    "f2900": "",
    "page_131_url": "",
    "page_131_visits": "0",
    "page_131_template_id": "0",
    "page_131_uvisits": "0",
    "page_131_published": "0",
    "f3018": "0",
    "f3019": "",
    "f3028": "0.00",
    "f3057": "0",
    "f3131": "0",
    "f3132": "0",
    "updateSequence": "",
    "updateCampaign": "",
    "unique_id": "3WDO7PX"
  },
  "account_id": 266635
}
we dont send all
we send few
but first lets see what each fields mean
{
  "code": 0,
  "data": {
    "10005": {
      "name": "oDispenses",
      "fields": {
        "f3101": {
          "alias": "Stock Status",
          "type": "related_data",
          "required": 0,
          "unique": 0,
          "editable": 0,
          "deletable": 1,
          "extra_data": "f2251//f2232//f2304"
        },
        "f2880": {
          "alias": "Date Pharmacy Notified",
          "type": "timestamp",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f2715": {
          "alias": "Time Confirmed",
          "type": "timestamp",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f3018": {
          "alias": "Time Tracking Added",
          "type": "timestamp",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f2249": {
          "alias": "Time Fulfilled",
          "type": "timestamp",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f3057": {
          "alias": "Time Set On Hold",
          "type": "timestamp",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f2840": {
          "alias": "consignmentID",
          "type": "text",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f2841": {
          "alias": "eta_datetime",
          "type": "timestamp",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f2842": {
          "alias": "ms_shipping_cost",
          "type": "price",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f2843": {
          "alias": "ms_tax_amount",
          "type": "price",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f2844": {
          "alias": "ms_fuel_levy",
          "type": "price",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f3019": {
          "alias": "consignmentStatus",
          "type": "text",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "id": {
          "alias": "ID",
          "type": "numeric",
          "required": 0,
          "unique": 0,
          "editable": 0,
          "deletable": 0
        },
        "date": {
          "alias": "Date Added",
          "type": "timestamp",
          "required": 0,
          "unique": 0,
          "editable": 0,
          "deletable": 0
        },
        "dla": {
          "alias": "Last Activity",
          "type": "timestamp",
          "required": 0,
          "unique": 0,
          "editable": 0,
          "deletable": 0
        },
        "date_last_email_received": {
          "alias": "Last Email Received",
          "type": "timestamp",
          "required": 0,
          "unique": 0,
          "editable": 0,
          "deletable": 0
        },
        "date_last_sms_sent": {
          "alias": "Last SMS Sent",
          "type": "timestamp",
          "required": 0,
          "unique": 0,
          "editable": 0,
          "deletable": 0
        },
        "profile_image": {
          "alias": "Profile Image",
          "type": "image",
          "required": 0,
          "unique": 0,
          "editable": 0,
          "deletable": 0
        },
        "unique_id": {
          "alias": "Unique ID",
          "type": "unique",
          "required": 0,
          "unique": 1,
          "editable": 0,
          "deletable": 0
        },
        "last_note": {
          "alias": "Last Note",
          "type": "text",
          "required": 0,
          "unique": 0,
          "editable": 0,
          "deletable": 0
        },
        "date_last_email_sent": {
          "alias": "Last Email Sent",
          "type": "timestamp",
          "required": 0,
          "unique": 0,
          "editable": 0,
          "deletable": 0
        },
        "date_last_call_logged": {
          "alias": "Last Call Logged",
          "type": "timestamp",
          "required": 0,
          "unique": 0,
          "editable": 0,
          "deletable": 0
        },
        "owner": {
          "alias": "Owner",
          "type": "parent",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 0,
          "parent_object": 2
        },
        "dlm": {
          "alias": "Date Modified",
          "type": "timestamp",
          "required": 0,
          "unique": 0,
          "editable": 0,
          "deletable": 0
        },
        "ip_addy": {
          "alias": "IP Address",
          "type": "text",
          "required": 0,
          "unique": 0,
          "editable": 0,
          "deletable": 0
        },
        "date_last_sms_received": {
          "alias": "Last SMS Received",
          "type": "timestamp",
          "required": 0,
          "unique": 0,
          "editable": 0,
          "deletable": 0
        },
        "f2714": {
          "alias": "Pharmacy Action Button",
          "type": "drop",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1,
          "options": {
            "329": "Review",
            "330": "Ready to Ship",
            "331": "Dispense",
            "679": "Take OFF Hold"
          }
        },
        "f2717": {
          "alias": "PharmacyUID",
          "type": "related_data",
          "required": 0,
          "unique": 0,
          "editable": 0,
          "deletable": 1,
          "extra_data": "f2290//unique_id"
        },
        "f2718": {
          "alias": "Notify THC",
          "type": "check",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f3131": {
          "alias": "Catalyst Checked",
          "type": "check",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f3132": {
          "alias": "Last Time Checked",
          "type": "timestamp",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "updateCampaign": {
          "alias": "Automations",
          "type": "subscription",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 0,
          "extra_data": "{\"subModel\":140,\"form\":\"object_editor\",\"saveDraft\":false,\"allowCreate\":1,\"object_type_id\":\"10005\",\"criteria\":{\"condition\":\"[{\\\"field\\\":{\\\"field\\\":\\\"pause\\\"},\\\"op\\\":\\\"<>\\\",\\\"value\\\":{\\\"value\\\":2}}]\"}}"
        },
        "contact_cat": {
          "alias": "Dispense Tags",
          "type": "subscription",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 0,
          "extra_data": "{\"subModel\":14,\"form\":\"object_editor\",\"IOMode\":2,\"object_type_id\":\"10005\",\"criteria\":{\"condition\":\"[{\\\"field\\\":{\\\"field\\\":\\\"object_type_id\\\"},\\\"op\\\":\\\"=\\\",\\\"value\\\":{\\\"value\\\":\\\"10005\\\"}}]\"},\"allowCreate\":\"1\"}"
        },
        "page_108_url": {
          "alias": "PHARMACY: Dispense Add Tracking URL",
          "type": "url",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 0
        },
        "page_108_template_id": {
          "alias": "PHARMACY: Dispense Add Tracking template",
          "type": "parent",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 0,
          "parent_object": 178
        },
        "page_108_published": {
          "alias": "PHARMACY: Dispense Add Tracking published",
          "type": "check",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 0
        },
        "page_108_visits": {
          "alias": "PHARMACY: Dispense Add Tracking visits",
          "type": "numeric",
          "required": 0,
          "unique": 0,
          "editable": 0,
          "deletable": 0
        },
        "page_108_uvisits": {
          "alias": "PHARMACY: Dispense Add Tracking unique visits",
          "type": "numeric",
          "required": 0,
          "unique": 0,
          "editable": 0,
          "deletable": 0
        },
        "f2897": {
          "alias": "Rating Text",
          "type": "drop",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1,
          "options": {
            "607": "1⭐ Poor",
            "608": "2⭐ Fair",
            "609": "3⭐ Okay",
            "610": "4⭐ Good",
            "611": "5⭐ Outstanding"
          }
        },
        "f2898": {
          "alias": "Rating Number",
          "type": "numeric",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f2899": {
          "alias": "Time Rating Given",
          "type": "timestamp",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "page_131_url": {
          "alias": "Feedback Request URL",
          "type": "url",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 0
        },
        "f2250": {
          "alias": "Tracking Number",
          "type": "text",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f2261": {
          "alias": "Dispense Status",
          "type": "drop",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1,
          "options": {
            "146": "Cancelled",
            "147": "In Transit",
            "148": "Confirmed - In Progress",
            "149": "In Cart",
            "151": "Payment Processing",
            "152": "Paid",
            "326": "Sent – Awaiting Confirmation",
            "327": "Payment Issue",
            "605": "Tracking Added",
            "675": "On Hold",
            "677": "Fulfilled"
          }
        },
        "f2251": {
          "alias": "Script",
          "type": "parent",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 0,
          "parent_object": "10002"
        },
        "f2262": {
          "alias": "Dispense Number on Script",
          "type": "numeric",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f2290": {
          "alias": "Pharmacy to Dispense",
          "type": "parent",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 0,
          "parent_object": "0"
        },
        "f2708": {
          "alias": "Shipping Company",
          "type": "drop",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1,
          "options": {
            "328": "Startrack"
          }
        },
        "f2709": {
          "alias": "Tracking Link",
          "type": "url",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f2838": {
          "alias": "Quantity",
          "type": "numeric",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f2301": {
          "alias": "Item Name",
          "type": "related_data",
          "required": 0,
          "unique": 0,
          "editable": 0,
          "deletable": 1,
          "extra_data": "f2251//f2232//f2225"
        },
        "f2302": {
          "alias": "Item Retail Price",
          "type": "price",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f2806": {
          "alias": "Item Retail GST",
          "type": "price",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f2303": {
          "alias": "Item Wholesale Price",
          "type": "price",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f2787": {
          "alias": "Patient to Pay",
          "type": "parent",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 0,
          "parent_object": "0"
        },
        "f2813": {
          "alias": "Flower Grams",
          "type": "numeric",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f3028": {
          "alias": "Item THC Margin",
          "type": "price",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f2790": {
          "alias": "Product ID",
          "type": "related_data",
          "required": 0,
          "unique": 0,
          "editable": 0,
          "deletable": 1,
          "extra_data": "f2251//f2232//f2252"
        },
        "f2891": {
          "alias": "CMI",
          "type": "related_data",
          "required": 0,
          "unique": 0,
          "editable": 0,
          "deletable": 1,
          "extra_data": "f2251//f2232//f2890"
        },
        "f2900": {
          "alias": "Feedback Comment",
          "type": "longtext",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f2704": {
          "alias": "Batch Date Sent",
          "type": "text",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "f2716": {
          "alias": "Date Paid",
          "type": "timestamp",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 1
        },
        "page_131_template_id": {
          "alias": "Feedback Request template",
          "type": "parent",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 0,
          "parent_object": 178
        },
        "page_131_published": {
          "alias": "Feedback Request published",
          "type": "check",
          "required": 0,
          "unique": 0,
          "editable": 1,
          "deletable": 0
        },
        "page_131_visits": {
          "alias": "Feedback Request visits",
          "type": "numeric",
          "required": 0,
          "unique": 0,
          "editable": 0,
          "deletable": 0
        },
        "page_131_uvisits": {
          "alias": "Feedback Request unique visits",
          "type": "numeric",
          "required": 0,
          "unique": 0,
          "editable": 0,
          "deletable": 0
        }
      }
    }
  },
  "account_id": 266635
}


here we send few
dispense status = paid
if startrack shipping is selected, Shipping Company = Startrack
Item Name = Selected Item ID
Item Retail Price = Selected Item Price, no discount and shipping calculated. just the price
Product ID = Selected Item's Product ID that we use also to validate coupons
Patient to pay = send logged in id for now


We create new dispense records for each item added on cart

 -->