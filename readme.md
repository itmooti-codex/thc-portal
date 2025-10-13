<!-- To dos -->
<!-- 
1) Add loader on checkout page and essentially on all shopping pages
   - this should solve the issues like, on the main item list page itself, the page loads and we see items quite later. We can have loader on the page itself until then. On the checkout page, if i refresh the page, i come to step one form and after a while, it takes me to step 2 or 3, depending on where i was before. We can have loader and finally show the page after it is in the correct form step.

2) On the adress form, the country is not prefilled. It should always be prefilled to Australiad

3) Make sure none of the api call is being made unless i click on next button. A issue that i see is, i emptied the address fields and then refreshed the page and came back to see all the adress fields are now empty for the logged in user and i checked the db for that logged in user record and the user's address were all now empty. We definitely dont want that.

4) Where we show available cards for the logged in user, we need to add one more info and that is card type. Currently, it says for example, Card ending in 4242. We need to say Visa Card ending in 4242. We get card type information from the api like this
  {
      "id": "138",
      "firstname": "Michelle",
      "lastname": "Pratt",
      "contact_id": "358",
      "last4": "9886",
      "type": "1",
      "exp_month": "6",
      "exp_year": "2029",
      "address": "5 Dover close ",
      "address2": "",
      "city": "Lilydale",
      "state": "VIC",
      "zip": "3140",
      "country": "AU",
      "status": "3",
      "recent_sale": "1750735962",
      "invoice_id": "269"
},
Type is numerical and we need to map it to following
"1": "Visa",
"2": "Mastercard",
"3": "AMEX",
"4": "Discover",
"6": "Other"

5) For coupon discounts, update ui states.
    If coupon not found- The current message Coupon not found should be in red and coupon input field should have red border
    If it works, the message should be green, the same color of discount amout we show inthe order summary section and also input field now should have same green color border but we need to remove the red border on the Remove button now as it is not error. We can still have same styling as Apply button for the remove button too. So basically have red and green state for input and message while not changing the style of button but just text based on coupon response

6) On order summary section and everywhere else, replace US with AU as this is australian dollar we are talking about, not United States dollar.

7) for shipping methods, the selected shipping method does not show properly in the review section. It says standard which is incorrect and needs to be dynamic. Also on the review section, we need to update Card ending in 4242 message and make it dynamic as above

8) Shipping rules: If the total cart amount is above 200 dollars, we show new shipping option with id 3, it is free shipping and is selected by default and other methods are hidden

9) The shipping id 2 is only avaialble if the cart has certain product. And the product id is 296. If the item with this product id is in the cart, we show the shipping method with id 2 and hide others. But if other items exists along with this item, we no longer show shipping id 2 but only shipping id 1. However we need a new shipping method that says none and selecting that will not add any shipping fee. We need this to hanlde some ui conflicts because now we dont show all the shipping methods and only one based on the cart condtion and item. So once selected, user cannnot deselect that shipping method again as it is the radio button. so having none option will allow user to have no shipping method for the order

10) After coming to the checkout page, if user removes all the items from the cart either from the order summary section or sidebar, we should disable them to further proceed in the form and make the next button disabled and keep them where they are. There must be item in the cart to proceed.

11) In the checkout page, right below the checkout section, we need to have items grid section same as shop page, so users can easily add items from the checkout page too. This will allow users to qucikly add items to the cart without having to naviagte back to the shop page which is a haslle. This section is exactly the same shop page's grid section and needs to work exactly like that. 


-->