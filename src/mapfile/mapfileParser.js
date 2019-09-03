const N3 = require('n3');
const jsonld = require('jsonld');
const helper = require('../input-parser/helper.js');
const objectHelper = require('../helper/objectHelper.js');
const prefixHelper = require('../helper/prefixHelper.js');

const quadsToJsonLD = async (nquads, context) => {
  let doc = await jsonld.fromRDF(nquads, { format: 'application/n-quads' });
  doc = await jsonld.compact(doc, context);
  return doc;
};

const ttlToJson = ttl => new Promise((resolve, reject) => {
  const parser = new N3.Parser();
  const writer = new N3.Writer({ format: 'N-Triples' });
  ttl = helper.escapeChar(ttl);
  parser.parse(ttl,
    (error, quad, prefixes) => {
      if (error) {
        reject(error);
      } else if (quad) {
        writer.addQuad(quad);
      } else {
        writer.end((error, result) => {
          nquads = result;
          resolve(quadsToJsonLD(result, prefixes));
        });
      }
    });
});

function hasLogicalSource(e) {
  return Object.keys(e).find(x => x.match(/.*logicalSource/));
}
function hasSubjectMap(e) {
  return Object.keys(e).find(x => x.match(/.*subjectMap/));
}

function isFunction(e, prefixes, graphArray) {
  e = prefixHelper.checkAndRemovePrefixesFromObject(e, prefixes);
  if (e.predicateObjectMap && Array.isArray(e.predicateObjectMap)) {
    for (const o of e.predicateObjectMap) {
      const id = o['@id'];
      const obj = prefixHelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(graphArray, id, prefixes), prefixes);
      if (obj.predicate && obj.predicate['@id'] && obj.predicate['@id'].indexOf('executes') !== -1) {
        return true;
      } else if(obj.predicateMap && obj.predicateMap && obj.predicateMap['@id']) {
        const predMap = prefixHelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(graphArray, obj.predicateMap['@id'], prefixes), prefixes);
        if (predMap && predMap.constant && predMap.constant['@id'] && predMap.constant['@id'].indexOf('executes') !== -1){
          return true;
        }
      }
    }
  }
  return false;
}

function getBaseMappings(graphArray, options, prefixes) {
  if (options && options.baseMapping) {
    if (!Array.isArray(options.baseMapping)) {
      options.baseMapping = [options.baseMapping];
    }
    const result = [];
    for (const bs of options.baseMapping) {
      result.push(bs);
    }
    helper.consoleLogIf(`baseMapping found: ${result}`, options);
    for (const m of result) {
      if (!objectHelper.findIdinObjArr(graphArray, m, prefixes)) {
        throw (`getBaseMappings(): baseMapping ${m} does not exist!`);
      }
    }

    return result;
  }
  return undefined;
}


const getTopLevelMappings = (graphArray, options, prefixes) => {
  const toplevelMappings = [];
  if (!graphArray || !graphArray.length) {
    // graphArray is not an array
    throw ('Error during processing mapfile: Wrong shape!');
  }
  const baseSource = getBaseMappings(graphArray, options, prefixes);
  if (baseSource) { // if baseSource defined, only return this one
    return baseSource;
  }
  graphArray.forEach((e) => {
    const id = e['@id'];
    if (hasLogicalSource(e) && !isFunction(e, prefixes, graphArray)) {
      if (!hasSubjectMap(e)) {
        throw (`${id} is missing a subjectMap!`);
      }
      toplevelMappings.push(id);
    }
  });
  if (graphArray.length === 0) {
    // mapfile does not contain any toplevel mappings
    throw ('getTopLevelMappings(): Error during processing mapfile: no toplevel found! (only blank nodes)');
  }
  return toplevelMappings;
};

// returns object with prefixes, graph, and all top-level mappings
const expandedJsonMap = async (ttl, options) => {
  const response = await ttlToJson(ttl);
  const result = {};
  result.prefixes = response['@context'];
  const regex = /@base <(.*)>/;
  let base = '_:';
  if (ttl.match(regex) && ttl.match(regex)[1]) {
    base = ttl.match(regex)[1];
  }
  if (!result.prefixes) {
    result.prefixes = {};
  }
  result.prefixes.base = base;
  result.data = response['@graph'];
  result.topLevelMappings = getTopLevelMappings(response['@graph'], options, result.prefixes);
  return result;
};

module.exports.ttlToJson = ttlToJson;
module.exports.expandedJsonMap = expandedJsonMap;