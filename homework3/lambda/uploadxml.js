var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
var s3 = new AWS.S3({apiVersion: '2006-03-01'});
var db = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  
  if (event.requestContext.http.method != 'POST') {
    const response = {
      statusCode: 405,
      body: 'Metodo ' + event.requestContext.http.method + ' non consentito.',
    };
    return response;
  }
  
  //Acquisizione id da parametri (se non presente errore)
  if (!event.queryStringParameters || !event.queryStringParameters.token) {
    const response = {
      statusCode: 400,
      body: "Nessun token specificato.",
    };
    return response;
  }
  var token = event.queryStringParameters.token;
  
  //Verifica presenza di gara con token specificato e ottenimento nome file
  var params_scan = {
    ProjectionExpression: 'auth_token, file_name',
    TableName: 'garedb',
  };    
  var db_list = await db.scan(params_scan).promise();
  
  var file_name;
  var found = false;
  db_list.Items.forEach(function(elem){
    if(elem.auth_token == token) {
      found = true;
      file_name = elem.file_name;
    }
  });
  
  if (!found) {
    const response = {
      statusCode: 400,
      body: "Token errato.",
    };
    return response;
  }
  
  //creazione file nel bucket s3
  const params_s3 = {
    Bucket: 'garexml',
    Key: file_name,
    Body: event.body,
    ContentType: 'application/xml; charset=utf-8'
  };
  
  await s3.putObject(params_s3, function (err, data) {
    if (err) {
      throw err;
    }
  }).promise();
  
  //risposta
  const response = {
    statusCode: 200,
    body: 'Upload di ' + file_name + ' avvenuto correttamente.',
  };
  return response;
};
