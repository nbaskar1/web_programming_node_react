const {inspect} = require('util'); //for debugging

'use strict';

class DocFinder {

  /** Constructor for instance of DocFinder. */
  constructor() {
	//@TODO
    this.noise_words = new Set(); // Set of Noise Words(Normalized)
	this.content_dict = {}; // Content of each document(Raw)
	this.index_dict = {};
  }

  /** Return array of non-noise normalized words from string content.
   *  Non-noise means it is not a word in the noiseWords which have
   *  been added to this object.  Normalized means that words are
   *  lower-cased, have been stemmed and all non-alphabetic characters
   *  matching regex [^a-z] have been removed.
   */
  words(content) {
	//@TODO
	let return_list = [];
	/* 
		Words low returns a list of [word, index] for all contents;
		Map function takes out the denoised, normalized word and pushes that into return_list
	*/
	return_list = this._wordsLow(content).map(pair => pair[0]);
	return return_list;
  }

  _wordsLow(content)
  {
	let return_list = [];
	let match;

	/*
		Word_Regex => Maximum non space sequence of characters
		For every match of the Regex, 
		the matched word is denoised, normalized and pushed to return_list as [word, index]
	*/
	while (match = WORD_REGEX.exec(content)) {
		const [word, offset] = [match[0], match.index];
		let curr_word = normalize(match[0]);
		if(!is_Noise_Word(curr_word, this.noise_words))
		{
			return_list.push([curr_word, offset]);
		}
	}
	return return_list;
  }


  /** Add all normalized words in noiseWords string to this as
   *  noise words. 
   */
  addNoiseWords(noiseWords) {
    //@TODO
	this.noise_words = noiseWords.split("\n");
	for (let i = 0; i < this.noise_words.length; i++)
	{
		this.noise_words[i] = normalize(this.noise_words[i]);
	}
  }

  /** Add document named by string name with specified content to this
   *  instance. Update index in this with all non-noise normalized
   *  words in content string.
   */ 
  addContent(name, content) {
    //@TODO
	// Denoised, normalized words in form of list of [word, index]
	let fin_arr = this._wordsLow(content);
	let word_map = {};
	let total_contents_set = new Set();

	/*
		Map function to iterate through the list,
	 	and summing the occurences of individual words
	 	and the first occurence; Store the result in a dictionary (word_map)
	*/
	let temp_arr = fin_arr.map((val, ind, fin_arr) => {
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

	// Index_Dict => {Documents(Mkey): {Word(key): [total_occurences, first_occurence](value)}(Mvalue)}
	// Content_Dict => {Documents : Content(Raw)}
	this.index_dict[name] = word_map;
	this.content_dict[name] = content;
  }

  /** Given a list of normalized, non-noise words search terms, 
   *  return a list of Result's  which specify the matching documents.  
   *  Each Result object contains the following properties:
   *     name:  the name of the document.
   *     score: the total number of occurrences of the search terms in the
   *            document.
   *     lines: A string consisting the lines containing the earliest
   *            occurrence of the search terms within the document.  Note
   *            that if a line contains multiple search terms, then it will
   *            occur only once in lines.
   *  The Result's list must be sorted in non-ascending order by score.
   *  Results which have the same score are sorted by the document name
   *  in lexicographical ascending order.
   *
   */
  find(terms) {
    //@TODO
	let return_list = [];
	let return_set = new Set();
	
	// Loop through search terms
	for (let i = 0; i < terms.length; i++)
	{
		// Loop through individual documents
		for (let key in this.content_dict)
		{
			let temp_dict = this.index_dict[key];
			let lis = temp_dict[terms[i]];

			if (lis != undefined && terms[i] != "")
			{
				// Snippet to extract the occurences of new line before and after the specified index 
				let index = lis[1];
				let f_half = this.content_dict[key].substring(0, index).lastIndexOf("\n") + 1;
				let s_half = (this.content_dict[key].substr(f_half).search("\n")) + f_half;
				let first_occurence = this.content_dict[key].substring(f_half, s_half) + "\n";
				
				// Entry found in a new document - New Result record
				if (!return_set.has(key))
				{
					let res = new Result(key, lis[0], first_occurence);
					return_set.add(key);
					return_list.push(res);
				}
				// New entry found in a previously stored document - Edit existing Result record
				else
				{
					for (let x in return_list)
					{
						// Search for matching document
						if (return_list[x].name === key)
						{
							// Sum the scores and look for a former occurence among the two words
							return_list[x].score = return_list[x].score + lis[0];
							if ((this.content_dict[key]).search(return_list[x].lines) > lis[1])
							{
								return_list[x].lines = first_occurence;
							}
						}
					}
				}
			}
		}
	}

	/*
		Sorting the result list in descending order based on the scores
		If Scores tie up; Sorting them based on the alphabetical order of the document name
	*/
	return_list.sort(function(a, b){
		if (b.score != a.score)
		{
			return (b.score - a.score);
		}
		else
		{
			return (b.name < a.name);
		}
	})

    return return_list;
  }

  /** Given a text string, return a ordered list of all completions of
   *  the last word in text.  Returns [] if the last char in text is
   *  not alphabetic.
   */
  complete(text) {
    //@TODO
	let return_list = [];
	let return_set = new Set();

	// Suggestion offered only for the last word entered
	text = text.substring(text.lastIndexOf(" ") + 1);

	for(let key in this.content_dict)
	{
		let content = this.content_dict[key];
		let match_text = "\\b" + text + "[^ ]+?\\b";
		let re = new RegExp(match_text, "gi");
		let temp_list = content.match(re); // List of all the matches in single document

		if (temp_list != null)
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
    return return_list;
  }

  
} //class DocFinder

module.exports = DocFinder;

/** Regex used for extracting words as maximal non-space sequences. */
const WORD_REGEX = /\S+/g;

/** A simple class which packages together the result for a 
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
	
	let bool_var = noise_words.find(function (element) {
		if (element === word)
		{
			return true;
		}
		else
		{
			return false;
		}
	});
	return bool_var;
}

/** Normalize word by stem'ing it, removing all non-alphabetic
 *  characters and converting to lowercase.
 */
function normalize(word) {
  return stem(word.toLowerCase()).replace(/[^a-z]/g, '');
}

/** Place-holder for stemming a word before normalization; this
 *  implementation merely removes 's suffixes.
 */
function stem(word) {
  return word.replace(/\'s$/, '');
}

