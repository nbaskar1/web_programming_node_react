<!DOCTYPE html>
<html>
  <head>
    <title>Add Document</title>
    <link rel="stylesheet" href="{{{base}}}/css/style.css">
  </head>
  <body>
    <h1>Add Document</h1>
    <form method="POST" action="{{{base}}}/add.html" enctype="multipart/form-data">
      <label>
				<span class="label">Choose File:</span>
			 	 
				<input id="file" name="file" type="file">
			</label>
			<br>
			{{#errors}}
				<span class="error">{{.}}</span>
    		<br>
      {{/errors}}
			<input id="submit" class="control" name="submit" type="submit" value="add">
		</form>
    {{>footer}}
  </body>
</html>
