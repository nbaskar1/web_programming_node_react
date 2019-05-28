'use strict';

const express = require('express');
const upload = require('multer')();
const fs = require('fs');
const bodyParser = require('body-parser');
const mustache = require('mustache');
const Path = require('path');
const { URL } = require('url');

const STATIC_DIR = 'statics';
const TEMPLATES_DIR = 'templates';

function serve(port, base, model) {
  const app = express();
  app.locals.port = port;
  app.locals.base = base;
  app.locals.model = model;
  process.chdir(__dirname);
  app.use(base, express.static(STATIC_DIR));
  setupTemplates(app, TEMPLATES_DIR);
  setupRoutes(app);
  app.listen(port, function() {
    console.log(`listening on port ${port}`);
  });
}


module.exports = serve;

/******************************** Routes *******************************/

function setupRoutes(app) {
  //@TODO add appropriate routes
	const base = app.locals.base;
	app.get(`${base}/add.html`, addDoc(app));	
	app.post(`${base}/add.html`, upload.single('file'),
	   addDocContent(app));
	app.get(`${base}/search.html`, searchDoc(app));	
  app.get(`${base}/:id.html`, getDoc(app));
}


/*************************** Action Routines ***************************/

//@TODO add action routines for routes + any auxiliary functions.


function addDoc(app)
{
	return async function(req, res)
	{
		const model = {base: app.locals.base}
		const html = doMustache(app, 'add', model);
		res.send(html);
	};
}

function addDocContent(app) 
{  
	return async function(req, res) 
	{
    let errors = "";
		let doc;
		let model;
		let html;
    try 
		{
			doc = req.file;
			if (doc === undefined)
			{
				throw new Error("please select a file containing a document to upload");
			}
			doc = addContentFields(doc);
			await app.locals.model.create(doc);
			res.redirect(`${app.locals.base}/${doc.name}.html`);
    }
    catch (err) 
		{
			errors = wsErrors(err);
    }

    if (doc === undefined) 
		{
			model = errorModel(app, {}, errors);
			html = doMustache(app, 'add', model);
    	res.send(html);
		}
  };
};

function searchDoc(app)
{
	return async function(req, res)
	{
		let errors = "";
		let query = "", q = "", start = "";
		let model, html;
		let search_result = {};
		//console.log(req);
		try
		{
			query = req.query;
			q = query["q"];
			start = query["start"];

			if (start !== undefined)
			{
				search_result = await app.locals.model.search(q, start);
			}
			else
			{
				search_result = await app.locals.model.search(q, 0)
			}
			
			search_result = addSearchFields(app, req, search_result, q);
		}
		catch(err)
		{
			errors = wsErrors(err);
		}
		
		model = searchModel(app, search_result, errors);
		html = doMustache(app, 'search', model);
		res.send(html);
	};
}

function getDoc(app)
{
	return async function(req, res)
	{
		let model;
		const id = req.params.id;
		try
		{
			const doc = await app.locals.model.get(id);
			model = {base: app.locals.base, name: id, content: doc.content};
			//console.log(model);
		}
		catch(err)
		{
			//console.error(err);
			const errors = wsErrors(err);
			model = errorModel(app, {}, errors);
		}
		const html = doMustache(app, 'create', model);
		res.send(html);
	};
}

/************************ General Utilities ****************************/

/** Decode an error thrown by web services into an errors hash
	* with a _ key.
	*/

function addContentFields(values)
{
	values.name = values["originalname"].substring(0, values["originalname"].search(/\./));
	values.content = values["buffer"].toString('utf8');
	return(values);
}

function addSearchFields(app, req, values, q)
{
	let results = values.results;
	let line_words;
	results.forEach(function (element) {
		element.doc_link = relativeUrl(req, app.locals.base + "/" + element.name + ".html", "", "");
		element.lines.forEach(function (element_line, index) {
			element.lines[index] = searchWordHighlight(element_line, q);
		});
	});
	values.results = results;

	values.q = q;

	let links = values.links;
	let href;
	links.forEach(function (element) {
		href = element.href;

		let regex = /%20/g;

		href = href.replace(regex, " ");

		if (element.rel === "previous")
		{
			values.prev_link = relativeUrl(req, app.locals.base + "/search.html", 
				{
					q: href.substring(href.search(/\?q/) + 3, href.search(/&start/)), // +3 to search, is for ignoring ?q=
					start: href.substring(href.search(/&start/) + 7, href.search(/&count/)) // +7 is to ignore &start=
				}
				, "");
		}
		else if (element.rel == "next")
		{
			values.next_link = relativeUrl(req, app.locals.base + "/search.html", 
				{
					q: href.substring(href.search(/\?q/) + 3, href.search(/&start/)), // +3 to search, is for ignoring ?q=
					start: href.substring(href.search(/&start/) + 7, href.search(/&count/)) // +7 is to ignore &start=
				}
				, "");
		}
		else
		{
			values.rel_link = relativeUrl(req, app.locals.base + "/search.html", 
				{
					q: href.substring(href.search(/\?q/) + 3, href.search(/&start/)), // +3 to search, is for ignoring ?q=
					start: href.substring(href.search(/&start/) + 7, href.search(/&count/)) // +7 is to ignore &start=
				}
				, "");
		}
	});

	return values;
}


