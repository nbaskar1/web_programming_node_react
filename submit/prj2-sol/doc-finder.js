const assert = require('assert');
const mongo = require('mongodb').MongoClient;

const {inspect} = require('util'); //for debugging

'use strict';

/** This class is expected to persist its state.  Hence when the
 *  class is created with a specific database url, it is expected
 *  to retain the state it had when it was last used with that URL.
 */ 
class DocFinder {

  /** Constructor for instance of DocFinder. The dbUrl is
   *  expected to be of the form mongodb://SERVER:PORT/DB
   *  where SERVER/PORT specifies the server and port on
   *  which the mongo database server is running and DB is
   *  name of the database within that database server which
   *  hosts the persistent content provided by this class.
   */
  constructor(dbUrl) {
    //TODO
	this.dbUrl = dbUrl;
	this.db_name = dbUrl.slice(dbUrl.lastIndexOf("/") + 1);
	//console.log("Data base - " + this.db);
	this.noise_words = new Set();
	this.count = 0;
  }

	

  /** This routine is used for all asynchronous initialization
   *  for instance of DocFinder.  It must be called by a client
   *  immediately after creating a new instance of this.
   */
  async init() {
    //TODO
	this.client = await mongo.connect(this.dbUrl, MONGO_OPTIONS);
	this.db = this.client.db(this.db_name);
  }

  /** Release all resources held by this doc-finder.  Specifically,
   *  close any database connections.
   */
  async close() {
    //TODO
	this.client.close();
  }

  /** Clear database */
  async clear() {
    //TODO
	await this.db.dropDatabase();
  }

  /** Return an array of non-noise normalized words from string
   *  contentText.  Non-noise means it is not a word in the noiseWords
   *  which have been added to this object.  Normalized means that
   *  words are lower-cased, have been stemmed and all non-alphabetic
   *  characters matching regex [^a-z] have been removed.
   */
  async words(contentText) {
    //TODO
    let return_list = [];
	/* 
		Words low returns a list of [word, index] for all contents;
		Map function takes out the denoised, normalized word and pushes that into return_list
	*/
	return_list = await this._wordsLow(contentText);
	return_list = return_list.map(pair => pair[0]);
	return return_list;
  }


  async _wordsLow(content)
  {
	let return_list = [];
	let match;
	const dbNoise = await this.db.collection("noiseWords");
	//let count = 0;
	/*
		Word_Regex => Maximum non space sequence of characters
		For every match of the Regex, 
		the matched word is denoised, normalized and pushed to return_list as [word, index]
	*/

	if (this.noise_words.size === 0)
	{
		let noise_words = await dbNoise.find({}).toArray();
		noise_words.map((val) => 
			this.noise_words.add(val["id"])		
		);
	}
	while (match = WORD_REGEX.exec(content)) {
		const [word, offset] = [match[0], match.index];
		let curr_word = normalize(match[0]);

		if (!this.noise_words.has(curr_word))
		{
			//count = count + 1;
			return_list.push([curr_word, offset]);
		}
	}
	//console.log(return_list);
	return return_list;
  }

  /** Add all normalized words in the noiseText string to this as
   *  noise words.  This operation should be idempotent.
   */
  async addNoiseWords(noiseText) {
    //TODO
	let match;
	const dbNoise = await this.db.collection("noiseWords");
	//this.db.createCollection("noiseWords");
	while (match = WORD_REGEX.exec(noiseText)) {
		const [word, offset] = [match[0], match.index];
		let curr_word = normalize(match[0]);
		//this.noise_words.add(curr_word);
		try
		{
			await dbNoise.updateOne({"_id": curr_word}, {$set : {"_id": curr_word, "id": curr_word}}, {upsert: true});
		}
		catch(err)
		{
			throw err;
		}
		//this.noise_words.forEach((value) => console.log(value));
	}
	//let temp = await dbNoise.find({}).length;
	//console.log(temp);
	//this.noise_words.forEach((value) => console.log(value));
  }

