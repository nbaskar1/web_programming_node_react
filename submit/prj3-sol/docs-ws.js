'use strict';

const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const process = require('process');
const url = require('url');
const queryString = require('querystring');

const OK = 200;
const CREATED = 201;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;


//Main URLs
const DOCS = '/docs';
const COMPLETIONS = '/completions';

//Default value for count parameter
const COUNT = 5;

/** Listen on port for incoming requests.  Use docFinder instance
 *  of DocFinder to access document collection methods.
 */
function serve(port, docFinder) {
  const app = express();
  app.locals.port = port;
  app.locals.finder = docFinder;
  setupRoutes(app);
  const server = app.listen(port, async function() {
    console.log(`PID ${process.pid} listening on port ${port}`);
  });
  return server;
}

module.exports = { serve };

function setupRoutes(app) {
  app.use(cors());            //for security workaround in future projects
  app.use(bodyParser.json()); //all incoming bodies are JSON

  //@TODO: add routes for required 4 services
	app.get("/docs/:name", getDoc(app));
	app.get("/completions?:text", getCompletion(app));
	app.get("/docs?:q", searchWord(app));
	app.post("/docs", postContent(app));
  app.use(doErrors()); //must be last; setup for server errors   
}

//@TODO: add handler creation functions called by route setup
//routine for each individual web service.  Note that each
//returned handler should be wrapped using errorWrap() to
//ensure that any internal errors are handled reasonably.
function getDoc(app) 
{
  return errorWrap(async function(req, res) 
	{
    try 
		{
      const name = req.params.name;

			try
			{
				const results = await app.locals.finder.docContent(name);

				const list = [{
					rel: "self", 
					href: baseUrl(req) + name}
				];

				res.json(
				{
					content: results,
					links: list
				});
			}
			catch(err)
			{
				res.status(NOT_FOUND).json ({
					code: "NOT_FOUND",
					message: `Content name ${name} was not found`,
				});
			}
    }
    catch(err) 
		{
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  });
}


function getCompletion(app) 
{
  return errorWrap(async function(req, res) 
	{
    try 
		{
      const text = req.query.text;

			try
			{
				const results = await app.locals.finder.complete(text);

				res.json(results);
			}
			catch(err)
			{
				res.status(NOT_FOUND).json ({
					code: "BAD_PARAM",
					message: "required query parameter \"text\" is missing",
				});
			}
    }
    catch(err) 
		{
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  });
}


function searchWord(app) 
{
  return errorWrap(async function(req, res) 
	{
    try 
		{
    	const q = req.query.q;
			const start_param = req.query.start;
			const count_param = req.query.count; 
			let start = Number(start_param);
			let count = Number(count_param);	

			if(start_param === undefined) // Missing start parameter gets default value
			{
				start = 0;
			}
			else
			{
				let start_test = start_param.match(/[^0-9]/g);

				if(start_test !== null) // Incorrect start parameter
				{
					if (count_param !== undefined)
					{
						let c_test = count_param.match(/[^0-9]/g);

						if (c_test !== null)
						{
							throw{
								code: "BAD_PARAM",
								message: "bad query parameter \"start\" and \"count\""
							};
						}
					}
					throw{
						code: "BAD_PARAM",
						message: "bad query parameter \"start\""
					};
				}				
			}

			if(count_param === undefined) // Missing count parameter gets default value
			{
				count = 5;
			}
			else
			{
				let count_test = count_param.match(/[^0-9]/g);

				if(count_test !== null)	// Incorrect Count parameter
				{
					throw{
						code: "BAD_PARAM",
						message: "bad query parameter \"count\""
					};
				}				
			}

			if (q === undefined)	// Incorrect search parameter
			{
				throw{
					code: "BAD_PARAM",
					message: "required query parameter \"q\" is missing"
				};
			}

			if (count < 0)	// Incorrect count value
			{
				throw{
					code: "BAD_PARAM",
					message: "bad query parameter \"count\""
				};
			}

			const results = await app.locals.finder.find(q);
			
			let top_results = [];
			let lines;
			let temp_result, name, score;
			let total_count = results.length;

			if (start > total_count - 1 && total_count > 0)	// Extra test to make sure that the start parameter does not exceed total records
			{
				throw{
					code: "BAD_PARAM",
					message: "query parameter \"start\" exceeds the total count of matched records"
				};
			}

			let disp_length = start + count;
			let links = [];

			for (let i = start; i < disp_length && i < total_count; i++) // Displaying the requested records
			{
				temp_result = results[i].toString();
				name = temp_result.substring(0, temp_result.indexOf(":"));
				score = Number(temp_result.substring(temp_result.indexOf(":") + 2, temp_result.indexOf("\n")));
				lines = temp_result.substring(temp_result.indexOf("\n") + 1).split("\n,");
				lines = lines.map((val, ind) => 
									{
										if(ind + 1 !== lines.length)
										{
											return(val + "\n");
										}
										return val;
									});
				top_results.push(
				{
					name: name,
					score: score,
					lines: lines,
					href: baseUrl(req) + name
				});
			}

			//console.log(q);
			let re = new RegExp(' ', 'g');
			let search_words = q.replace(re, "%20");	// Link Manipulation(search words)

			// Self Link
			links.push(
			{
				rel: "self", 
				href: baseUrl(req) + "docs?q=" + search_words + "&start=" + start + "&count=" + count
			});

			// Prev Link
			if(start > 0)
			{
				if (start - 5 > 0)
				{
					links.push(
					{
						rel: "prev",
						href: baseUrl(req) + "docs?q=" + search_words + "&start=" + (start - 5) + "&count=5"
					});
				}
				else
				{
					links.push(
					{
						rel: "prev",
						href: baseUrl(req) + "docs?q=" + search_words + "&start=0" + "&count=" + start
					});
				}
			}

			// Next Link
			if (start + count + 5 <= total_count)
			{
				links.push(
				{
					rel: "next",
					href: baseUrl(req) + "docs?q=" + search_words + "&start=" + (start + count) + "&count=5"
				});
			}
			else if (start + count < total_count)
			{
				links.push(
				{
					rel: "next",
					href: baseUrl(req) + "docs?q=" + search_words + "&start=" + (start + count) + "&count=" + (total_count - start - count)
				});
			}

			res.json(
			{
				results: top_results,
				totalCount: total_count,
				links: links
			});
    }
    catch(err) 
		{
      res.status(NOT_FOUND).json (err);
    }
  });
}


function postContent(app) 
{
  return errorWrap(async function(req, res) 
	{
    try 
		{
      const body = req.body;
			if (body === undefined)
			{
				throw{
					code: "BAD_PARAM",
					message: "required parameter \"body\" is missing"
				}
			}

			const name = body["name"];
			if (name === undefined)
			{
				throw{
					code: "BAD_PARAM",
					message: "required body parameter \"name\" is missing"
				}
			}

			const content = body["content"];
			if (content === undefined)
			{
				throw{
					code: "BAD_PARAM",
					message: "required body parameter \"content\" is missing"
				}
			}

			const results = await app.locals.finder.addContent(name, content);

			res.json({href: baseUrl(req) + "docs/" + name});
    }
    catch(err) 
		{
      res.status(NOT_FOUND).json (err);
    }
  });
}



/** Return error handler which ensures a server error results in nice
 *  JSON sent back to client with details logged on console.
 */ 
function doErrors(app) {
  return async function(err, req, res, next) {
    res.status(SERVER_ERROR);
    res.json({ code: 'SERVER_ERROR', message: err.message });
    console.error(err);
  };
}

/** Set up error handling for handler by wrapping it in a 
 *  try-catch with chaining to error handler on error.
 */
function errorWrap(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    }
    catch (err) {
      next(err);
    }
  };
}
  

/** Return base URL of req for path.
 *  Useful for building links; Example call: baseUrl(req, DOCS)
 */
function baseUrl(req, path='/') {
  const port = req.app.locals.port;
  const url = `${req.protocol}://${req.hostname}:${port}${path}`;
  return url;
}


const ERROR_MAP = {
  EXISTS: CONFLICT,
  NOT_FOUND: NOT_FOUND
}

/** Map domain/internal errors into suitable HTTP errors.  Return'd
 *  object will have a "status" property corresponding to HTTP status
 *  code.
 */
function mapError(err) {
  console.error(err);
  return err.isDomain
    ? { status: (ERROR_MAP[err.errorCode] || BAD_REQUEST),
	code: err.errorCode,
	message: err.message
      }
    : { status: SERVER_ERROR,
	code: 'INTERNAL',
	message: err.toString()
      };
}