function searchWordHighlight(value, q)
{
	let line = value.toLowerCase();
	//q = q.toLowerCase();
	let words = q.split(" ");

	let regex, matched, word_length;
	let span_init = "<span class='search-term'>";
	let span_fin = "</span>";
	let count = 0;
	words.map((val) => {
		word_length = val.length;
		regex = new RegExp(val, "gi");
		count = 0;
		while((matched = regex.exec(line)) !== null)
		{
			matched.index = matched.index + (count * (span_init.length + span_fin.length));
			value = value.substring(0, matched.index) + span_init + value.substr(matched.index, word_length) + span_fin + value.substring(matched.index + word_length);
			count = count + 1;
		}
		line = value.toLowerCase();
	});
	return value;
}

function wsErrors(err)
{
	const msg = (err.message) ? err.message : 'web service error';
	return { _: [ msg ]};
}


function searchModel(app, values, errors={})
{
	let ret =
	({
		base: app.locals.base,
		results: values.results,
		errors: errors._,
		q: values.q,
		prev_link: values.prev_link,
		next_link: values.next_link,
		rel_link: values.rel_link,
	});

	if (values.totalCount === 0 && values.q !== undefined)
	{
		ret.errors = "no document containing \"" + values.q + "\" found; please retry";
	}

	return ret;
}


/** Return a model suitable for mixing into template */
function errorModel(app, values={}, errors={})
{
	let ret = 
	{
		base: app.locals.base,
		errors: errors._,
		fields: values
	};
	return ret;
}


/** return object containing all non-empty values from object values */
function getNonEmptyValues(values) {
  const out = {};
  Object.keys(values).forEach(function(k) {
    const v = values[k];
    if (v && v.trim().length > 0) out[k] = v.trim();
  });
  return out;
}


/** Return a URL relative to req.originalUrl.  Returned URL path
 *  determined by path (which is absolute if starting with /). For
 *  example, specifying path as ../search.html will return a URL which
 *  is a sibling of the current document.  Object queryParams are
 *  encoded into the result's query-string and hash is set up as a
 *  fragment identifier for the result.
 */
function relativeUrl(req, path='', queryParams={}, hash='') {
  const url = new URL('http://dummy.com');
  url.protocol = req.protocol;
  url.hostname = req.hostname;
  url.port = req.socket.address().port;
  url.pathname = req.originalUrl.replace(/(\?.*)?$/, '');
  if (path.startsWith('/')) {
    url.pathname = path;
  }
  else if (path) {
    url.pathname += `/${path}`;
  }
  url.search = '';
  Object.entries(queryParams).forEach(([k, v]) => {
    url.searchParams.set(k, v);
  });
  url.hash = hash;
  return url.toString();
}

/************************** Template Utilities *************************/


/** Return result of mixing view-model view into template templateId
 *  in app templates.
 */
function doMustache(app, templateId, view) {
  const templates = { footer: app.templates.footer };
  return mustache.render(app.templates[templateId], view, templates);
}

/** Add contents all dir/*.ms files to app templates with each 
 *  template being keyed by the basename (sans extensions) of
 *  its file basename.
 */
function setupTemplates(app, dir) {
  app.templates = {};
  for (let fname of fs.readdirSync(dir)) {
    const m = fname.match(/^([\w\-]+)\.ms$/);
    if (!m) continue;
    try {
      app.templates[m[1]] =
	String(fs.readFileSync(`${TEMPLATES_DIR}/${fname}`));
    }
    catch (e) {
      console.error(`cannot read ${fname}: ${e}`);
      process.exit(1);
    }
  }
}

