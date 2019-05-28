//-*- mode: rjsx-mode;

'use strict';

const React = require('react');

class Search extends React.Component {

  /** called with properties:
   *  app: An instance of the overall app.  Note that props.app.ws
   *       will return an instance of the web services wrapper and
   *       props.app.setContentName(name) will set name of document
   *       in content tab to name and switch to content tab.
   */
  constructor(props) {
    super(props);
    //@TODO
		this.searchEvent = this.searchEvent.bind(this);
		this.linkClick = this.linkClick.bind(this);	
		this.submitEvent = this.submitEvent.bind(this);
		this.searchWordHighlight = this.searchWordHighlight.bind(this);
		this.handleChange = this.handleChange.bind(this);
		this.state = {
			search: [],
			error: false,
			value: "" 
		};
  }

  //@TODO

	searchEvent(value)
	{
		//console.log("Log - " + event.target.value);
		//console.log(await this.props.app.ws.searchDocs(event.target.value));
		if (value !== "")
		{
			let query = value;
			this.props.app.ws.searchDocs(value).then((word) => {
				//console.log(word.results.length);
				if (word.results.length > 0)
				{
					this.setState({
						search: word.results,
						query: query,
						error: false
					});
				}
				else
				{
					this.setState({
						search: word.results,
						query: query,
						error: true
					});
				}
			});
		}
	}

	submitEvent(event)
	{
		event.preventDefault();
		this.searchEvent(this.state.value);
	}


	searchWordHighlight(value) {
    const query = this.state.query;
    const queryWords = this.state.query.split(" ");
    const words = value.split(" ");
    let idx = [];
		let word_arr = [];
    queryWords.forEach((qw) => {
        words.forEach((w, ind) => {
            if(w.toLowerCase().includes(qw.toLowerCase())) {
                idx.push(ind);
								word_arr.push(qw);
            }
        });
    });
		let arr = "";
   	//let pre = "<span key={id}>{" + str.substring(0, str.indexOf(arr)) + "}</span>";
		//let curr = "<span key={id} className=\"search-term\">{" + str.substr(str.indexOf(arr), arr.length) + "}</span>";
		//let post = "<span key={id}>{" + str.substring(str.indexOf(arr) + arr.length) + "}</span>";
		//<span key={id} className="search-term">{arr = str.split(/\W/).filter((val) => val.length > 0).join(""); w + " "}</span>
		return <div> {
        words.map((w, id) => {
            return idx.includes(id) ? 
							<span key={id}>
								<span>{w.substring(0, w.indexOf(w.split(/\W/).filter((val) => val.length > 0).join("")))}</span>
								<span className="search-term">{w.substr(w.indexOf(w.split(/\W/).filter((val) => val.length > 0).join("")), w.split(/\W/).filter((val) => val.length > 0).join("").length)}</span>
								<span >{w.substring(w.indexOf(w.split(/\W/).filter((val) => val.length > 0).join("")) + w.split(/\W/).filter((val) => val.length > 0).join("").length) + " "}</span>
							</span>
							 : <span key={id}>{w + " "}</span>
        })
    } </div>;
	}

	linkClick(event)
	{
		event.preventDefault();
		let name = event.target.href.substring(event.target.href.lastIndexOf("/") + 1);

		this.props.app.setContentName(name);
	}

	handleChange(event) {
    this.setState({value: event.target.value});
  }

	// 

  render() {
    //@TODO
    return <div> 
				<form onSubmit={this.submitEvent}>
					<label>
						<span className="label">Search Terms:</span>
						<span className="control">
							<input id="q" name="q" value={this.state.value} onBlur={this.submitEvent} onChange={this.handleChange}/>				
							<br/>	
						</span>
					</label>
				</form>
				<div>
					{
						this.state.search.map((val, ind) => {return <div className="result" key={ind}><a className="result-name" href={val.name} onClick={this.linkClick}>{val.name}</a>
								<br/>
								{
									val.lines.map((line, idx) => {
										return <div key={idx}>{this.searchWordHighlight(line)}</div>
									})
								}
							</div>
						})
					}	
				</div>
				{
					this.state.error? <span className="error">No results for {this.state.query}</span>:<div></div>
				}
			</div>
		}

}

module.exports = Search;
