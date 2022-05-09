var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
var s3 = new AWS.S3({apiVersion: '2006-03-01'});
var db = new AWS.DynamoDB.DocumentClient();

var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var xml2js = require('xml2js');

exports.handler = async (event) => {
  
  if (event.requestContext.http.method != 'GET') {
      const response = {
      statusCode: 405,
      body: 'Metodo ' + event.requestContext.http.method + ' non consentito.',
    };
    return response;
  }
  
  //Acquisizione id da parametri (se non presente errore)
  if (!event.queryStringParameters || !event.queryStringParameters.id) {
      const response = {
        statusCode: 400,
        body: "Nessun id gara specificato.",
      };
      return response;
  }
  var id = event.queryStringParameters.id;
    
  //Verifica presenza di gara con id specificato e ottenimento nome
  var params_scan = {
    ProjectionExpression: 'id, file_name, race_name',
    TableName: 'garedb',
  };    
  var db_list = await db.scan(params_scan).promise();
    
  var file_name;
  var race_name;
  var found = false;
  db_list.Items.forEach(function(elem){
    if(elem.id == id) {
      found = true;
      file_name = elem.file_name;
      race_name = elem.race_name;
    }
  });
    
  if (!found) {
    const response = {
      statusCode: 400,
      body: "id gara non presente.",
    };
    return response;
  }
  
  //ottenimento xml da bucket s3
  const params = {
    Bucket: 'garexml',
    Key: file_name,
  };
  
  //controllo se il file esiste o se la gara è stata solo registrata
  try {
    await s3.headObject(params).promise();
  } catch (error) {
    if (error.name === 'NotFound') {
      const response = {
        statusCode: 400,
        body: "Nessun dato sulla gara disponibile.",
      };
      return response;
    }
  }

  var xml;
  await s3.getObject(params, function(err, data){
    if (err) {
      throw err;
    } if (data) {
      xml = data.Body.toString();
    }
  }).promise();
  
  var doc = new dom().parseFromString(xml);
  var select = xpath.useNamespaces({"ns": "http://www.orienteering.org/datastandard/3.0"});
  var nodes = select('//ns:Class/ns:Name', doc);
  nodes = '<Classes>' + nodes + '</Classes>';
  var list = new Object();
  list.race_name = race_name;
  list.count_classes = 0;
  list.race_classes = new Array();
  xml2js.parseString(nodes, (err, result) => {
    if (err)
      throw err;
    result.Classes.Name.forEach(function(elem){
      list.race_classes.push(elem._);
      list.count_classes++;
    });
  });
  
  const response = {
    statusCode: 200,
    body: JSON.stringify(list),
  };
  return response;
};