  /** Add document named by string name with specified content string
   *  contentText to this instance. Update index in this with all
   *  non-noise normalized words in contentText string.
   *  This operation should be idempotent.
   */ 
  async addContent(name, contentText) {
    //TODO
	let total_contents_set = new Set();
	let word_map = {};
	const dbContent = await this.db.collection("documents");
	try
	{
		await dbContent.updateOne({"_id":name}, {$set : {"_id":name, "content":contentText}}, {upsert:true});
		//this.count = this.count + 1;
	}
	catch(err)
	{
		throw err;
	}
	let dbdoc = await this.db.collection(name);
	//let dbtest = this.db.collection("test");
	let ret_val = await this._wordsLow(contentText);

	ret_val.map((val, ind) => {
		let normalised_word = val[0];
		if (total_contents_set.has(normalised_word))
		{
			word_map[normalised_word][0] = word_map[normalised_word][0] + 1;
		}
		else
		{
			total_contents_set.add(normalised_word);
			word_map[normalised_word] = [1, val[1]];
		}
	});

	for (let key in word_map)
	{
		try
		{
			await dbdoc.updateOne({"_id":key}, {$set : {"_id":key, "count":word_map[key][0], "offset":word_map[key][1]}}, {upsert:true});
		}
		catch(err)
		{
			throw err;
		}
	}
	
  }

  /** Return contents of document name.  If not found, throw an Error
   *  object with property code set to 'NOT_FOUND' and property
   *  message set to `doc ${name} not found`.
   */
  async docContent(name) {
    //TODO
	let dbdoc = await this.db.collection("documents");
	let content_arr = await dbdoc.find({"_id":name}).toArray();

	if (content_arr.length === 0)
	{
		return ("doc " + name + " not found\n");
	}
	else
	{
    	return content_arr[0]["content"];
	}
  }
  
  /** Given a list of normalized, non-noise words search terms, 
   *  return a list of Result's  which specify the matching documents.  
   *  Each Result object contains the following properties:
   *
   *     name:  the name of the document.
   *     score: the total number of occurrences of the search terms in the
   *            document.
   *     lines: A string consisting the lines containing the earliest
   *            occurrence of the search terms within the document.  The 
   *            lines must have the same relative order as in the source
   *            document.  Note that if a line contains multiple search 
   *            terms, then it will occur only once in lines.
   *
   *  The returned Result list must be sorted in non-ascending order
   *  by score.  Results which have the same score are sorted by the
   *  document name in lexicographical ascending order.
   *
   */
  async find(terms) {
    //TODO
	let return_set = new Set();
	let return_list =[];
	let dbdoc = await this.db.collection("documents");
	let content_arr = await dbdoc.find({}).toArray();

	if (content_arr.length === 0)
	{
		return [];
	}

	for (const term of terms)
	{
		//console.log(term);
		for (const doc of content_arr)
		{
			let dbSingleDoc = await this.db.collection(doc["_id"]);
			let words = await dbSingleDoc.find({"_id": term}).toArray();
			//let line_set = new Set();
			//let line_list = [];
			//console.log(words.length);
			//let word_map = new Map();

			/*for(const word of words) 
			{
				word_map.set(word["_id"], {"count":word["count"], "offset":word["offset"]});
				//console.log(word["_id"]);
			}*/

			//let found_word = word_map.get(term);
			//if (found_word !== undefined)
			if (words.length !== 0)
			{
				// Snippet to extract the occurences of new line before and after the specified index 
				let index = words[0]["offset"];
				let f_half = doc["content"].substring(0, index).lastIndexOf("\n") + 1;
				let s_half = (doc["content"].substr(f_half).search("\n")) + f_half;
				let first_occurence = doc["content"].substring(f_half, s_half) + "\n";

				if (!return_set.has(doc))
				{
					let res = new Result(doc["_id"], words[0]["count"], first_occurence);
					return_set.add(doc);
					return_list.push(res);
				}

				else
				{
					for (let x in return_list)
					{
						// Search for matching document
						if (return_list[x].name === doc["_id"])
						{
							// Sum the scores and look for a former occurence among the two words
							return_list[x].score = return_list[x].score + words[0]["count"];

							let line_arr = return_list[x].lines.split("\n");
							let i = 0;
							while(i < line_arr.length)
							{
								let temp_line = line_arr[i];
								if (doc["content"].search(temp_line) > doc["content"].search(first_occurence))
								{
									line_arr.splice(i, 0, first_occurence);
									break;
								}
								i = i + 1;
							}
							if (return_list[x].lines.search(first_occurence) === -1 && i === line_arr.length)
							{
								line_arr.splice(i, 0, first_occurence);
							}
							//.replace(/\\n[a-z]/g, "")
							return_list[x].lines = line_arr.join("\n").replace(/\n\n/g, "\n");
							//console.log(return_list[x].lines.search("\n\n"));
						}
					}
				}
			} 
		}
	}

	return_list.sort(function(a, b){
		return compareResults(a, b);
	});
	
    return return_list;
  }

