//-*- mode: rjsx-mode;

'use strict';

const React = require('react');

class Add extends React.Component {

  /** called with properties:
   *  app: An instance of the overall app.  Note that props.app.ws
   *       will return an instance of the web services wrapper and
   *       props.app.setContentName(name) will set name of document
   *       in content tab to name and switch to content tab.
   */
  constructor(props) {
    super(props);
    //@TODO
		this.fileAdd = this.fileAdd.bind(this);
  }

  //@TODO add code
	fileAdd(event)
	{
		//console.log(event.target.files[0]);
		//console.log("File Add Content - " + readFile(event.target.files[0]));
		//this.props.app.ws.addContent(event.target.files[0].name, readFile(event.target.files[0]));
		//console.log("Add Content - " + content);
		//this.props.app.setContentName(event.target.files[0].name);

		let file = event.target.files[0];
		let name = file.name.substring(0, file.name.indexOf("."));

		readFile(file).then((content) => {
			this.props.app.ws.addContent(name, content);
			return content;
		}).then((content) => {
				this.props.app.setContentName(name);
		});

	}

  //Note that a you can get information on the file being uploaded by
  //hooking the change event on <input type="file">.  It will have
  //event.target.files[0] set to an object containing information
  //corresponding to the uploaded file.  You can get the contents
  //of the file by calling the provided readFile() function passing
  //this object as the argument.

// <form><label className="label">Choose File:
// </label></form>
  render() {
    //@TODO
    return <input className="control" type="file" onChange={this.fileAdd}/>;
  }

}

module.exports = Add;

/** Return contents of file (of type File) read from user's computer.
 *  The file argument is a file object corresponding to a <input type="file">
 */


async function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>  resolve(reader.result);
    reader.readAsText(file);
  });
}

