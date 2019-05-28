'use strict';

const axios = require('axios');


function DocsWs(baseUrl) {
  this.docsUrl = `${baseUrl}/docs`;
}

module.exports = DocsWs;

//@TODO add wrappers to call remote web services.
  
DocsWs.prototype.get = async function(id) {
  try {
    const response = await axios.get(`${this.docsUrl}/${id}`);
    return response.data;
  }
  catch (err) {
    console.error(err);
    throw (err.response && err.response.data) ? err.response.data : err;
  }  
};

DocsWs.prototype.create = async function(doc) {
  try {
    const response = await axios.post(this.docsUrl, doc);
    return response.data;
  }
  catch (err) {
    console.error(err);
    throw (err.response && err.response.data) ? err.response.data : err;
  }  
};


DocsWs.prototype.search = async function(id, start = 0) {
  try {
    const response = await axios.get(`${this.docsUrl}/?q=${id}&start=${start}`);
    return response.data;
  }
  catch (err) {
    console.error(err);
    throw (err.response && err.response.data) ? err.response.data : err;
  }  
};
