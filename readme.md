[REQ 9rn4l1] POST /api-thc/dispenses
[REQ 9rn4l1] body: {"itemId":"364","contactId":"526","quantity":1,"retailPrice":65,"wholesalePrice":27.5}
[OP] POST https://api.ontraport.com/1/Dispenses
[OP] body: {"f3183":"364","f2787":"526","f2261":"149","f2838":1,"f2302":"65.00","f2303":"27.50"}
[OP] 200 https://api.ontraport.com/1/Dispenses {"code":0,"data":{"f3183":"364","f2787":"526","f2261":"149","f2838":1,"f2302":"65.00","f2303":"27.50","id":"733","owner":"1","date":"1760692398","dla":"0","dlm":"1760692398","system_source":"3","source_location":null,"ip_addy":null,"ip_addy_display":null,"import_id":"0","contact_cat":"","bulk_mail":"1","bulk_sms":"0","bindex":"1","profile_image":null,"f2249":"0","f2250":"","f2251":"0","f2262":"0","f2290":"0","page_108_url":"https://app.thehappy.clinic/pharmacy/dispense/3WA57PX","page_108_visits":"0","page_108_template_id":"12","page_108_uvisits":"0","page_108_published":"1","f2704":"","f2708":"0","f2709":"","f2714":"0","f2715":"0","f2716":"0","f2718":"0","f2806":"0.00","f2813":"0","f2840":"","f2841":"0","f2842":"0.00","f2843":"0.00","f2844":"0.00","f2880":"0","f2897":"0","f2898":"0","f2899":"0","f2900":"","page_131_url":"","page_131_visits":"0","page_131_template_id":"0","page_131_uvisits":"0","page_131_published":"0","f3018":"0","f3019":"","f3028":"0.00","f3057":"0","f3131":"0","f3132":"0","updateSequence":"","updateCampaign":"","unique_id":"3WA57PX"},"account_id":266635}
[RES 9rn4l1] POST /api-thc/dispenses -> 200 (1730ms)
[REQ nq3qnq] POST /api-thc/dispenses
[REQ nq3qnq] body: {"itemId":"405","contactId":"526","quantity":1,"retailPrice":20,"retailGst":20,"wholesalePrice":11.5}
[OP] POST https://api.ontraport.com/1/Dispenses
[OP] body: {"f3183":"405","f2787":"526","f2261":"149","f2838":1,"f2302":"20.00","f2806":"20.00","f2303":"11.50"}
[OP] 200 https://api.ontraport.com/1/Dispenses {"code":0,"data":{"f3183":"405","f2787":"526","f2261":"149","f2838":1,"f2302":"20.00","f2806":"20.00","f2303":"11.50","id":"734","owner":"1","date":"1760692401","dla":"0","dlm":"1760692403","system_source":"3","source_location":null,"ip_addy":null,"ip_addy_display":null,"import_id":"0","contact_cat":"","bulk_mail":"1","bulk_sms":"0","bindex":"1","profile_image":null,"f2249":"0","f2250":"","f2251":"0","f2262":"0","f2290":"0","page_108_url":"https://app.thehappy.clinic/pharmacy/dispense/3WA67PX","page_108_visits":"0","page_108_template_id":"12","page_108_uvisits":"0","page_108_published":"1","f2704":"","f2708":"0","f2709":"","f2714":"0","f2715":"0","f2716":"0","f2718":"0","f2813":"0","f2840":"","f2841":"0","f2842":"0.00","f2843":"0.00","f2844":"0.00","f2880":"0","f2897":"0","f2898":"0","f2899":"0","f2900":"","page_131_url":"","page_131_visits":"0","page_131_template_id":"0","page_131_uvisits":"0","page_131_published":"0","f3018":"0","f3019":"","f3028":"0.00","f3057":"0","f3131":"0","f3132":"0","updateSequence":"","updateCampaign":"*/*105*/*","unique_id":"3WA67PX"},"account_id":266635}
[RES nq3qnq] POST /api-thc/dispenses -> 200 (2674ms)
[REQ xqrl25] GET /api-thc/dispenses?contactId=526&limit=200&statusIds=149
[OP] GET https://api.ontraport.com/1/Dispenses?range=200&start=0&count=false&condition=%5B%7B%22field%22%3A%7B%22field%22%3A%22f2787%22%7D%2C%22op%22%3A%22%3D%22%2C%22value%22%3A%7B%22value%22%3A%22526%22%7D%7D%2C%22AND%22%2C%7B%22field%22%3A%7B%22field%22%3A%22f2261%22%7D%2C%22op%22%3A%22%3D%22%2C%22value%22%3A%7B%22value%22%3A%22149%22%7D%7D%5D
[REQ h9kufe] GET /api-thc/contact/526
[OP] GET https://api.ontraport.com/1/Contact?id=526
[OP] 200 https://api.ontraport.com/1/Contact?id=526 {"code":0,"data":{"id":"526","owner":"1","firstname":"Dpes","lastname":"Adikari","email":"dpes.adikari44@gmail.com","address":"31 Bettson Boulevard","city":"Griffin","state":"QLD","zip":"4503","birthday":null,"date":"1759911360","status":null,"priority":"0","user_agent":null,"home_phone":null,"sms_number":"+619840456443","dla":"1760679365","contact_cat":"*/*15*/*","bulk_mail":"1","bulk_sms":"0","office_phone":null,"fax":null,"dlm":"1760692405","company":null,"address2":"","title":null,"website":null,"country":"AU","system_source":"3","source_location":null,"import_id":"0","ip_addy":null,"ip_addy_display":null,"freferrer":"0","lreferrer":"0","n_lead_source":"0","n_content":"0","n_term":"0","n_media":"0","n_medium":"0","n_campaign":"0","l_lead_source":"0","l_content":"0","l_term":"0","l_medium":"0","l_campaign":"0","referral_page":null,"aff_sales":"0","aff_amount":"0","program_id":"1","aff_paypal":null,"fb_gender":null,"mrcAmount":"16.5","mrcUnpaid":"0.00","mriInvoiceNum":"583","mriInvoiceTotal":"16.5","ccType":"1","ccExpirationMonth":"12","ccExpirationYear":"2028","ccExpirationDate":"1861837200","ccNumber":"4242","mrcResult":"0","bindex":"1","last_inbound_sms":null,"timezone":"Australia/Brisbane","time_since_dla":"0","facebook_link":"","instagram_link":"","linkedin_link":"","profile_image":null,"gcid":"","gclid":"","fbc":"","fbp":"","spent":"3642.50","owed":"0","commish":"0","refundtotal":"0","refund":"0","lead":"0","visit":"0","last_currency_used":null,"f2147":"0","page_101_url":"","page_101_visits":"0","page_101_template_id":"0","page_101_uvisits":"0","page_101_published":"0","f2162":"0","f2163":"","f2164":"0","f2165":"0","f2171":"0","f2173":"0","f2175":"0","f2181":"0","f2182":"","f2183":"","f2184":"","f2185":"","f2186":"","f2187":"","f2255":"","f2256":"","f2257":"","f2258":"","f2259":"","f2260":"","f2280":"0","f2281":"0","f2288":"","page_107_url":"","page_107_visits":"0","page_107_template_id":"0","page_107_uvisits":"0","page_107_published":"0","f2305":"0","f2306"
[RES h9kufe] GET /api-thc/contact/526 -> 200 (1396ms)
[REQ qj00s8] GET /api-thc/contact/526/credit-cards
[OP] GET https://api.ontraport.com/1/CreditCards?range=50&count=false&condition=%5B%7B%22field%22%3A%7B%22field%22%3A%22contact_id%22%7D%2C%22op%22%3A%22%3D%22%2C%22value%22%3A%7B%22value%22%3A%22526%22%7D%7D%5D
[OP] 200 https://api.ontraport.com/1/Dispenses?range=200&start=0&count=false&condition=%5B%7B%22field%22%3A%7B%22field%22%3A%22f2787%22%7D%2C%22op%22%3A%22%3D%22%2C%22value%22%3A%7B%22value%22%3A%22526%22%7D%7D%2C%22AND%22%2C%7B%22field%22%3A%7B%22field%22%3A%22f2261%22%7D%2C%22op%22%3A%22%3D%22%2C%22value%22%3A%7B%22value%22%3A%22149%22%7D%7D%5D {"code":0,"data":[{"id":"734","owner":"1","date":"1760692401","dla":"0","dlm":"1760692404","system_source":"3","source_location":null,"ip_addy":null,"ip_addy_display":null,"import_id":"0","contact_cat":"*/*","bulk_mail":"1","bulk_sms":"0","bindex":"1","profile_image":null,"f2249":"0","f2250":"","f2251":"0","f2261":"149","f2262":"0","f2290":"0","page_108_url":"https://app.thehappy.clinic/pharmacy/dispense/3WA67PX","page_108_visits":"0","page_108_template_id":"12","page_108_uvisits":"0","page_108_published":1,"f2302":"20.00","f2303":"11.50","f2704":"","f2708":"0","f2709":"","f2714":"0","f2715":"0","f2716":"0","f2718":"0","f2787":"526","f2806":"20.00","f2813":"0","f2838":"1","f2840":"","f2841":"0","f2842":"0.00","f2843":"0.00","f2844":"0.00","f2880":"0","f2897":"0","f2898":"0","f2899":"0","f2900":"","page_131_url":"","page_131_visits":"0","page_131_template_id":"0","page_131_uvisits":"0","page_131_published":"0","f3018":"0","f3019":"","f3028":"-6.50","f3057":"0","f3131":"0","f3132":"0","f3183":"405","f2251//f2207//firstname":null,"f2251//f2207//lastname":null,"f2251//f2232//f2225":null,"unique_id":"3WA67PX"},{"id":"733","owner":"1","date":"1760692398","dla":"0","dlm":"1760692399","system_source":"3","source_location":null,"ip_addy":null,"ip_addy_display":null,"import_id":"0","contact_cat":"*/*","bulk_mail":"1","bulk_sms":"0","bindex":"1","profile_image":null,"f2249":"0","f2250":"","f2251":"0","f2261":"149","f2262":"0","f2290":"0","page_108_url":"https://app.thehappy.clinic/pharmacy/dispense/3WA57PX","page_108_visits":"0","page_108_template_id":"12","page_108_uvisits":"0","page_108_published":1,"f2302":"65.00","f2303":"27.50","f2704":"","f2708":"0","f2709":"","f2714":"0","f2715":"0","f2716":"0","f2718":"0","f2787":"526","f2806":"0.00","f2813":"0","f2838":"1","f2840":"","f2841":"0","f2842":"0.00","f2843":"0.00","f2844":"0.00","f2880":"0","f2897":"0","f2898":"0","f2899":"0","f2900":"","page_131_url":"","page_131_visits":"0","page_131_template_id":"0","page_131_uvisits":"0
[RES xqrl25] GET /api-thc/dispenses?contactId=526&limit=200&statusIds=149 -> 200 (1585ms)
[OP] 200 https://api.ontraport.com/1/CreditCards?range=50&count=false&condition=%5B%7B%22field%22%3A%7B%22field%22%3A%22contact_id%22%7D%2C%22op%22%3A%22%3D%22%2C%22value%22%3A%7B%22value%22%3A%22526%22%7D%7D%5D {"code":0,"data":[{"id":"234","firstname":"Dpes","lastname":"Adikari","contact_id":"526","last4":"4242","type":"1","exp_month":"12","exp_year":"2028","address":"68 White Clarendon Extension","address2":"Debitis neque sint i","city":"Eiusmod aliquid ipsa","state":"VIC","zip":"Tempor quod qui quis","country":"Australia","status":"3","recent_sale":"1760692263","invoice_id":"583"}],"account_id":266635,"misc":[]}
[RES qj00s8] GET /api-thc/contact/526/credit-cards -> 200 (782ms)
[REQ tyv70w] GET /api-thc/shipping/types?allowed=1,2
[OP] GET https://api.ontraport.com/1/Shippingtypes?range=50&count=false
[OP] 200 https://api.ontraport.com/1/Shippingtypes?range=50&count=false {"code":0,"data":[{"id":"1","name":"STARTRACK","form_id":"0","price":"15.00","rules":"","deleted":"false"},{"id":"2","name":"Pick Up Mullumbimby","form_id":"0","price":"0.00","rules":"","deleted":"false"},{"id":"3","name":"FREE STARTRACK Shipping over $200","form_id":"0","price":"0.00","rules":"","deleted":"false"}],"account_id":266635,"misc":[]}
[RES tyv70w] GET /api-thc/shipping/types?allowed=1,2 -> 304 (1313ms)
[REQ 6qxtyt] GET /api-thc/taxes/1
[OP] GET https://api.ontraport.com/1/Taxtypes?range=50&count=false
[OP] 200 https://api.ontraport.com/1/Taxtypes?range=50&count=false {"code":0,"data":[{"id":"1","name":"GST","form_id":"0","rate":"10.00","rules":"","deleted":"false"}],"account_id":266635,"misc":[]}
[RES 6qxtyt] GET /api-thc/taxes/1 -> 304 (842ms)
[REQ vyfxgd] POST /api-thc/offer/build
[REQ vyfxgd] body: {"cart":{"items":[{"productId":"256","name":"Vaporiser - Yocan Ziva Pro","quantity":1,"price":65,"requiresShipping":true,"taxable":true,"tax_id":"1","taxId":"1","tax_form_id":"1","form_id":"1","tax_name":"GST","taxName":"GST","tax_label":"GST","taxLabel":"GST","tax_rate":10,"taxRate":10},{"productId":"297","name":"CCell M4 Vaporiser","quantity":1,"price":20,"requiresShipping":true,"taxable":false},{"productId":"31","name":"Credit Card Fee","quantity":1,"price":1.53,"taxable":true,"requiresShipping":false,"tax_id":"1","taxId":"1","tax_form_id":"1","form_id":"1","tax_name":"GST","taxName":"GST","tax_label":"GST","taxLabel":"GST","tax_rate":10,"taxRate":10}]},"appliedCoupon":null,"shippingType":{"id":"1","name":"STARTRACK","form_id":"0","price":15,"rules":"","deleted":"false","description":""}}
[RES vyfxgd] POST /api-thc/offer/build -> 200 (1ms)
[REQ w5zhw4] POST /api-thc/offer/build
[REQ w5zhw4] body: {"cart":{"items":[{"productId":"256","name":"Vaporiser - Yocan Ziva Pro","quantity":1,"price":65,"requiresShipping":true,"taxable":true,"tax_id":"1","taxId":"1","tax_form_id":"1","form_id":"1","tax_name":"GST","taxName":"GST","tax_label":"GST","taxLabel":"GST","tax_rate":10,"taxRate":10},{"productId":"297","name":"CCell M4 Vaporiser","quantity":1,"price":20,"requiresShipping":true,"taxable":false},{"productId":"31","name":"Credit Card Fee","quantity":1,"price":1.53,"taxable":true,"requiresShipping":false,"tax_id":"1","taxId":"1","tax_form_id":"1","form_id":"1","tax_name":"GST","taxName":"GST","tax_label":"GST","taxLabel":"GST","tax_rate":10,"taxRate":10}]},"appliedCoupon":null,"shippingType":{"id":"1","name":"STARTRACK","form_id":"0","price":15,"rules":"","deleted":"false","description":""}}
[RES w5zhw4] POST /api-thc/offer/build -> 200 (1ms)
[REQ tfwv2m] POST /api-thc/contact/save
[REQ tfwv2m] body: {"first_name":"Dpes","last_name":"Adikari","email":"dpes.adikari44@gmail.com","phone":"+619840456443"}
[OP] POST https://api.ontraport.com/1/Contacts/saveorupdate
[OP] body: {"firstname":"Dpes","lastname":"Adikari","email":"dpes.adikari44@gmail.com","sms_number":"+619840456443","address":"","address2":"","city":"","state":"","zip":"","country":"","update_by":"email"}
[OP] 200 https://api.ontraport.com/1/Contacts/saveorupdate {"code":0,"data":{"attrs":{"address":"","city":"","state":"","zip":"","dlm":"1760692419","country":"","id":"526"}},"account_id":266635}
[RES tfwv2m] POST /api-thc/contact/save -> 200 (1514ms)
[REQ s0rpc4] GET /api-thc/shipping/types?allowed=1,2
[OP] GET https://api.ontraport.com/1/Shippingtypes?range=50&count=false
[OP] 200 https://api.ontraport.com/1/Shippingtypes?range=50&count=false {"code":0,"data":[{"id":"1","name":"STARTRACK","form_id":"0","price":"15.00","rules":"","deleted":"false"},{"id":"2","name":"Pick Up Mullumbimby","form_id":"0","price":"0.00","rules":"","deleted":"false"},{"id":"3","name":"FREE STARTRACK Shipping over $200","form_id":"0","price":"0.00","rules":"","deleted":"false"}],"account_id":266635,"misc":[]}
[RES s0rpc4] GET /api-thc/shipping/types?allowed=1,2 -> 304 (831ms)
[REQ om9btb] POST /api-thc/offer/build
[REQ om9btb] body: {"cart":{"items":[{"productId":"256","name":"Vaporiser - Yocan Ziva Pro","quantity":1,"price":65,"requiresShipping":true,"taxable":true,"tax_id":"1","taxId":"1","tax_form_id":"1","form_id":"1","tax_name":"GST","taxName":"GST","tax_label":"GST","taxLabel":"GST","tax_rate":10,"taxRate":10},{"productId":"297","name":"CCell M4 Vaporiser","quantity":1,"price":20,"requiresShipping":true,"taxable":false},{"productId":"31","name":"Credit Card Fee","quantity":1,"price":1.53,"taxable":true,"requiresShipping":false,"tax_id":"1","taxId":"1","tax_form_id":"1","form_id":"1","tax_name":"GST","taxName":"GST","tax_label":"GST","taxLabel":"GST","tax_rate":10,"taxRate":10}]},"appliedCoupon":null,"shippingType":{"id":"1","name":"STARTRACK","form_id":"0","price":15,"rules":"","deleted":"false","description":""}}
[RES om9btb] POST /api-thc/offer/build -> 200 (5ms)
[REQ uhgqj7] POST /api-thc/contact/save
[REQ uhgqj7] body: {"first_name":"Dpes","last_name":"Adikari","email":"dpes.adikari44@gmail.com","phone":"+619840456443","f3099":"691","default_shipping_option":"691","address":"31 Bettson Boulevard","city":"Griffin","state":"QLD","zip":"4503","country":"Australia"}
[OP] POST https://api.ontraport.com/1/Contacts/saveorupdate
[OP] body: {"firstname":"Dpes","lastname":"Adikari","email":"dpes.adikari44@gmail.com","sms_number":"+619840456443","address":"31 Bettson Boulevard","address2":"","city":"Griffin","state":"QLD","zip":"4503","country":"Australia","update_by":"email","f3099":"691"}
[OP] 200 https://api.ontraport.com/1/Contacts/saveorupdate {"code":0,"data":{"attrs":{"address":"31 Bettson Boulevard","city":"Griffin","state":"QLD","zip":"4503","dlm":"1760692428","country":"AU","id":"526"}},"account_id":266635}
[RES uhgqj7] POST /api-thc/contact/save -> 200 (2540ms)
[REQ qr077k] POST /api-thc/coupons/validate
[REQ qr077k] body: {"contactId":"526","codes":["100OFF"],"cartProductIds":["256","297"]}
[OP] GET https://api.ontraport.com/1/Coupons?condition=[{"field":{"field":"coupon_code"},"op":"IN","value":{"list":[{"value":"100OFF"},{"value":"100off"}]}}]
[OP] 200 https://api.ontraport.com/1/Coupons?condition=[{"field":{"field":"coupon_code"},"op":"IN","value":{"list":[{"value":"100OFF"},{"value":"100off"}]}}] {"code":0,"data":[{"id":"17","name":"100OFF","type":"group","issued":"-1","redeemed":"1","remaining":"0","total_collected":"16.50","new_buyers":"0","product_selection":"all","discount_type":"flat","discount_value":"100.00","discount_description":"100 OFF","valid_type":null,"valid_start_date":"0","valid_end_date":"0","valid_timeframe":"0","status":"Valid","date":"1760597956","deleted":null,"recurring":"0","coupon_code":"100OFF"}],"account_id":266635,"misc":[]}
[CV] existence query { codes: [ '100OFF' ], variants: [ '100OFF', '100off' ], count: 1 }
[CV] resolved map {
  '100OFF': {
    id: '17',
    name: '100OFF',
    type: 'group',
    issued: '-1',
    redeemed: '1',
    remaining: '0',
    total_collected: '16.50',
    new_buyers: '0',
    product_selection: 'all',
    discount_type: 'flat',
    discount_value: '100.00',
    discount_description: '100 OFF',
    valid_type: null,
    valid_start_date: '0',
    valid_end_date: '0',
    valid_timeframe: '0',
    status: 'Valid',
    date: '1760597956',
    deleted: null,
    recurring: '0',
    coupon_code: '100OFF'
  }
}
[OP] GET https://api.ontraport.com/1/Purchases?condition=[{"field":{"field":"contact_id"},"op":"=","value":{"value":"526"}},"AND",{"field":{"field":"coupon_id"},"op":"=","value":{"value":"17"}}]
[OP] 200 https://api.ontraport.com/1/Purchases?condition=[{"field":{"field":"contact_id"},"op":"=","value":{"value":"526"}},"AND",{"field":{"field":"coupon_id"},"op":"=","value":{"value":"17"}}] {"code":0,"data":[],"account_id":266635,"misc":[]}
[RES qr077k] POST /api-thc/coupons/validate -> 200 (2279ms)
[REQ dzk22g] POST /api-thc/offer/build
[REQ dzk22g] body: {"cart":{"items":[{"productId":"256","name":"Vaporiser - Yocan Ziva Pro","quantity":1,"price":65,"requiresShipping":true,"taxable":true,"tax_id":"1","taxId":"1","tax_form_id":"1","form_id":"1","tax_name":"GST","taxName":"GST","tax_label":"GST","taxLabel":"GST","tax_rate":10,"taxRate":10},{"productId":"297","name":"CCell M4 Vaporiser","quantity":1,"price":20,"requiresShipping":true,"taxable":false},{"productId":"31","name":"Credit Card Fee","quantity":1,"price":1.53,"taxable":true,"requiresShipping":false,"tax_id":"1","taxId":"1","tax_form_id":"1","form_id":"1","tax_name":"GST","taxName":"GST","tax_label":"GST","taxLabel":"GST","tax_rate":10,"taxRate":10}]},"appliedCoupon":{"code":"100OFF","type":"flat","value":100,"normalizedType":"flat","normalizedValue":100,"product_selection":"all","recurring":false},"shippingType":{"id":"1","name":"STARTRACK","form_id":"0","price":15,"rules":"","deleted":"false","description":""}}
[RES dzk22g] POST /api-thc/offer/build -> 200 (7ms)
[REQ 4ddreg] POST /api-thc/offer/build
[REQ 4ddreg] body: {"cart":{"items":[{"productId":"256","name":"Vaporiser - Yocan Ziva Pro","quantity":1,"price":65,"requiresShipping":true,"taxable":true,"tax_id":"1","taxId":"1","tax_form_id":"1","form_id":"1","tax_name":"GST","taxName":"GST","tax_label":"GST","taxLabel":"GST","tax_rate":10,"taxRate":10},{"productId":"297","name":"CCell M4 Vaporiser","quantity":1,"price":20,"requiresShipping":true,"taxable":false},{"productId":"31","name":"Credit Card Fee","quantity":1,"price":1.53,"taxable":true,"requiresShipping":false,"tax_id":"1","taxId":"1","tax_form_id":"1","form_id":"1","tax_name":"GST","taxName":"GST","tax_label":"GST","taxLabel":"GST","tax_rate":10,"taxRate":10}]},"appliedCoupon":{"code":"100OFF","type":"flat","value":100,"normalizedType":"flat","normalizedValue":100,"product_selection":"all","recurring":false},"shippingType":{"id":"1","name":"STARTRACK","form_id":"0","price":15,"rules":"","deleted":"false","description":""}}
[RES 4ddreg] POST /api-thc/offer/build -> 200 (1ms)
[REQ wq7ljg] POST /api-thc/transaction/process
[REQ wq7ljg] body: {"contactId":"526","chargeNow":"chargeNow","offer":{"products":[{"id":"256","quantity":1,"total":"0.00","price":"0.00","taxable":true,"type":"one_time","shipping":true,"amount":"0.00","price_override":true},{"id":"297","quantity":1,"total":"0.00","price":"0.00","taxable":false,"type":"one_time","shipping":true,"amount":"0.00","price_override":true},{"id":"31","quantity":1,"total":"0.00","price":"0.00","taxable":true,"type":"one_time","shipping":false,"amount":"0.00","price_override":true}],"shipping":[{"id":"1","name":"STARTRACK","price":15}],"subTotal":86.53,"grandTotal":15,"hasTaxes":true,"hasShipping":true,"currency_code":"AUD","shipping_charge_recurring_orders":false,"coupon":{"code":"100OFF"},"taxes":[{"id":"1","form_id":"1","taxShipping":true,"name":"GST","tax_name":"GST","label":"GST","taxLabel":"GST","description":"GST","rate":10,"taxTotal":0}]},"external_order_id":"WEB-1760692447917","invoice_template":1,"gateway_id":1,"billing_address":{"address":"31 Bettson Boulevard","city":"Griffin","state":"QLD","zip":"4503","country":"Australia"},"payer":{"cc_id":234,"payment_method":"saved_card","use_saved_card":true,"use_existing":true,"contact_id":526},"cc_id":234,"contact_id":526}
[OP] GET https://api.ontraport.com/1/Products?condition=[{"field":{"field":"Product_ID_Payment"},"op":"IN","value":{"list":[{"value":"256"},{"value":"297"},{"value":"31"}]}}]
[OP] 400 https://api.ontraport.com/1/Products?condition=[{"field":{"field":"Product_ID_Payment"},"op":"IN","value":{"list":[{"value":"256"},{"value":"297"},{"value":"31"}]}}] Invalid query
[OP] GET https://api.ontraport.com/1/Products?condition=[{"field":{"field":"product_id_payment"},"op":"IN","value":{"list":[{"value":"256"},{"value":"297"},{"value":"31"}]}}]
[OP] 400 https://api.ontraport.com/1/Products?condition=[{"field":{"field":"product_id_payment"},"op":"IN","value":{"list":[{"value":"256"},{"value":"297"},{"value":"31"}]}}] Invalid query
[TX] normalized products [
  {
    id: '256',
    quantity: 1,
    total: '0.00',
    price: [ [Object] ],
    taxable: true,
    type: 'one_time',
    shipping: true,
    amount: '0.00',
    price_override: 1,
    price_each: '0.00',
    unit_price: '0.00',
    override_product_price: 1,
    product_id: '256',
    tax: true
  },
  {
    id: '297',
    quantity: 1,
    total: '0.00',
    price: [ [Object] ],
    taxable: false,
    type: 'one_time',
    shipping: true,
    amount: '0.00',
    price_override: 1,
    price_each: '0.00',
    unit_price: '0.00',
    override_product_price: 1,
    product_id: '297',
    tax: false
  },
  {
    id: '31',
    quantity: 1,
    total: '0.00',
    price: [ [Object] ],
    taxable: true,
    type: 'one_time',
    shipping: false,
    amount: '0.00',
    price_override: 1,
    price_each: '0.00',
    unit_price: '0.00',
    override_product_price: 1,
    product_id: '31',
    tax: true
  }
]
[OP] POST https://api.ontraport.com/1/transaction/processManual
[OP] body: {"contact_id":"526","chargeNow":"chargeNow","trans_date":1760692451492,"invoice_template":1,"gateway_id":1,"offer":{"products":[{"id":"256","quantity":1,"total":"0.00","price":[{"price":0,"payment_count":0,"unit":"month"}],"taxable":true,"type":"one_time","shipping":true,"amount":"0.00","price_override":1,"price_each":"0.00","unit_price":"0.00","override_product_price":1,"product_id":"256","tax":true},{"id":"297","quantity":1,"total":"0.00","price":[{"price":0,"payment_count":0,"unit":"month"}],"taxable":false,"type":"one_time","shipping":true,"amount":"0.00","price_override":1,"price_each":"0.00","unit_price":"0.00","override_product_price":1,"product_id":"297","tax":false},{"id":"31","quantity":1,"total":"0.00","price":[{"price":0,"payment_count":0,"unit":"month"}],"taxable":true,"type":"one_time","shipping":false,"amount":"0.00","price_override":1,"price_each":"0.00","unit_price":"0.00","override_product_price":1,"product_id":"31","tax":true}],"shipping":[{"id":1,"name":"STARTRACK","price":15}],"subTotal":"86.53","grandTotal":"15.00","hasTaxes":true,"hasShipping":true,"currency_code":"AUD","shipping_charge_recurring_orders":false,"coupon":{"code":"100OFF"},"taxes":[{"id":1,"form_id":1,"taxShipping":true,"name":"GST","tax_name":"GST","label":"GST","taxLabel":"GST","description":"GST","rate":10,"taxTotal":0}]},"billing_address":{"address":"31 Bettson Boulevard","city":"Griffin","state":"QLD","zip":"4503","country":"Australia"},"payer":{"cc_id":234,"payment_method":"saved_card","use_saved_card":true,"use_existing":true,"contact_id":526},"external_order_id":"WEB-1760692447917","customer_note":"","internal_note":""}
[OP] 200 https://api.ontraport.com/1/transaction/processManual {"code":0,"data":{"result_code":1,"transaction_id":"126423745","external_txn":"000TEST","message":"Success!","invoice_id":584},"account_id":266635}
[RES wq7ljg] POST /api-thc/transaction/process -> 200 (5891ms)
[REQ vxw9nh] PATCH /api-thc/dispenses/733
[REQ vxw9nh] body: {"statusId":"152","quantity":1,"shippingCompany":"328","contactId":"526","patientId":"526"}
[OP] PUT https://api.ontraport.com/1/Dispenses
[OP] body: {"id":"733","f2261":"152","f2838":1,"f2708":"328","f2787":"526"}
[OP] 200 https://api.ontraport.com/1/Dispenses {"code":0,"data":{"attrs":{"dlm":"1760692456","f2261":"152","f2708":"328","id":"733"}},"account_id":266635}
[RES vxw9nh] PATCH /api-thc/dispenses/733 -> 200 (1183ms)
[REQ in6izv] GET /api-thc/shipping/types?allowed=1,2
[OP] GET https://api.ontraport.com/1/Shippingtypes?range=50&count=false
[REQ a8b4ek] PATCH /api-thc/dispenses/734
[REQ a8b4ek] body: {"statusId":"152","quantity":1,"shippingCompany":"328","contactId":"526","patientId":"526"}
[OP] PUT https://api.ontraport.com/1/Dispenses
[OP] body: {"id":"734","f2261":"152","f2838":1,"f2708":"328","f2787":"526"}
[REQ 45iai5] POST /api-thc/offer/build
[REQ 45iai5] body: {"cart":{"items":[{"productId":"256","name":"Vaporiser - Yocan Ziva Pro","quantity":1,"price":65,"requiresShipping":true,"taxable":true,"tax_id":"1","taxId":"1","tax_form_id":"1","form_id":"1","tax_name":"GST","taxName":"GST","tax_label":"GST","taxLabel":"GST","tax_rate":10,"taxRate":10},{"productId":"297","name":"CCell M4 Vaporiser","quantity":1,"price":20,"requiresShipping":true,"taxable":false},{"productId":"31","name":"Credit Card Fee","quantity":1,"price":1.53,"taxable":true,"requiresShipping":false,"tax_id":"1","taxId":"1","tax_form_id":"1","form_id":"1","tax_name":"GST","taxName":"GST","tax_label":"GST","taxLabel":"GST","tax_rate":10,"taxRate":10}]},"appliedCoupon":{"code":"100OFF","type":"flat","value":100,"normalizedType":"flat","normalizedValue":100,"product_selection":"all","recurring":false},"shippingType":{"id":"1","name":"STARTRACK","form_id":"0","price":15,"rules":"","deleted":"false","description":""}}
[RES 45iai5] POST /api-thc/offer/build -> 200 (2ms)
[OP] 200 https://api.ontraport.com/1/Shippingtypes?range=50&count=false {"code":0,"data":[{"id":"1","name":"STARTRACK","form_id":"0","price":"15.00","rules":"","deleted":"false"},{"id":"2","name":"Pick Up Mullumbimby","form_id":"0","price":"0.00","rules":"","deleted":"false"},{"id":"3","name":"FREE STARTRACK Shipping over $200","form_id":"0","price":"0.00","rules":"","deleted":"false"}],"account_id":266635,"misc":[]}
[RES in6izv] GET /api-thc/shipping/types?allowed=1,2 -> 304 (984ms)
[OP] 200 https://api.ontraport.com/1/Dispenses {"code":0,"data":{"attrs":{"dlm":"1760692459","f2261":"152","f2708":"328","id":"734"}},"account_id":266635}
[RES a8b4ek] PATCH /api-thc/dispenses/734 -> 200 (1906ms)
[REQ xdyrw3] POST /api-thc/offer/build
[REQ xdyrw3] body: {"cart":{"items":[{"productId":"256","name":"Vaporiser - Yocan Ziva Pro","quantity":1,"price":65,"requiresShipping":true,"taxable":true,"tax_id":"1","taxId":"1","tax_form_id":"1","form_id":"1","tax_name":"GST","taxName":"GST","tax_label":"GST","taxLabel":"GST","tax_rate":10,"taxRate":10},{"productId":"297","name":"CCell M4 Vaporiser","quantity":1,"price":20,"requiresShipping":true,"taxable":false},{"productId":"31","name":"Credit Card Fee","quantity":1,"price":1.53,"taxable":true,"requiresShipping":false,"tax_id":"1","taxId":"1","tax_form_id":"1","form_id":"1","tax_name":"GST","taxName":"GST","tax_label":"GST","taxLabel":"GST","tax_rate":10,"taxRate":10}]},"appliedCoupon":{"code":"100OFF","type":"flat","value":100,"normalizedType":"flat","normalizedValue":100,"product_selection":"all","recurring":false},"shippingType":{"id":"1","name":"STARTRACK","form_id":"0","price":15,"rules":"","deleted":"false","description":""}}
[RES xdyrw3] POST /api-thc/offer/build -> 200 (2ms)
[REQ s6hpk0] GET /api-thc/shipping/types?allowed=1,2
[OP] GET https://api.ontraport.com/1/Shippingtypes?range=50&count=false
[REQ u1hvn4] POST /api-thc/offer/build
[REQ u1hvn4] body: {"cart":{"items":[{"productId":"256","name":"Vaporiser - Yocan Ziva Pro","quantity":1,"price":65,"requiresShipping":true,"taxable":true,"tax_id":"1","taxId":"1","tax_form_id":"1","form_id":"1","tax_name":"GST","taxName":"GST","tax_label":"GST","taxLabel":"GST","tax_rate":10,"taxRate":10},{"productId":"297","name":"CCell M4 Vaporiser","quantity":1,"price":20,"requiresShipping":true,"taxable":false},{"productId":"31","name":"Credit Card Fee","quantity":1,"price":1.53,"taxable":true,"requiresShipping":false,"tax_id":"1","taxId":"1","tax_form_id":"1","form_id":"1","tax_name":"GST","taxName":"GST","tax_label":"GST","taxLabel":"GST","tax_rate":10,"taxRate":10}]},"appliedCoupon":{"code":"100OFF","type":"flat","value":100,"normalizedType":"flat","normalizedValue":100,"product_selection":"all","recurring":false},"shippingType":{"id":"1","name":"STARTRACK","form_id":"0","price":15,"rules":"","deleted":"false","description":""}}
[RES u1hvn4] POST /api-thc/offer/build -> 200 (1ms)
[REQ 4woopr] POST /api-thc/offer/build
[REQ 4woopr] body: {"cart":{"items":[{"productId":"256","name":"Vaporiser - Yocan Ziva Pro","quantity":1,"price":65,"requiresShipping":true},{"productId":"31","name":"Credit Card Fee","quantity":1,"price":1.17,"taxable":true,"requiresShipping":false,"tax_id":"1","taxId":"1","tax_form_id":"1","form_id":"1","tax_name":"GST","taxName":"GST","tax_label":"GST","taxLabel":"GST","tax_rate":10,"taxRate":10}]},"appliedCoupon":{"code":"100OFF","type":"flat","value":100,"normalizedType":"flat","normalizedValue":100,"product_selection":"all","recurring":false},"shippingType":null}
[RES 4woopr] POST /api-thc/offer/build -> 400 (1ms)
[REQ u09328] POST /api-thc/offer/build
[REQ u09328] body: {"cart":{"items":[{"productId":"256","name":"Vaporiser - Yocan Ziva Pro","quantity":1,"price":65,"requiresShipping":true},{"productId":"297","name":"CCell M4 Vaporiser","quantity":1,"price":20,"requiresShipping":true},{"productId":"31","name":"Credit Card Fee","quantity":1,"price":1.53,"taxable":true,"requiresShipping":false,"tax_id":"1","taxId":"1","tax_form_id":"1","form_id":"1","tax_name":"GST","taxName":"GST","tax_label":"GST","taxLabel":"GST","tax_rate":10,"taxRate":10}]},"appliedCoupon":{"code":"100OFF","type":"flat","value":100,"normalizedType":"flat","normalizedValue":100,"product_selection":"all","recurring":false},"shippingType":null}
[RES u09328] POST /api-thc/offer/build -> 400 (1ms)
[REQ l8uzak] POST /api-thc/offer/build
[REQ l8uzak] body: {"cart":{"items":[{"productId":"256","name":"Vaporiser - Yocan Ziva Pro","quantity":1,"price":65,"requiresShipping":true},{"productId":"297","name":"CCell M4 Vaporiser","quantity":2,"price":20,"requiresShipping":true},{"productId":"31","name":"Credit Card Fee","quantity":1,"price":1.89,"taxable":true,"requiresShipping":false,"tax_id":"1","taxId":"1","tax_form_id":"1","form_id":"1","tax_name":"GST","taxName":"GST","tax_label":"GST","taxLabel":"GST","tax_rate":10,"taxRate":10}]},"appliedCoupon":{"code":"100OFF","type":"flat","value":100,"normalizedType":"flat","normalizedValue":100,"product_selection":"all","recurring":false},"shippingType":null}
[RES l8uzak] POST /api-thc/offer/build -> 400 (0ms)
[OP] 200 https://api.ontraport.com/1/Shippingtypes?range=50&count=false {"code":0,"data":[{"id":"1","name":"STARTRACK","form_id":"0","price":"15.00","rules":"","deleted":"false"},{"id":"2","name":"Pick Up Mullumbimby","form_id":"0","price":"0.00","rules":"","deleted":"false"},{"id":"3","name":"FREE STARTRACK Shipping over $200","form_id":"0","price":"0.00","rules":"","deleted":"false"}],"account_id":266635,"misc":[]}
[RES s6hpk0] GET /api-thc/shipping/types?allowed=1,2 -> 304 (1135ms)
[REQ 45d80c] GET /api-thc/shipping/types?allowed=1,2
[OP] GET https://api.ontraport.com/1/Shippingtypes?range=50&count=false
[REQ gwecpb] POST /api-thc/offer/build
[REQ gwecpb] body: {"cart":{"items":[{"productId":"256","name":"Vaporiser - Yocan Ziva Pro","quantity":1,"price":65,"requiresShipping":true},{"productId":"297","name":"CCell M4 Vaporiser","quantity":2,"price":20,"requiresShipping":true},{"productId":"31","name":"Credit Card Fee","quantity":1,"price":1.89,"taxable":true,"requiresShipping":false,"tax_id":"1","taxId":"1","tax_form_id":"1","form_id":"1","tax_name":"GST","taxName":"GST","tax_label":"GST","taxLabel":"GST","tax_rate":10,"taxRate":10}]},"appliedCoupon":{"code":"100OFF","type":"flat","value":100,"normalizedType":"flat","normalizedValue":100,"product_selection":"all","recurring":false},"shippingType":{"id":"1","name":"STARTRACK","form_id":"0","price":15,"rules":"","deleted":"false","description":""}}
[RES gwecpb] POST /api-thc/offer/build -> 400 (1ms)
[OP] 200 https://api.ontraport.com/1/Shippingtypes?range=50&count=false {"code":0,"data":[{"id":"1","name":"STARTRACK","form_id":"0","price":"15.00","rules":"","deleted":"false"},{"id":"2","name":"Pick Up Mullumbimby","form_id":"0","price":"0.00","rules":"","deleted":"false"},{"id":"3","name":"FREE STARTRACK Shipping over $200","form_id":"0","price":"0.00","rules":"","deleted":"false"}],"account_id":266635,"misc":[]}
[RES 45d80c] GET /api-thc/shipping/types?allowed=1,2 -> 304 (1043ms)
[REQ 48joa0] GET /api-thc/shipping/types?allowed=1,2
[OP] GET https://api.ontraport.com/1/Shippingtypes?range=50&count=false
[OP] 200 https://api.ontraport.com/1/Shippingtypes?range=50&count=false {"code":0,"data":[{"id":"1","name":"STARTRACK","form_id":"0","price":"15.00","rules":"","deleted":"false"},{"id":"2","name":"Pick Up Mullumbimby","form_id":"0","price":"0.00","rules":"","deleted":"false"},{"id":"3","name":"FREE STARTRACK Shipping over $200","form_id":"0","price":"0.00","rules":"","deleted":"false"}],"account_id":266635,"misc":[]}
[RES 48joa0] GET /api-thc/shipping/types?allowed=1,2 -> 304 (999ms)
[REQ k09ger] GET /api-thc/shipping/types?allowed=1,2
[OP] GET https://api.ontraport.com/1/Shippingtypes?range=50&count=false
[OP] 200 https://api.ontraport.com/1/Shippingtypes?range=50&count=false {"code":0,"data":[{"id":"1","name":"STARTRACK","form_id":"0","price":"15.00","rules":"","deleted":"false"},{"id":"2","name":"Pick Up Mullumbimby","form_id":"0","price":"0.00","rules":"","deleted":"false"},{"id":"3","name":"FREE STARTRACK Shipping over $200","form_id":"0","price":"0.00","rules":"","deleted":"false"}],"account_id":266635,"misc":[]}