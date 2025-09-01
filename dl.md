Embed script:
	<script async src="https://static-au03.vitalstats.app/static/dynamic-list/v1/latest.js" crossorigin="anonymous" />

Basic behavior:
- Immediately upon page load, all elements with `data-dynamic-list="<query uid>"` properties will be located. A "loading" class will be added to them, and removed once the dynamic list is rendered. This is useful for displaying a loading behavior if desired.
- Elements are located using `data-dynamic-list`. It can be any HTML tag. Example: `<div data-dynamic-list="">`.
- For non-table dynamic lists: The content of your parent element (the one with `data-dynamic-list=""`) will be used as the template. For each record, the template will be rendered and any merge codes that correspond to an alias in your query results will be replaced with the value of that record. Place them in square brackets. For example, [id] if you have a query selection that you assign "id" to.


These are the properties you can add to your element, any other customizations you want are super easy to add. But they're all `data-xxx` attributes on the element:

// Required
data-dynamic-list: uid of the query (the ?puid= param from a normal API request)
data-entity: entity slug (e.g., awc, mcgqs, etc.)
data-entity-key: api key. I didn't want to call it `data-api-key`, too easy for bots to parse the HTML.

// Optional
data-op: Provide "subscribe" to make it a subscription. All other values ignored.
data-table: "true" to render as table, anything else is ignored
data-limit: the limit of the query (the &limit=xx in a normal API request)
data-offset: the beginning offset of the query
data-vars-group: the name of the variables group to use (the `&vars_group=` param for a normal API request). Only applies if the query uses variables. Defaults to "Default Group".
data-refresh-button-selector: Any valid query selector to locate an element on the page. An `onClick` listener will be added, and when the element is clicked, the content will fresh. Does not apply when `data-op="subscribe"`. This DOES NOT have to be a <button>. It can be any element at all.

// These only apply when `data-table="true"`
data-theme-mode: Provide "light" or "dark". Defaults to "light".
data-auto-height: Provide "true" to make the table grow to fit all records up to the "limit" value (default = 50). Note that this will prevent scroll bars from appearing in the table, so the parent element must not have a maxHeight.


Example (not a table):
<button id="refresh">Refresh</button>
<div data-dynamic-list="vLbucqzdwlIZxvJ-5SzJW" data-entity-key="your api key" data-limit="100" data-refresh-button-selector="#refresh">
	<div>
	  <p>protocol: [protocol]</p>
	  <p>hostname: [hostname]</p>
	  <p>pathname: [pathname]</p>
	  <p>query string: [search]</p>
	</div>
</div>

Example (table):
<button id="refresh">Refresh</button>
<div data-dynamic-list="vLbucqzdwlIZxvJ-5SzJW" data-entity-key="your api key" data-refresh-button-selector="#refresh" data-table="true"></div>

While the above table example is all that is necessary, I highly advise you to add a CSS class or style tag with the following styles:
display: flex
flex-direction: column