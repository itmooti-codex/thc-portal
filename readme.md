<!-- 
To dos
Create Dispenses for both items and scripts

Current condtions
For guest user, dispense are created after placing the order which is correct
But if logged in user id exists, we create dispense each time they add the item to the cart and each item will have a new dispense created
So on page load too we fetch dispenses if logged in user id exists as they are the items already in the cart.
To fetch dispense
https://api.ontraport.com/1/Dispenses?range=50&count=false
sample response
{
  "code": 0,
  "data": [
    {
      "id": "525",
      "owner": "1",
      "date": "1758792399",
      "dla": "1758840161",
      "dlm": "1759440639",
      "system_source": "1",
      "source_location": "https://app.thehappy.clinic/",
      "ip_addy": "123.51.11.239",
      "ip_addy_display": "159.196.13.57",
      "import_id": "0",
      "contact_cat": "*/*",
      "bulk_mail": "0",
      "bulk_sms": "0",
      "bindex": "1",
      "profile_image": null,
      "f2249": "1759108500",
      "f2250": "8ZDZ50062399",
      "f2251": "256",
      "f2261": "677",
      "f2262": "2",
      "f2290": "128",
      "page_108_url": "https://app.thehappy.clinic/pharmacy/dispense/3WFX7PX",
      "page_108_visits": "1",
      "page_108_template_id": "40",
      "page_108_uvisits": "1",
      "page_108_published": 1,
      "f2302": "180.00",
      "f2303": "120.00",
      "f2704": "",
      "f2708": "328",
      "f2709": "https://www.startrack.com.au/track/details/8ZDZ50062399",
      "f2714": "329",
      "f2715": "1758840120",
      "f2716": "1758792660",
      "f2718": "0",
      "f2787": "0",
      "f2806": "0.00",
      "f2813": "0",
      "f2838": "1",
      "f2840": "54407867",
      "f2841": "1759154399",
      "f2842": "14.93",
      "f2843": "1.36",
      "f2844": "1.86",
      "f2880": "1758792660",
      "f2897": "0",
      "f2898": "0",
      "f2899": "0",
      "f2900": "",
      "page_131_url": "https://thehappy.clinic/feedback/3WFX7PX",
      "page_131_visits": "0",
      "page_131_template_id": "44",
      "page_131_uvisits": "0",
      "page_131_published": 1,
      "f3018": "1758841440",
      "f3019": "Complete",
      "f3028": "45.00",
      "f3057": "0",
      "f3131": "0",
      "f3132": "0",
      "f2251//f2207//firstname": "Kyle",
      "f2251//f2207//lastname": "Lazich",
      "f2251//f2232//f2225": "Black",
      "unique_id": "3WFX7PX"
    },

    the field mapping looks like this
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

here patient to pay id is what we use as logged in user id to fetch dispenses and items already in the dispense is considered added in cart and can no longer be added in the cart but only quantity can be updated

We use condtion like this below
[{
  "field":{"field":"email"},
  "op":"=",
  "value":{"value":""}
},
"OR",
{
  "field":{"field":"email"},
  "op":"IS",
  "value":"NULL"
}]

we only fetch dispenses that has status In Cart
and any added further items will create new dispense as In cart with following payload
{
"f2290": ",
"f2838": "1", always 1
"f2302": "This is the retail price of item",
"f2261": "149", dispense status as in cart 
"f2806": "Item retail gst",
"f2303": "Item wholesale price",
"f2251": "This is the script id and only for script, not for items",
"f2787": "This is patient to pay id and put logged in user id here"
}

if user removes item from the cart, we update dispense to be Cancelled

updating and creating dispense uses following enpoint
https://api.ontraport.com/1/Dispenses
Method : Post for crate and Put for update

After successfull purchase, we update the all the dispenses status to Paid

Now we need few variable

f2290 is pharmacy to dispense and this variable will exist int he config file and will hold id that we send
simialr with f2787 which will hold logged in user id

we have two grids for items and scripts and script has data-script-id which we use to create dispense and send the script id in the field f2251

for scripts and items, we will have 
data-retail-gst and data-wholesale-price which we will use accordingly
we will have similar for items too to send gst and wholesale price correctly

In the purchase section, if there is value in the retail gst, we add it to final amount
-->