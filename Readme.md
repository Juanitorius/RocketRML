![Screenshot](rocket-rml.jpg)

# RML-mapper
###### For the legacy version with the different behavior of the iterator please see [this](https://github.com/semantifyit/RML-mapper/tree/legacy) version.
This is a javascript RML-mapper implementation for the RDF mapping language ([RML](http://rml.io/spec.html)).

## What does it support
### RML Vocabulary
the following list contains the current supported classes.


    rr:TriplesMap is the class of triples maps as defined by R2RML.
    rml:LogicalSource is the class of logical sources.
    rr:SubjectMap is the class of subject maps.
    rr:PredicateMap is the class of predicate maps.
    rr:ObjectMap is the class of object maps.
    rr:PredicateObjectMap is the class of predicate-object maps.
    rr:RefObjectMap is the class of referencing object maps.
    rml:referenceFormulation is the class of supported reference formulations.
    rr:Join is the class of join conditions.
        
Missing:

    rr:R2RMLView is the class of R2RML views.
    rr:BaseTableOrView is the class of SQL base tables or views.
    rr:GraphMap is the class of graph maps.



### XPath and JSONPath

For querying the data, [JSONPath](https://www.npmjs.com/package/JSONPath) (json) and [XPath](https://www.npmjs.com/package/xpath) (xml) are used.

## How does it work

The parseFile function in index.js is the entry point. 
It takes an input path (the mapping.ttl file) and an output path (where the json output is written).
The function returns a promise, which resolves in the resulting output, but the output is also written to the file system.

### The options parameter
```javascript
options:{
      /*
      compress the result into @context
      {http://schema.org/name:"Tom"} 
      -> 
      {@context:"http://schema.org/",
       name:"Tom"}
      */
      compress: { 
          '@vocab':"http://schema.org/"
      },
      /*
       If you want n-quads instead of json as output, 
       you need to define toRDF to true in the options parameter
       */
      toRDF:true,
      /*
      If you want to insert your all objects with their regarding @id's (to get a nesting in jsonld)
     */
      replace:true,
      /*
      You can delete namespaces to make the xpath simpler.
       */
      removeNameSpace:{xmlns:"https://xmlnamespace.xml"}
}
```

### How to call the function
```javascript
const rmlParser = require('rml-parser-nodejs');

let result = await rmlParser.parseFile('./mapping.ttl', './out.json',options).catch((err) => { 
    console.log(err); 
});
```
   

## Example
Below there is shown a very simple example with no nesting and no array.

More can be seen in the tests folder

### Input


```json
{
  "name":"Tom A.",
  "age":15
}
```


### Turtle mapfile

The mapfile must also specify the input source path.

```ttl
  @prefix rr: <http://www.w3.org/ns/r2rml#> .
  @prefix rml: <http://semweb.mmlab.be/ns/rml#> .
  @prefix schema: <http://schema.org/> .
  @prefix ql: <http://semweb.mmlab.be/ns/ql#> .
  @base <http://sti2.at/> . #the base for the classes
  
  
  <#LOGICALSOURCE>
  rml:source "./tests/straightMapping/input.json";
  rml:referenceFormulation ql:JSONPath;
  rml:iterator "$".
  
  
  <#Mapping>
  rml:logicalSource <#LOGICALSOURCE>;
  
   rr:subjectMap [
      rr:termType rr:BlankNode;
      rr:class schema:Person;
   ];
  
  
  rr:predicateObjectMap [
      rr:predicate schema:name;
      rr:objectMap [ rml:reference "name" ];
  ];
  
  rr:predicateObjectMap [
      rr:predicate schema:age;
      rr:objectMap [ rml:reference "age" ];
  ].

```

### Output
```json
[{
  "@type": "http://schema.org/Person",
  "http://schema.org/name": "Tom A.",
  "http://schema.org/age": 15
}]
```

## Functions:
To fit our needs, we also had to implement the functionality to programmatically evaluate data during the predicateObjectMap.  
Therefore we also allow the user to write use javascript functions, they defined beforehand and passes through the options parameter.
An example how this works can be seen below:
### Input


```json
{
  "name":"Tom A.",
  "age":15
}
```


### Turtle mapfile

The mapfile must also specify the input source path.

```ttl
  @prefix rr: <http://www.w3.org/ns/r2rml#> .
  @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
  @prefix rml: <http://semweb.mmlab.be/ns/rml#> .
  @prefix schema: <http://schema.org/> ..
  @prefix ql: <http://semweb.mmlab.be/ns/ql#> .
  @prefix fnml: <http://semweb.mmlab.be/ns/fnml#> .
  @prefix fno: <http://w3id.org/function/ontology#> .
  @prefix grel: <http://users.ugent.be/~bjdmeest/function/grel.ttl#> .
  @base <http://sti2.at/> . #the base for the classes
  
  
  <#LOGICALSOURCE>
  rml:source "./tests/straightMapping/input.json";
  rml:referenceFormulation ql:JSONPath;
  rml:iterator "$".
  
  
  <#Mapping>
  rml:logicalSource <#LOGICALSOURCE>;
  
   rr:subjectMap [
      rr:termType rr:BlankNode;
      rr:class schema:Person;
   ];
  
  
  rr:predicateObjectMap [
      rr:predicate schema:name;
      rr:objectMap [ rml:reference "name" ];
  ];
  
  rr:predicateObjectMap [
      rr:predicate schema:age;
      rr:objectMap [ rml:reference "age" ];
  ];
  
   rr:predicateObjectMap [
        rr:predicate schema:description;
        rr:objectMap  <#FunctionMap>;
    ].
    
    <#FunctionMap>
         fnml:functionValue [
             rml:logicalSource <#LOGICALSOURCE> ;
             rr:predicateObjectMap [
                 rr:predicate fno:executes ;
                 rr:objectMap [ rr:constant grel:createDescription ]
             ] ;
             rr:predicateObjectMap [
                 rr:predicate grel:inputString ;
                 rr:objectMap [ rml:reference "name" ]
             ];
              rr:predicateObjectMap [
                  rr:predicate grel:inputString ;
                  rr:objectMap [ rml:reference "age" ]
              ];
         ] .

```

where the option paramter looks like this:
```javascript 1.8
  let options={
        functions: {
            'http://users.ugent.be/~bjdmeest/function/grel.ttl#createDescription': function (data) {
                let result=data[0]+' is '+data[1]+ ' years old.'; 
                return result;
                }
            }
        };
```

### Output
```json

[{
  "@type": "http://schema.org/Person",
  "http://schema.org/name": "Tom A.",
  "http://schema.org/age": 15,
  "http://schema.org/description": "Tom A. is 15 years old."
}]
```

### Description
The <#FunctionMap> has an array of predicateObjectMaps. One of them defines the function with fno:executes and the name of the function in rr:constant.
The others are for the function parameters. The first parameter (rml:reference:"name") is then stored in data[0], the second in data[1] and so on.




