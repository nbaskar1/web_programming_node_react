<!DOCTYPE html>
<html>
  <head>
    <title>{{name}}</title>
		<ul>
			{{#errors}}
			<li class="error">{{.}}</li>
			{{/errors}}
		</ul>
    <link rel="stylesheet" href="{{{base}}}/css/style.css">
  </head>
  <body>
    <h1 class="doc-name">{{name}}</h1>
    <pre class="content">{{content}}</pre>
    {{>footer}}
  </body>
</html>