  /** Given a text string, return a ordered list of all completions of
   *  the last normalized word in text.  Returns [] if the last char
   *  in text is not alphabetic.
   */
  async complete(text) {
    //TODO
	let return_list = [];
	let return_set = new Set();

	// Suggestion offered only for the last word entered
	text = text.substring(text.lastIndexOf(" ") + 1);
	
	let dbdoc = await this.db.collection("documents");
	let content_arr = await dbdoc.find({}).toArray();

	if (content_arr.length === 0)
	{
		return [];
	}

	for (const doc of content_arr)
	{
		let match_text = "\\b" + text + "[^ \n]*\\b";
		let re = new RegExp(match_text, "gi");
		let temp_list = doc["content"].match(re); // List of all the matches in single document

		if (temp_list !== null)
		{
			for (let i = 0; i < temp_list.length; i++)
			{
				let suggestion = normalize(temp_list[i]);
				// Add unique matched suggestions to the list
				if (!return_set.has(suggestion))
				{
					return_set.add(suggestion);
					return_list.push(suggestion);
				}
			}
		}
	}

	return_list.sort(function(a, b){
		return (a.localeCompare(b));
	});

    return return_list;
  }

  //Add private methods as necessary

} //class DocFinder

module.exports = DocFinder;

//Add module global functions, constants classes as necessary
//(inaccessible to the rest of the program).

//Used to prevent warning messages from mongodb.
const MONGO_OPTIONS = {
  useNewUrlParser: true
};

/** Regex used for extracting words as maximal non-space sequences. */
const WORD_REGEX = /\S+/g;

/** A simple utility class which packages together the result for a
 *  document search as documented above in DocFinder.find().
 */ 
class Result {
  constructor(name, score, lines) {
    this.name = name; this.score = score; this.lines = lines;
  }

  toString() { return `${this.name}: ${this.score}\n${this.lines}`; }
}


/** Compare result1 with result2: higher scores compare lower; if
 *  scores are equal, then lexicographically earlier names compare
 *  lower.
 */
function compareResults(result1, result2) {
  return (result2.score - result1.score) ||
    result1.name.localeCompare(result2.name);
}


// Returns true if the word is a noise word
function is_Noise_Word(word, noise_words){
	return noise_words.has(word);
}


/** Normalize word by stem'ing it, removing all non-alphabetic
 *  characters and converting to lowercase.
 */
function normalize(word) {
  return stem(word.toLowerCase()).replace(/[^a-z]/g, '');
}

/*function normalize_2(word) {
  return stem(word.toLowerCase()).replace(/[^a-z-]/g, '');
}*/

/** Place-holder for stemming a word before normalization; this
 *  implementation merely removes 's suffixes.
 */
function stem(word) {
  return word.replace(/\'s$/, '');
}



