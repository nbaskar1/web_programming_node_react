//-*- mode: rjsx-mode;

'use strict';

const React = require('react');

class Content extends React.Component {

  /** called with properties:
   *  app: An instance of the overall app.  Note that props.app.ws
   *       will return an instance of the web services wrapper and
   *       props.app.setContentName(name) will set name of document
   *       in content tab to name and switch to content tab.
   *  name:Name of document to be displayed.
   */
  constructor(props) {
    super(props);
    //@TODO
		this.getContent = this.getContent.bind(this);
		this.state = {
			name: "",
			content: ""
		};
  }

  //@TODO

	componentWillReceiveProps(nextProps)
	{
		//console.log(this.props.name + " - " + nextProps.name);
		if (nextProps.name !== this.props.name)
		{
			this.getContent(nextProps);
		}
	}

	componentWillMount()
	{
		this.getContent(this.props);
	}

	/*componentWillUnMount()
	{
		this.setState({content: ""});
	}*/
	

	getContent(props)
	{
		if (props.name !== "" && props.name !== undefined)
		{
			//console.log("Function getContent - " + props.name);
			this.props.app.ws.getContent(props.name).then((content) => {
				//console.log(content); 
				this.setState({
					name: props.name,
					content: content.content
				});
			});
			//console.log("Check - " + this.state.content);
		}
		else
		{
			this.setState({content: ""});
		}
	}

  render() {
    //@TODO
    return <section><h1>{this.state.name}</h1><pre>{this.state.content}</pre></section>;
  }

}

module.exports = Content;
