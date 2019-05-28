<!DOCTYPE html>
<html>
  <head>
    <title>Documents Collection Search</title>
    <link rel="stylesheet" href="{{{base}}}/css/style.css">
  </head>
  <body>
    <h1>Documents Collection Search</h1>
		<ul>			
			{{#errors}}
				  <li class="error">{{.}}</li>
			{{/errors}}
		</ul> 
    <form method="GET" action="{{{base}}}/search.html">
			<p>Please fill in one or more search terms in the field below:</p>     
			<label>
				<span class="label">Search Terms:</span>
			 	 
				<input id="query" name="q" type="" value="{{q}}" placeholder="Enter Search Term here">
			</label>
			<br>
			<input id="submit" class="control" name="submit" type="submit" value="search">
		</form>
		{{#results.length}}
			<h2>Search Results</h2>
		{{/results.length}}
		{{#results}}
			<p class="result">
				<a class="doc-name" href="{{doc_link}}">{{name}}</a>
				<br>
				{{#lines}}
					{{{.}}}<br>
				{{/lines}}
			</p>
		{{/results}}
		{{#prev_link}}
			<a id="previous" href="{{.}}">Previous</a>
			 
		{{/prev_link}}
		{{#next_link}}
			<a id="next" href="{{.}}">Next</a>
		{{/next_link}}
    {{>footer}}
  </body>
</html>
